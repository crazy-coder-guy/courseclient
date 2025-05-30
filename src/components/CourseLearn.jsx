import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Plyr from 'plyr-react';
import 'plyr/dist/plyr.css';
import toast, { Toaster } from 'react-hot-toast';

export default function CourseLearn() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Fetch course and video data
  useEffect(() => {
    async function fetchCourseData() {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please sign in to access the course.');
        navigate(`/signup?redirect=/courses/${courseId}/learn`);
        return;
      }

      try {
        const [authResponse, purchaseResponse, courseRes, videosRes] = await Promise.all([
          fetch(`${API_URL}/api/auth/check`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(`${API_URL}/api/courses/${courseId}/purchase-status`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(`${API_URL}/api/courses/${courseId}`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(`${API_URL}/api/courses/${courseId}/videos`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
        ]);

        if (!authResponse.ok) {
          const errorData = await authResponse.json().catch(() => ({}));
          localStorage.removeItem('token');
          toast.error(errorData.error || 'Session expired. Please sign in again.');
          navigate(`/signup?redirect=/courses/${courseId}/learn`);
          return;
        }

        if (!purchaseResponse.ok) {
          toast.error('You need to purchase this course to access it.');
          navigate(`/courses/${courseId}`);
          return;
        }

        const purchaseData = await purchaseResponse.json();
        const purchaseStatus = purchaseData.hasPurchased;

        if (!purchaseStatus) {
          toast.error('You need to purchase this course to access it.');
          navigate(`/courses/${courseId}`);
          return;
        }

        if (!courseRes.ok) {
          const errorData = await courseRes.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load course');
        }
        if (!videosRes.ok) {
          const errorData = await videosRes.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load videos');
        }

        const courseData = await courseRes.json();
        const videoData = await videosRes.json();

        console.log('API Video Data:', videoData); // Debug: Log video data

        setCourse(courseData);
        setVideos(videoData || []);
        setHasPurchased(purchaseStatus);

        if (videoData?.length > 0) {
          setSelectedVideo(videoData[0]);
          setSelectedResolution(videoData[0].video_resolutions?.[0] || videoData[0].video_url || '');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(`Failed to load course content: ${err.message}`);
        toast.error(`Error loading course: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchCourseData();
  }, [courseId, navigate]);

  // Format video duration
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins}:00`;
  };

  // Configure Plyr sources and quality
  const getPlyrSources = useCallback(
    (video) => {
      if (!video) {
        console.warn('No video selected'); // Debug: No video
        return { type: 'video', sources: [] };
      }

      const qualityLabels = ['4K', '2K', '1080p'];
      const resolutions = Array.isArray(video.video_resolutions) ? video.video_resolutions : [];
      console.log('Video Resolutions:', resolutions); // Debug: Log resolutions

      const sources = [];
      resolutions.slice(0, 3).forEach((url, index) => {
        if (url) {
          sources.push({ src: url, type: 'video/mp4', size: qualityLabels[index] });
        }
      });

      // Fallback to video_url
      if (sources.length === 0 && video.video_url) {
        sources.push({ src: video.video_url, type: 'video/mp4', size: 'Auto' });
      }

      const sourceUrl = selectedResolution || sources[0]?.src || '';
      console.log('Selected Source URL:', sourceUrl); // Debug: Log source URL

      return {
        type: 'video',
        sources: [{ src: sourceUrl, type: 'video/mp4' }],
        tracks: course?.subtitle_available
          ? [
              {
                kind: 'captions',
                label: course.subtitle_language || 'Subtitles',
                srcLang: course.subtitle_language?.toLowerCase() || 'en',
                src: `${API_URL}/api/courses/${courseId}/subtitles?token=${localStorage.getItem('token')}`,
                default: false,
              },
            ]
          : [],
        quality: {
          default: sources[0]?.size || '4K',
          options: sources.map((s) => s.size) || ['4K', '2K', '1080p'],
          forced: true,
          onChange: (newQuality) => {
            const selected = sources.find((s) => s.size === newQuality);
            if (selected) {
              setSelectedResolution(selected.src);
              console.log('Quality Changed to:', selected.src); // Debug: Log quality change
            }
          },
        },
      };
    },
    [course, courseId, selectedResolution]
  );

  // Plyr player options
  const getPlyrOptions = useMemo(
    () => ({
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'captions',
        'settings',
        'pip',
        'fullscreen',
      ],
      settings: ['quality', 'speed', 'captions'],
      captions: { active: course?.subtitle_available && course?.subtitle_language, update: true },
      autoplay: false,
      muted: false,
      clickToPlay: true,
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true },
      displayDuration: true,
      invertTime: false,
      toggleInvert: true,
      ratio: '16:9',
      fullscreen: { enabled: true, fallback: true, iosNative: true },
    }),
    [course]
  );

  // Handle video selection
  const handleVideoSelect = useCallback(
    (video) => {
      console.log('Selecting Video:', video.id); // Debug: Log video ID
      if (video?.id !== selectedVideo?.id) {
        setSelectedVideo(null);
        setSelectedResolution(null);
        setTimeout(() => {
          try {
            setSelectedVideo(video);
            const newResolution = video.video_resolutions?.[0] || video.video_url || '';
            setSelectedResolution(newResolution);
            console.log('New Video Resolution:', newResolution); // Debug: Log resolution
            if (window.innerWidth < 1024) {
              setIsSidebarOpen(false);
            }
          } catch (err) {
            console.error('Video switch error:', err);
            toast.error('Failed to load video');
            setError('Failed to load video');
          }
        }, 200);
      } else if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    },
    [selectedVideo]
  );

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      if (newState && window.innerWidth < 1024) {
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
      }
      return newState;
    });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 max-w-md w-full text-center shadow-lg rounded-lg">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Error loading Course</h3>
          <p className="text-sm sm:text-base text-gray-600">{error}</p>
        </div>
        <Toaster position="top-center" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 sm:h-12 sm:w-12 border-t-4 border-purple-900 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-900 text-base sm:text-lg font-medium">Loading course content...</p>
        </div>
        <Toaster position="top-center" />
      </div>
    );
  }

  if (!course || !hasPurchased) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 max-w-md w-full text-center shadow-lg rounded-lg">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-sm sm:text-base text-gray-600">You need to purchase this course to access the content.</p>
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="mt-4 bg-purple-900 hover:bg-purple-800 text-white py-2 px-4 sm:px-6 text-sm sm:text-base font-medium transition-colors rounded"
          >
            Go to Course
          </button>
        </div>
        <Toaster position="top-center" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <Toaster position="top-center" />
      <style>
        {`
          .plyr { border-radius: 0 !important; }
          .plyr--video { background: #000; }
          .plyr__video-wrapper { background: #000; }
          .plyr__controls { background: rgba(0, 0, 0, 0.8) !important; }
          .plyr__control--overlaid { background: rgba(120, 53, 15, 0.9) !important; }
          .plyr--full-ui input[type="range"] { color: #78350f !important; }
          .plyr__control.plyr__tab-focus, .plyr__control:hover, .plyr__control[aria-expanded="true"] { background: #78350f !important; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
          .video-container { position: relative; width: 100%; height: 0; padding-bottom: 56.25%; }
          .video-container .plyr { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
          @media (max-width: 640px) { .video-container { padding-bottom: 60%; } }
        `}
      </style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(!isSidebarOpen || window.innerWidth >= 1024) && (
          <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <button
                    onClick={toggleSidebar}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    aria-label="Toggle sidebar"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    aria-label="Go back"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <h1 className="text-base sm:text-lg font-medium text-gray-900 truncate">{course?.course_name}</h1>
                </div>
                <div className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm text-gray-600 flex-shrink-0">
                  <span>{videos.length} videos</span>
                  <span>•</span>
                  <span>{Math.round(videos.reduce((acc, v) => acc + (v.video_duration_minutes || 0), 0) / 60)}h total</span>
                </div>
              </div>
              <div className="sm:hidden mt-2 flex items-center space-x-2 text-xs text-gray-600">
                <span>{videos.length} videos</span>
                <span>•</span>
                <span>{Math.round(videos.reduce((acc, v) => acc + (v.video_duration_minutes || 0), 0) / 60)}h total</span>
              </div>
            </div>
          </header>
        )}

        <div className="flex h-[calc(100vh-80px)] sm:h-[calc(100vh-88px)]">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-5 sm:space-y-6">
                <div className="w-full">
                  {selectedVideo ? (
                    <div className="video-container bg-black">
                      <Plyr
                        source={getPlyrSources(selectedVideo)}
                        options={getPlyrOptions}
                        key={`${selectedVideo.id}-${selectedResolution || 'default'}`}
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-black flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-400 text-sm sm:text-lg">Select a video to start learning</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedVideo && (
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-2 sm:mb-3">
                        {selectedVideo.video_detail || selectedVideo.title || 'Video'}
                      </h2>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                        <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                          {selectedVideo.video_duration_minutes && (
                            <span>{formatDuration(selectedVideo.video_duration_minutes)}</span>
                          )}
                          <span className="hidden sm:inline">•</span>
                          <span className="truncate">{course?.course_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-5 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">About this course</h3>
                  <div className="space-y-3">
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                      {course?.description || 'Course description will be loaded dynamically from the database.'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm">
                      {course?.course_instructor && (
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                          <span className="font-medium text-gray-900">Instructor:</span>
                          <span className="text-gray-700">{course.course_instructor}</span>
                        </div>
                      )}
                      {course?.course_category && (
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                          <span className="font-medium text-gray-900">Category:</span>
                          <span className="text-gray-700">{course.course_category}</span>
                        </div>
                      )}
                      {course?.course_level && (
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                          <span className="font-medium text-gray-900">Level:</span>
                          <span className="text-gray-700">{course.course_level}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedVideo && selectedVideo.video_description && (
                  <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">Video Description</h4>
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{selectedVideo.video_description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className={`fixed lg:static top-0 right-0 h-full w-full sm:w-80 lg:w-96 bg-white border-l border-gray-200 transition-transform duration-300 ease-in-out z-50 px-4 sm:px-0 ${
              isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            } lg:translate-x-0 flex flex-col`}
          >
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{course?.course_name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {videos.length} lectures • {Math.round(videos.reduce((acc, v) => acc + (v.video_duration_minutes || 0), 0) / 60)}h total
                  </p>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="p-1 hover:bg-gray-200 rounded transition-colors lg:hidden"
                  aria-label="Close sidebar"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {videos.length > 0 ? (
                videos.map((video, index) => {
                  const isSelected = selectedVideo?.id === video.id;
                  return (
                    <div
                      key={video.id}
                      className={`flex items-start p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                        isSelected ? 'bg-purple-50 border-l-4 border-l-purple-900' : ''
                      }`}
                      onClick={() => handleVideoSelect(video)}
                    >
                      <div className="flex-shrink-0 mr-3 mt-1">
                        <div
                          className={`w-6 h-6 flex items-center justify-center text-xs font-medium rounded ${
                            isSelected ? 'text-purple-900 bg-purple-100' : 'text-gray-500 bg-gray-100'
                          }`}
                        >
                          {isSelected ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-xs sm:text-sm font-medium line-clamp-2 leading-tight ${
                            isSelected ? 'text-purple-900' : 'text-gray-900'
                          }`}
                        >
                          {video.video_detail || video.title || `Lecture ${index + 1}`}
                        </h4>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          {video.video_duration_minutes && <span>{formatDuration(video.video_duration_minutes)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 sm:p-8 text-center text-gray-500">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4v16a2 2 0 002 2h6a2 2 0 002-2V4M7 8h10M7 12h10M7 16h10"
                    />
                  </svg>
                  <p className="text-xs sm:text-sm">No videos available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggleSidebar}></div>
      )}
    </div>
  );
}