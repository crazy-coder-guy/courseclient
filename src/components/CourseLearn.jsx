import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import Hls from 'hls.js';
import './styles.css';

export default function CourseLearn() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [qualityLevels, setQualityLevels] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState(-1); // -1 for auto
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
  const progressSaveTimeoutRef = useRef(null); // For debouncing progress saves

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Initialize HLS player and handle quality levels
  useEffect(() => {
    if (!selectedVideo || !videoRef.current) return;

    const video = videoRef.current;
    const videoUrl = selectedVideo.video_url;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels.map((level, index) => ({
          id: index,
          name: level.name || `${level.height}p`,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
        }));
        setQualityLevels([{ id: -1, name: 'Auto', height: null }, ...levels]);
        setSelectedQuality(-1);

        if (hls.autoLevelEnabled) {
          hls.currentLevel = -1;
        }

        // Seek to saved progress time
        if (selectedVideo.progress?.current_time > 0) {
          video.currentTime = selectedVideo.progress.current_time;
        }

        video.play().catch(e => console.error('Auto-play failed:', e));
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setSelectedQuality(data.level);
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoUrl;
      video.addEventListener('loadedmetadata', () => {
        // Seek to saved progress time
        if (selectedVideo.progress?.current_time > 0) {
          video.currentTime = selectedVideo.progress.current_time;
        }
        video.play().catch(e => console.error('Auto-play failed:', e));
      });
    }
  }, [selectedVideo]);

  // Save progress to backend
  const saveProgress = useCallback(
    async (currentTime, isCompleted) => {
      const token = localStorage.getItem('token');
      if (!token || !selectedVideo) return;

      try {
        const response = await fetch(`${API_URL}/api/courses/${courseId}/videos/${selectedVideo.id}/progress`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_time: currentTime,
            is_completed: isCompleted,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to save progress:', errorData.error);
          // toast.error(`Failed to save progress: ${errorData.error}`);
        }
      } catch (err) {
        console.error('Save progress error:', err);
        // toast.error('Error saving progress');
      }
    },
    [courseId, selectedVideo]
  );

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Debounce progress saving
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }
      const isCompleted = video.currentTime >= video.duration * 0.95; // Mark as completed at 95%
      progressSaveTimeoutRef.current = setTimeout(() => {
        saveProgress(video.currentTime, isCompleted);
      }, 1000); // Save every 1 second
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handleVolumeChange = () => setVolume(video.volume);
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    const handleEnded = () => {
      setIsPlaying(false);
      saveProgress(video.currentTime, true); // Save as completed when video ends
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ended', handleEnded);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ended', handleEnded);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }
    };
  }, [selectedVideo, saveProgress]);

  // Handle quality change
  const handleQualityChange = useCallback((level) => {
    setSelectedQuality(level);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
    }
    setIsQualityMenuOpen(false);
  }, []);

  // Toggle quality menu
  const toggleQualityMenu = useCallback(() => {
    setIsQualityMenuOpen((prev) => !prev);
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.error('Play failed:', e));
      }
    }
  }, [isPlaying]);

  // Handle seek
  const handleSeek = useCallback((time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      saveProgress(time, videoRef.current.currentTime >= videoRef.current.duration * 0.95);
    }
  }, [saveProgress]);

  // Handle volume change
  const handleVolumeChange = useCallback((newVolume) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Format time
  const formatTime = useCallback((time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

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

        setCourse(courseData);
        setVideos(videoData || []);
        setHasPurchased(purchaseStatus);

        if (videoData?.length > 0) {
          setSelectedVideo(videoData[0]);
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
    const parsedMinutes = parseFloat(minutes);
    if (isNaN(parsedMinutes)) return '0:00';
    const hours = Math.floor(parsedMinutes / 60);
    const mins = Math.round(parsedMinutes % 60);
    return hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins}:00`;
  };

  // Handle video selection
  const handleVideoSelect = useCallback(
    (video) => {
      if (video?.id !== selectedVideo?.id) {
        setSelectedVideo(video);
        setQualityLevels([]);
        setSelectedQuality(-1);
        setIsQualityMenuOpen(false);
        if (window.innerWidth < 1024) {
          setIsSidebarOpen(false);
        }
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
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" />
      <style>
        {`
          .quality-menu {
            position: absolute;
            bottom: 50px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            border-radius: 4px;
            padding: 10px;
            z-index: 100;
            display: ${isQualityMenuOpen ? 'block' : 'none'};
          }
          .mobile-toggle-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 48px;
            height: 48px;
            background: #8b5cf6;
            color: white;
            display: none;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 50;
          }
          @media (max-width: 1023px) {
            .mobile-toggle-button {
              display: flex;
            }
          }
          .video-container {
            position: relative;
            width: 100%;
            max-width: 100%;
          }
          .video-controls {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.7);
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .progress-container {
            width: 100%;
            height: 5px;
            background: rgba(255,255,255,0.3);
            cursor: pointer;
          }
          .progress-bar {
            height: 100%;
            background: #8b5cf6;
            transition: width 0.1s;
          }
          .controls-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .left-controls {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .right-controls {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .control-button {
            background: none;
            border: none;
            cursor: pointer;
            padding: 5px;
          }
          .volume-container {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .volume-slider {
            width: 80px;
            cursor: pointer;
          }
          .time-display {
            color: white;
            font-size: 12px;
          }
          .quality-option {
            padding: 5px 10px;
            color: white;
            cursor: pointer;
          }
          .quality-option:hover {
            background: rgba(255,255,255,0.1);
          }
          .quality-option.selected {
            background: #8b5cf6;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
          .completed-icon {
            color: #10b981;
          }
        `}
      </style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(!isSidebarOpen || window.innerWidth >= 1024) && (
          <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    aria-label="Go back"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">{course?.course_name}</h1>
                </div>
                <div className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm text-gray-600 font-medium flex-shrink-0">
                  <span>{videos.length} videos</span>
                </div>
              </div>
              <div className="sm:hidden mt-2 flex items-center space-x-2 text-xs text-gray-600">
                <span>{videos.length} videos</span>
                <span>•</span>
                <span>{Math.round(videos.reduce((acc, v) => acc + (parseFloat(v.video_duration_minutes) || 0), 0) / 60)}h total</span>
              </div>
            </div>
          </header>
        )}

        <div className="flex min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-88px)]">
          <div className="flex-1 flex flex-col">
            <div className="space-y-5 sm:space-y-6">
              <div className="w-full relative">
                {selectedVideo ? (
                  <div className="video-wrapper">
                    <div className="video-container bg-black">
                      <video
                        ref={videoRef}
                        controls={false}
                        autoPlay={false}
                        preload="auto"
                        class_send_progress_on_time_update
                        className="w-full h-auto"
                        key={selectedVideo.id}
                        onClick={togglePlayPause}
                      >
                        <source src={selectedVideo.video_url} type="application/x-mpegURL" />
                        Your browser does not support the video tag.
                      </video>

                      <div className="video-controls">
                        <div
                          className="progress-container"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pos = (e.clientX - rect.left) / rect.width;
                            handleSeek(pos * duration);
                          }}
                        >
                          <div className="progress-bar" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                        </div>

                        <div className="controls-row">
                          <div className="left-controls">
                            <button className="control-button" onClick={togglePlayPause}>
                              {isPlaying ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                </svg>
                              ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              )}
                            </button>

                            <div className="volume-container">
                              <button className="control-button" onClick={toggleMute}>
                                {volume === 0 ? (
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                  </svg>
                                ) : (
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                  </svg>
                                )}
                              </button>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                className="volume-slider"
                              />
                            </div>

                            <div className="time-display">
                              {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                          </div>

                          <div className="right-controls">
                            {qualityLevels.length > 0 && (
                              <div className="relative">
                                <button className="control-button" onClick={toggleQualityMenu}>
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 7H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4z" />
                                  </svg>
                                </button>
                                {isQualityMenuOpen && (
                                  <div className="quality-menu">
                                    {qualityLevels.map((level) => (
                                      <div
                                        key={level.id}
                                        className={`quality-option ${selectedQuality === level.id ? 'selected' : ''}`}
                                        onClick={() => handleQualityChange(level.id)}
                                      >
                                        {level.name}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <button className="control-button" onClick={toggleFullscreen}>
                              {isFullscreen ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                  <path d="M7 16h3v3h2v-5H7v2zm3-8H7v2h5V7h-2v1zm6 11h2v-3h3v-2h-5v5zm2-11V7h-2v5h5v-2h-3z" />
                                </svg>
                              ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
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
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-6">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                      {selectedVideo.video_detail || selectedVideo.title || 'Video'}
                    </h2>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-center space-x-4 text-sm text-gray-600 font-medium">
                        {selectedVideo.video_duration_minutes && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {formatDuration(selectedVideo.video_duration_minutes)}
                          </span>
                        )}
                        <span className="hidden sm:inline text-gray-400">•</span>
                        <span className="max-w-xs truncate font-semibold text-purple-700">{course?.course_name}</span>
                      </div>
                    </div>
                  </div>

                  {selectedVideo.video_description && (
                    <div className="bg-purple-50 rounded-none p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-none flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">What you'll learn</h4>
                      </div>
                      <p className="text-gray-700 leading-relaxed text-base">{selectedVideo.video_description}</p>
                    </div>
                  )}

                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-none p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 bg-purple-100 rounded-none flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">About this course</h3>
                    </div>

                    <div className="space-y-5">
                      <p className="text-gray-700 leading-relaxed text-base">
                        {course?.description || 'Course description will be loaded dynamically from the database.'}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {course?.instructor && (
                          <div className="flex items-start gap-3 p-3 bg-white rounded-none border border-gray-100">
                            <div className="w-5 h-5 bg-green-100 rounded-none flex items-center justify-center mt-0.5">
                              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-500">Instructor</span>
                              <span className="text-gray-900 font-semibold">{course.instructor}</span>
                            </div>
                          </div>
                        )}

                        {course?.category && (
                          <div className="flex items-start gap-3 p-3 bg-white rounded-none border border-gray-100">
                            <div className="w-5 h-5 bg-blue-100 rounded-none flex items-center justify-center mt-0.5">
                              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-500">Category</span>
                              <span className="text-gray-900 font-semibold">{course.category}</span>
                            </div>
                          </div>
                        )}

                        {course?.level && (
                          <div className="flex items-start gap-3 p-3 bg-white rounded-none border border-gray-100">
                            <div className="w-5 h-5 bg-orange-100 rounded-none flex items-center justify-center mt-0.5">
                              <svg className="w-3 h-3 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </div>
                            <div>
                              <span className="block text-sm font-medium text-gray-500">Level</span>
                              <span className="text-gray-900 font-semibold">{course.level}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                    {videos.length} lectures • {Math.round(videos.reduce((acc, v) => acc + (parseFloat(v.video_duration_minutes) || 0), 0) / 60)}h total
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
                  const isCompleted = video.progress?.is_completed;
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
                            isSelected
                              ? 'text-purple-900 bg-purple-100'
                              : isCompleted
                              ? 'text-green-600 bg-green-100'
                              : 'text-gray-500 bg-gray-100'
                          }`}
                        >
                          {isCompleted ? (
                            <svg className="w-4 h-4 completed-icon" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : isSelected ? (
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
                            isSelected ? 'text-purple-900' : isCompleted ? 'text-green-600' : 'text-gray-900'
                          }`}
                        >
                          {video.video_detail || video.title || `Lecture ${index + 1}`}
                        </h4>
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          {video.video_duration_minutes && <span>{formatDuration(video.video_duration_minutes)}</span>}
                          {isCompleted && (
                            <>
                              <span className="mx-1">•</span>
                              <span className="text-green-600">Completed</span>
                            </>
                          )}
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

        <button
          onClick={toggleSidebar}
          className="mobile-toggle-button"
          aria-label="Toggle sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggleSidebar}></div>
      )}
    </div>
  );
}