import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, X, User, ChevronDown } from 'lucide-react';
import axios from 'axios';

export default function ModernNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatError, setChatError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [chatStep, setChatStep] = useState('welcome'); // welcome, course-selection, action-selection, doubt-input
  const [selectedAction, setSelectedAction] = useState(null);
  const [isWelcomeShown, setIsWelcomeShown] = useState(false);
  const navigate = useNavigate();

  // Check if user is logged in on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoggedIn(false);
          return;
        }

        // Verify token with backend
        const response = await axios.get('http://localhost:5000/api/auth/check', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.user) {
          setIsLoggedIn(true);
          setUserData(response.data.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        setIsLoggedIn(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Fetch purchased courses when chat is opened
  useEffect(() => {
    if (!isChatOpen || !isLoggedIn) return;

    const fetchPurchasedCourses = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setChatError('Please log in to access chat.');
          return;
        }

        const { data } = await axios.get('http://localhost:5000/api/user/purchased-courses', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPurchasedCourses(data);
        
        // Show welcome message if not shown yet
        if (!isWelcomeShown) {
          setMessages([{
            id: 'welcome',
            content: `Welcome ${userData?.first_name || 'User'}! I'm here to help you with your courses. Please select a course to get started.`,
            sender: 'system',
            created_at: new Date().toISOString(),
          }]);
          setIsWelcomeShown(true);
          setChatStep('course-selection');
        }
      } catch (err) {
        console.error('Error fetching purchased courses:', err);
        setChatError('Failed to load your courses. Please try again later.');
      }
    };

    fetchPurchasedCourses();
  }, [isChatOpen, isLoggedIn, userData, isWelcomeShown]);

  // Fetch chat messages for selected course
  useEffect(() => {
    if (!selectedCourse || !isLoggedIn) return;

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`http://localhost:5000/api/messages/${selectedCourse.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Keep welcome message and add course-specific messages
        const welcomeMsg = messages.find(msg => msg.id === 'welcome');
        const courseMessages = welcomeMsg ? [welcomeMsg, ...data] : data;
        setMessages(courseMessages);
      } catch (err) {
        console.error('Error fetching chat history:', err);
        setChatError('Failed to load chat history. Please try again later.');
      }
    };

    fetchMessages();
  }, [selectedCourse]);

  const handleCourseSelection = (course) => {
    setSelectedCourse(course);
    setChatStep('action-selection');
    
    // Add course selection message
    const courseSelectionMsg = {
      id: `course-${course.id}`,
      content: `Great! You've selected "${course.course_name}". How can I help you today?`,
      sender: 'system',
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, courseSelectionMsg]);
  };

  const handleActionSelection = (action) => {
    setSelectedAction(action);
    
    if (action === 'help') {
      handleSendMessage(null, 'help');
    } else if (action === 'doubt') {
      setChatStep('doubt-input');
      const doubtMsg = {
        id: `doubt-prompt-${Date.now()}`,
        content: 'Please type your doubt below (max 50 characters):',
        sender: 'system',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, doubtMsg]);
    }
  };

  const handleSendMessage = async (e, messageType = 'doubt') => {
    if (e) e.preventDefault();
    
    if (messageType !== 'help' && (!newMessage.trim() || newMessage.length > 50)) {
      setChatError('Please enter a message (max 50 characters)');
      return;
    }

    if (!selectedCourse) {
      setChatError('Please select a course first');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setChatError('Please log in to send messages.');
        return;
      }

      const { data } = await axios.post(
        `http://localhost:5000/api/messages/${selectedCourse.id}`,
        { 
          content: messageType === 'help' ? null : newMessage,
          message_type: messageType
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Add user message and auto response to chat
      const newMessages = [];
      if (data.userMessage) {
        newMessages.push(data.userMessage);
      }
      if (data.autoResponse) {
        newMessages.push(data.autoResponse);
      }

      setMessages(prev => [...prev, ...newMessages]);
      setNewMessage('');
      setChatError(null);
      
      // Reset chat flow after sending message
      if (messageType === 'help') {
        setChatStep('course-selection');
        setSelectedAction(null);
      } else {
        setChatStep('action-selection');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setChatError('Failed to send message. Please try again later.');
    }
  };

  const handleChatOpen = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      // Reset chat state when opening
      setChatStep('welcome');
      setSelectedCourse(null);
      setSelectedAction(null);
      setMessages([]);
      setChatError(null);
      setIsWelcomeShown(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUserData(null);
    navigate('/');
  };

  return (
    <nav className="bg-yellow-50 shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section - Logo */}
          <div className="flex items-center space-x-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-rose-900  hover:bg-gray-100"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Logo */}
            <div className="flex-shrink-0">
              <h1
                className="text-2xl font-bold text-rose-900 cursor-pointer"
                onClick={() => navigate('/')}
              >
                Thugil Creation
              </h1>
            </div>
          </div>

          {/* Center - Search Bar */}
          <div className="hidden md:flex flex-1 mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-rose-900" />
              </div>
             <input
  type="text"
  placeholder="Search for anything"
  disabled
  className="block w-full pl-10 pr-3 py-2 border border-gray-500 rounded-full leading-5 bg-yellow-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-rose-900 focus:border-transparent text-sm opacity-80 cursor-not-allowed"
/>

            </div>
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center space-x-4">
            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-6">
              <button
                onClick={() => navigate('/my-learnings')}
                className="text-rose-900 hover:text-rose-900 text-sm font-medium transition-colors
"
              >
                My Learning
              </button>
            </div>

            {/* Action Icons */}
            <div className="flex items-center space-x-3">
              {/* Notifications - Chat Trigger */}
              <button
                onClick={handleChatOpen}
              className="p-2 text-rose-900 hover:text-rose-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Bell size={20} />
              </button>
            </div>

            {/* Auth Buttons - Desktop */}
            <div className="hidden md:flex items-center space-x-3">
              {isLoggedIn ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-rose-900">
                    {userData?.first_name || 'User'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-rose-900 hover:text-rose-900 transition-colors"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/signup')}
                 className="px-4 py-2 text-sm font-mediumtext-rose-900 hover:text-rose-900 transition-colors"
                >
                  Log in
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
  
      </div>

      {/* Chat Interface */}
      {isChatOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Background Blur Overlay */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          
          {/* Chat Container */}
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-rose-900">Course Assistant</h2>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-rose-900 hover:text-rose-900"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 max-h-[60vh]">
              {chatError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
                  {chatError}
                </div>
              )}

              {!isLoggedIn ? (
                <div className="text-center py-8">
                  <p className="text-rose-900 text-sm mb-4">Please log in to access the course assistant</p>
                  <button
                    onClick={() => navigate('/signup')}
                   className="px-4 py-2 bg-rose-900 text-white rounded-full text-sm hover:bg-rose-900/90 transition-colors"
                  >
                    Log in
                  </button>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className="space-y-3">
                    {messages.map((message, index) => (
                      <div
                        key={message.id || index}
                        className={`p-3 rounded-lg text-sm ${
                          message.sender === 'system' 
                            ? 'bg-blue-50 border border-blue-200 text-blue-800' 
                            : 'bg-gray-100 text-rose-900'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className="text-xs text-rose-9000 mt-1">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Course Selection */}
                  {chatStep === 'course-selection' && purchasedCourses.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-rose-900 mb-2">Select a course:</p>
                      <div className="space-y-2">
                        {purchasedCourses.map(course => (
                          <button
                            key={course.id}
                            onClick={() => handleCourseSelection(course)}
                            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <p className="text-sm font-medium text-rose-900">{course.course_name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Selection */}
                  {chatStep === 'action-selection' && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-rose-900 mb-2">How can I help you?</p>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleActionSelection('help')}
                          className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <p className="text-sm font-medium text-rose-900">I need help/support</p>
                        </button>
                        <button
                          onClick={() => handleActionSelection('doubt')}
                          className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <p className="text-sm font-medium text-rose-900">I have a doubt/question</p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* No courses message */}
                  {chatStep === 'course-selection' && purchasedCourses.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-rose-900 text-sm">You haven't purchased any courses yet.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input Form - Only show for doubt input */}
            {chatStep === 'doubt-input' && (
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      if (e.target.value.length <= 50) {
                        setNewMessage(e.target.value);
                        setChatError(null);
                      }
                    }}
                    placeholder="Type your doubt (max 50 characters)..."
                   className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-rose-900"
                    maxLength={50}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-rose-900 text-white rounded-full text-sm hover:bg-rose-900/90 transition-colors disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
                <p className="text-xs text-rose-900 mt-1">{newMessage.length}/50 characters</p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-yellow-50 border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <button
              onClick={() => navigate('/my-learnings')}
          className="block w-full text-left px-3 py-2 text-base font-mediumtext-rose-900 hover:text-rose-900 text-sm font-medium transition-colors
 hover:text-rose-900 hover:bg-gray-100 rounded-md"
            >
              My Learning
            </button>
            <div className="flex space-x-3 px-3 py-2">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => navigate('/profile')}
                    className="flex-1 px-4 py-2 text-sm font-medium text-rose-900 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/signup')}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                >
                  Sign up
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}