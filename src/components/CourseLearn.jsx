import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Plyr from 'plyr-react';
import 'plyr/dist/plyr.css';

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
  const plyrRef = useRef(null);

  useEffect(() => {
    async function fetchCourseData() {
      const token = localStorage.getItem('token');
      let purchaseStatus = false;

      if (!token) {
        navigate(`/signup?redirect=/courses/${courseId}/learn`);
        return;
      }

      try {
        const [authResponse, purchaseResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/check`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}/purchase-status`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
        ]);

        if (!authResponse.ok) {
          localStorage.removeItem('token');
          navigate(`/signup?redirect=/courses/${courseId}/learn`);
          return;
        }

        if (!purchaseResponse.ok) {
          navigate(`/courses/${courseId}`);
          return;
        }

        const purchaseData = await purchaseResponse.json();
        purchaseStatus = purchaseData.hasPurchased;

        if (!purchaseStatus) {
          navigate(`/courses/${courseId}`);
          return;
        }

        const [courseRes, videosRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/courses/${courseId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/api/courses/${courseId}/videos`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
        ]);

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

        setCourse(courseData);
        setVideos(videoData || []);
        setHasPurchased(purchaseStatus);
        if (videoData.length > 0) {
          setSelectedVideo(videoData[0]);
          if (videoData[0].video_resolutions && videoData[0].video_resolutions.length > 0) {
            setSelectedResolution(videoData[0].video_resolutions[0]);
          } else if (videoData[0].video_url) {
            setSelectedResolution(videoData[0].video_url);
          }
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(`Failed to load course content: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchCourseData();
  }, [courseId, navigate]);

  // Update course progress
  const updateProgress = async () => {
    if (!selectedVideo || !plyrRef.current?.plyr) return;

    const player = plyrRef.current.plyr;
    const token = localStorage.getItem('token');

    if (!token) {
      localStorage.removeItem('token');
      navigate(`/signup?redirect=/courses/${courseId}/learn`);
      return;
    }

    if (!player.currentTime || !player.duration) return;

    const progressSeconds = player.currentTime;
    const durationSeconds = player.duration;
    const isCompleted = progressSeconds >= durationSeconds * 0.9; // Mark as completed if 90% watched

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}/videos/${selectedVideo.id}/progress`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            progress_seconds: progressSeconds,
            duration_seconds: durationSeconds,
            is_completed: isCompleted,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate(`/signup?redirect=/courses/${courseId}/learn`);
          return;
        }
        throw new Error(`Failed to update progress: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Progress update error:', err);
    }
  };

  useEffect(() => {
    if (!selectedVideo || !plyrRef.current?.plyr) return;

    const interval = setInterval(updateProgress, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [selectedVideo, courseId, navigate]);

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getResolutionLabel = (url) => {
    if (!url) return 'Auto';
    if (url.includes('_240p')) return '240p';
    if (url.includes('_360p')) return '360p';
    if (url.includes('_480p')) return '480p';
    if (url.includes('_720p')) return '720p';
    if (url.includes('_1080p')) return '1080p';
    return 'Default';
  };

  const getPlyrSources = (video) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('token');

    const sourceUrl = selectedResolution || video.video_url;
    const qualityOptions = [];

    if (video.video_resolutions && video.video_resolutions.length > 0) {
      video.video_resolutions.forEach((resolution) => {
        qualityOptions.push({
          name: getResolutionLabel(resolution),
          src: resolution,
          type: 'video/mp4',
          selected: resolution === selectedResolution,
        });
      });
    } else if (video.video_url) {
      qualityOptions.push({
        name: 'Default',
        src: video.video_url,
        type: 'video/mp4',
        selected: true,
      });
    }

    return {
      type: 'video',
      sources: [
        {
          src: sourceUrl,
          type: 'video/mp4',
        },
      ],
      tracks: course?.subtitle_available
        ? [
            {
              kind: 'captions',
              label: course.subtitle_language || 'Subtitles',
              srcLang: course.subtitle_language?.toLowerCase() || 'en',
              src: `${baseUrl}/api/courses/${courseId}/subtitles?token=${token}`,
              default: true,
            },
          ]
        : [],
      quality: {
        default: selectedResolution
          ? qualityOptions.findIndex((opt) => opt.src === selectedResolution)
          : 0,
        options: qualityOptions,
        forced: true,
        onChange: (quality) => {
          const selectedQuality = qualityOptions[quality];
          if (selectedQuality) {
            setSelectedResolution(selectedQuality.src);
          }
        },
      },
    };
  };

  const getPlyrOptions = () => {
    return {
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
      settings: ['speed', 'quality', 'captions'],
      captions: {
        active: course?.subtitle_available && course?.subtitle_language,
        update: true,
      },
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
    };
  };

  const handleVideoSelect = (video) => {
    if (plyrRef.current && plyrRef.current.plyr) {
      plyrRef.current.plyr.stop();
    }
    setSelectedVideo(video);
    if (video.video_resolutions && video.video_resolutions.length > 0) {
      setSelectedResolution(video.video_resolutions[0]);
    } else if (video.video_url) {
      setSelectedResolution(video.video_url);
    }
    setIsSidebarOpen(false);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Course</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-t-4 border-purple-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading course content...</p>
        </div>
      </div>
    );
  }

  if (!course || !hasPurchased) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You need to purchase this course to access the content.</p>
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            Go to Course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <style>
        {`
          .plyr {
            border-radius: 4px !important;
          }
          .plyr--video {
            background-color: #000;
          }
          .plyr__video-wrapper {
            background-color: #000;
          }
          .plyr__controls {
            background: rgba(0, 0, 0, 0.8) !important;
          }
          .plyr__control--overlaid {
            background: rgba(147, 51, 234, 0.9) !important;
          }
          .plyr--full-ui input[type="range"] {
            color: #9333ea !important;
          }
          .plyr__control.plyr__tab-focus, 
          .plyr__control:hover, 
          .plyr__control[aria-expanded="true"] {
            background-color: #9333ea !important;
          }
          .plyr--loading .plyr__control {
            cursor: not-allowed;
            opacity: 0.5;
          }
          .truncate-lines {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        `}
      </style>

      {/* Header */}
      <header className="bg-gray-900 text-white sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center text-sm font-medium text-gray-300 mb-2">
                <a href="/" className="hover:text-white transition-colors">Home</a>
                <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <a href="/courses" className="hover:text-white transition-colors">Courses</a>
                <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-white">{course.course_name}</span>
              </nav>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">{course.course_name}</h1>
              {course.description && (
                <p className="text-sm text-gray-300 mt-2 max-w-2xl truncate-lines">{course.description}</p>
              )}
            </div>
            <button
              className="md:hidden p-2 rounded-md bg-gray-800 hover:bg-gray-700"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Video Player Section */}
        <div className="flex-1">
          {selectedVideo ? (
            <div className="bg-black rounded-lg shadow-lg mb-6">
              <div className="aspect-video">
                <Plyr
                  ref={plyrRef}
                  source={getPlyrSources(selectedVideo)}
                  options={getPlyrOptions()}
                  key={`${selectedVideo.id}-${selectedResolution}`}
                  onEnded={updateProgress}
                />
              </div>
              <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedVideo.video_detail || selectedVideo.title || 'Video'}
                    </h3>
                    {selectedVideo.video_description && (
                      <p className="text-gray-600 mt-2 text-sm">{selectedVideo.video_description}</p>
                    )}
                    {selectedVideo.video_duration_minutes && (
                      <p className="text-sm text-gray-500 mt-1">
                        Duration: {formatDuration(selectedVideo.video_duration_minutes)}
                      </p>
                    )}
                  </div>
                  {selectedVideo.video_resolutions && selectedVideo.video_resolutions.length > 0 && (
                    <select
                      value={selectedResolution}
                      onChange={(e) => setSelectedResolution(e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      {selectedVideo.video_resolutions.map((resolution) => (
                        <option key={resolution} value={resolution}>
                          {getResolutionLabel(resolution)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-gray-800 flex items-center justify-center rounded-lg shadow-lg mb-6">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                <p className="text-gray-400 text-lg font-medium">Select a video to start learning</p>
              </div>
            </div>
          )}
        </div>

        {/* Course Content Sidebar */}
        <div
          className={`md:w-80 bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'block' : 'hidden'} md:block
            fixed md:static top-0 right-0 z-30 w-80 sm:w-96 h-full md:h-auto
            ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0
            overflow-y-auto`}
        >
          <div className="p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Course Content</h2>
              <button
                className="md:hidden p-2 rounded-md hover:bg-gray-100"
                onClick={() => setIsSidebarOpen(false)}
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {videos.length > 0 ? (
                videos.map((video, index) => (
                  <div
                    key={video.id}
                    className={`p-3 sm:p-4 rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedVideo?.id === video.id ? 'bg-purple-50 border-l-4 border-purple-600' : 'border-l-4 border-transparent'
                    }`}
                    onClick={() => handleVideoSelect(video)}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex-shrink-0">
                        <svg
                          className={`w-5 h-5 ${
                            selectedVideo?.id === video.id ? 'text-purple-600' : 'text-gray-500'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {video.video_detail || video.title || `Lecture ${index + 1}`}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          {video.video_duration_minutes && (
                            <span>{formatDuration(video.video_duration_minutes)}</span>
                          )}
                          {selectedVideo?.id === video.id && (
                            <span className="text-purple-600 font-medium">Now Playing</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v-2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4v16a1 1 0 001 1h8a1 1 0 001-1V4M9 9h6M9 13h6" />
                  </svg>
                  <p>No course content available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}