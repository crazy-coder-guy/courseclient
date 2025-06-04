import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, X, User, ChevronDown } from 'lucide-react';
import { apiFetch, TokenManager } from '../utils/api';

// Debounce utility to prevent multiple rapid submissions
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

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
  const [chatStep, setChatStep] = useState('welcome');
  const [selectedAction, setSelectedAction] = useState(null);
  const [isWelcomeShown, setIsWelcomeShown] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const navigate = useNavigate();

  // Check if user is logged in on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = TokenManager.getToken();
        if (!token) {
          console.log(`[${new Date().toISOString()}] No token found, user not logged in`);
          setIsLoggedIn(false);
          return;
        }

        const response = await apiFetch('/api/auth/check');
        if (response.user) {
          console.log(`[${new Date().toISOString()}] Auth check successful`, {
            userId: response.user.userId,
            email: response.user.email,
          });
          setIsLoggedIn(true);
          setUserData(response.user);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Auth check failed:`, error.message);
        TokenManager.removeToken();
        setIsLoggedIn(false);
        setUserData(null);
      }
    };

    checkAuthStatus();
  }, []);

  // Fetch purchased courses and admin availability when chat is opened
  useEffect(() => {
    if (!isChatOpen || !isLoggedIn) return;

    const fetchPurchasedCourses = async () => {
      try {
        console.log(`[${new Date().toISOString()}] Fetching purchased courses for user`, {
          userId: userData?.userId,
        });
        const response = await apiFetch('/api/user/purchased-courses');
        console.log(`[${new Date().toISOString()}] Purchased courses response`, {
          courseCount: response.length,
          courses: response.map(c => c.course_name),
        });
        setPurchasedCourses(response);

        if (!isWelcomeShown) {
          setMessages([
            {
              id: 'welcome',
              content: `Welcome ${userData?.first_name || 'User'}! I'm here to help you with your courses. Please select a course to get started.`,
              sender: 'system',
              created_at: new Date().toISOString(),
            },
          ]);
          setIsWelcomeShown(true);
          setChatStep('course-selection');
        }
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Error fetching purchased courses:`, {
          message: err.message,
          stack: err.stack,
        });
        setChatError('Failed to load your courses. Please try again later.');
      }
    };

    const fetchAdminAvailability = async () => {
      try {
        console.log(`[${new Date().toISOString()}] Fetching admin availability`);
        const response = await apiFetch('/api/admin/availability');
        console.log(`[${new Date().toISOString()}] Admin availability response`, {
          active: response.active,
          response: response,
        });
        setIsAdminOnline(response.active || false);
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Error fetching admin availability:`, {
          message: err.message,
          stack: err.stack,
        });
        setChatError('Unable to check admin availability. Please try again later.');
      }
    };

    fetchPurchasedCourses();
    fetchAdminAvailability();
  }, [isChatOpen, isLoggedIn, userData, isWelcomeShown]);

  // Fetch chat messages for selected course
  useEffect(() => {
    if (!selectedCourse || !isLoggedIn) return;

    const fetchMessages = async () => {
      try {
        const response = await apiFetch(`/api/messages/${selectedCourse.id}`);
        const welcomeMsg = messages.find((msg) => msg.id === 'welcome');
        const courseMessages = welcomeMsg ? [welcomeMsg, ...response] : response;
        setMessages(courseMessages);
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Error fetching chat history:`, err.message);
        setChatError('Failed to load chat history. Please try again later.');
      }
    };

    fetchMessages();
  }, [selectedCourse, isLoggedIn]);

  const handleCourseSelection = (course) => {
    setSelectedCourse(course);
    setChatStep('action-selection');

    const courseSelectionMsg = {
      id: `course-${course.id}`,
      content: `Great! You've selected "${course.course_name}". How can I help you today?`,
      sender: 'system',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => {
      const exists = prev.some(msg => msg.id === courseSelectionMsg.id);
      if (!exists) return [...prev, courseSelectionMsg];
      return prev;
    });
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
      setMessages((prev) => {
        const exists = prev.some(msg => msg.id === doubtMsg.id);
        if (!exists) return [...prev, doubtMsg];
        return prev;
      });
    }
  };

  const handleSendMessage = useCallback(
    debounce(async (e, messageType = 'doubt') => {
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
        const payload = {
          courseId: selectedCourse.id,
          message: messageType === 'help' ? 'Help request' : newMessage,
          messageType,
        };

        const response = await apiFetch(`/api/messages/${selectedCourse.id}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setMessages((prev) => {
          const newMessages = [];
          if (response.userMessage && !prev.some(msg => msg.id === response.userMessage.id)) {
            newMessages.push(response.userMessage);
          }
          if (response.autoResponse && !prev.some(msg => msg.id === response.autoResponse.id)) {
            newMessages.push(response.autoResponse);
          }
          return [...prev, ...newMessages];
        });

        setNewMessage('');
        setChatError(null);

        if (messageType === 'help') {
          setChatStep('course-selection');
          setSelectedAction(null);
        } else {
          setChatStep('action-selection');
        }
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Error sending message:`, err.message);
        setChatError('Failed to send message. Please try again later.');
      }
    }, 500),
    [selectedCourse, newMessage]
  );

  const handleChatOpen = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setChatStep('welcome');
      setSelectedCourse(null);
      setSelectedAction(null);
      setMessages([]);
      setChatError(null);
      setIsWelcomeShown(false);
      setIsAdminOnline(false);
    }
  };

  const handleLogout = () => {
    TokenManager.removeToken();
    setIsLoggedIn(false);
    setUserData(null);
    navigate('/');
  };

  return (
    <nav className="bg-yellow-50 shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-rose-900 hover:bg-gray-100"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex-shrink-0">
              <h1
                className="text-2xl font-bold text-rose-900 cursor-pointer"
                onClick={() => navigate('/')}
              >
                Thugil Creation
              </h1>
            </div>
          </div>
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
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center space-x-6">
              <button
                onClick={() => navigate('/my-learnings')}
                className="text-rose-900 hover:text-rose-900 text-sm font-medium transition-colors"
              >
                My Learning
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleChatOpen}
                className="p-2 text-rose-900 hover:text-rose-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Bell size={20} />
              </button>
            </div>
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
                  onClick={() => {
                    const currentUrl = window.location.pathname + window.location.search;
                    sessionStorage.setItem('redirectAfterSignup', currentUrl);
                    navigate(`/signup?redirect=${encodeURIComponent(currentUrl)}`);
                  }}
                  className="px-4 py-2 text-sm font-medium text-rose-900 hover:text-rose-900 transition-colors"
                >
                  Log in
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {isChatOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-semibold text-rose-900">Course Assistant</h2>
                  {isAdminOnline && (
                    <div className="flex items-center space-x-1">
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                      <span className="text-xs text-green-600 font-medium">Online</span>
                    </div>
                  )}
                </div>
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
                        <p className="text-xs text-rose-900 mt-1">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  {chatStep === 'course-selection' && purchasedCourses.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-rose-900 mb-2">Select a course:</p>
                      <div className="space-y-2">
                        {purchasedCourses.map((course) => (
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
                  {chatStep === 'course-selection' && purchasedCourses.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-rose-900 text-sm">You haven't purchased any courses yet.</p>
                    </div>
                  )}
                </>
              )}
            </div>
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
      {isMenuOpen && (
        <div className="md:hidden bg-yellow-50 border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <button
              onClick={() => navigate('/my-learnings')}
              className="block w-full text-left px-3 py-2 text-base font-medium text-rose-900 hover:text-rose-900 hover:bg-gray-100 rounded-md"
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
                    className="flex-1 px-4 py-2 text-sm font-medium bg-red-950 text-white rounded hover:bg-gray-800 transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    const currentUrl = window.location.pathname + window.location.search;
                    sessionStorage.setItem('redirectAfterSignup', currentUrl);
                    navigate(`/signup?redirect=${encodeURIComponent(currentUrl)}`);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-red-950 text-white rounded hover:bg-gray-800 transition-colors"
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