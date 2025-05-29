import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Play, Clock, Users, Star, Globe, Subtitles, Calendar, Smartphone, Award, FileText, HelpCircle, Share } from 'lucide-react';
import Plyr from 'plyr-react';
import { QRCodeSVG } from 'qrcode.react';
import 'plyr/dist/plyr.css';

// Skeleton Components
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-300 ${className}`}></div>
);

const TextSkeleton = ({ lines = 1 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-4 w-full" />
    ))}
  </div>
);

const VideoSkeleton = () => (
  <div className="aspect-video bg-gray-300 animate-pulse flex items-center justify-center">
    <Play className="w-16 h-16 text-gray-400" />
  </div>
);

export default function UdemyCourseDetails() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [hoveredVideoId, setHoveredVideoId] = useState(null);
  const [visibleVideos, setVisibleVideos] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const videoRefs = useRef({});
  const timeoutRef = useRef({});
  const plyrRef = useRef(null);
  const [playerState, setPlayerState] = useState({ currentTime: 0, isPlaying: false });

  // Fetch course data and check authentication
  useEffect(() => {
    async function checkAuthAndFetchCourse() {
      const token = localStorage.getItem('token');
      let purchaseStatus = false;

      if (token) {
        try {
          const authResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/check`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!authResponse.ok) {
            localStorage.removeItem('token');
          } else {
            const purchaseResponse = await fetch(
              `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}/purchase-status`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            if (purchaseResponse.ok) {
              const purchaseData = await purchaseResponse.json();
              purchaseStatus = purchaseData.hasPurchased;
            }
          }
        } catch (err) {
          localStorage.removeItem('token');
        }
      }

      try {
        const [courseRes, videosRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}`),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}/videos`),
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
      } catch (err) {
        console.error('Fetch error:', err);
        setError(`Failed to load course details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndFetchCourse();
  }, [courseId]);

  // Intersection Observer for video previews
  useEffect(() => {
    if (videos.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const videoId = entry.target.getAttribute('data-videoid');
            setVisibleVideos((prev) => ({ ...prev, [videoId]: true }));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    Object.entries(videoRefs.current).forEach(([id, ref]) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      Object.entries(videoRefs.current).forEach(([id, ref]) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [videos]);

  // Player state management
  useEffect(() => {
    if (plyrRef.current && plyrRef.current.plyr) {
      const player = plyrRef.current.plyr;
      player.currentTime = playerState.currentTime;
      if (playerState.isPlaying) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [activeTab, playerState]);

  const calculateFinalPrice = () => {
    if (!course) return 0;
    const now = new Date();
    const offerStart = course.offer_start ? new Date(course.offer_start) : null;
    const offerEnd = course.offer_end ? new Date(course.offer_end) : null;
    const offerDiscount = parseFloat(course.offer_discount);
    const isOfferActive = offerStart && offerEnd && now >= offerStart && now <= offerEnd && !isNaN(offerDiscount) && offerDiscount > 0;

    if (isOfferActive) {
      return course.price * (1 - offerDiscount / 100);
    }
    const flatDiscount = parseFloat(course.discount_price);
    if (!isNaN(flatDiscount)) {
      return course.price - flatDiscount;
    }
    return course.price;
  };

  const finalPrice = calculateFinalPrice();
  const isDiscounted = course && finalPrice < course.price;
  const discountPercentage = isDiscounted ? Math.round(((course.price - finalPrice) / course.price) * 100) : 0;

  const totalDuration = videos.reduce((total, video) => total + (video.video_duration_minutes || 0), 0);

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleMouseEnter = (videoId) => {
    setHoveredVideoId(videoId);
    if (timeoutRef.current[videoId]) {
      clearTimeout(timeoutRef.current[videoId]);
    }
    timeoutRef.current[videoId] = setTimeout(() => {
      setHoveredVideoId(null);
    }, 4000);
  };

  const handleMouseLeave = (videoId) => {
    if (timeoutRef.current[videoId]) clearTimeout(timeoutRef.current[videoId]);
    setHoveredVideoId(null);
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleTabChange = (tab) => {
    if (plyrRef.current && plyrRef.current.plyr) {
      const player = plyrRef.current.plyr;
      setPlayerState({
        currentTime: player.currentTime,
        isPlaying: !player.paused && !player.ended,
      });
    }
    setActiveTab(tab);
  };

  const handleButtonClick = () => {
    const token = localStorage.getItem('token');
    if (hasPurchased) {
      navigate(`/courses/${courseId}/learn`);
    } else if (token) {
      navigate(`/courses/${courseId}/payment`);
    } else {
      navigate(`/signup?redirect=/courses/${courseId}/payment`);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-300 text-gray-300'}`}
      />
    ));
  };

  const getPlyrSources = (video) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const resolutions = video.is_preview && video.video_resolutions
      ? video.video_resolutions
      : { '1080p': video.video_url };
    return {
      type: 'video',
      sources: Object.keys(resolutions).map((quality) => ({
        src: video.is_preview
          ? `${baseUrl}/api/courses/${courseId}/videos/${video.id}/stream/${quality}`
          : resolutions[quality],
        type: 'application/x-mpegURL',
        size: quality === '4k' ? 2160 : parseInt(quality, 10),
      })),
      tracks: course.subtitle_available
        ? [
            {
              kind: 'captions',
              label: course.subtitle_language || 'Subtitles',
              srcLang: course.subtitle_language?.toLowerCase() || 'en',
              src: `${baseUrl}/api/courses/${courseId}/subtitles`,
              default: true,
            },
          ]
        : [],
    };
  };

  const getPlyrOptions = () => {
    return {
      controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'fullscreen'],
      settings: ['quality', 'speed', 'captions'],
      captions: { active: course?.subtitle_available && course?.subtitle_language },
      quality: {
        default: 1080,
        options: videos.find((v) => v.id === hoveredVideoId)?.video_resolutions
          ? Object.keys(videos.find((v) => v.id === hoveredVideoId).video_resolutions).map((q) =>
              q === '4k' ? 2160 : parseInt(q, 10)
            )
          : [1080],
      },
      autoplay: false,
      muted: true,
    };
  };

  const promoVideoPlayer = useMemo(() => {
    if (!course?.promo_url) {
      return (
        <div className="aspect-video bg-black flex items-center justify-center">
          <Play className="w-16 h-16 text-gray-400" />
        </div>
      );
    }

    return (
      <Plyr
        ref={plyrRef}
        source={{
          type: 'video',
          sources: [{ src: course.promo_url, type: 'video/mp4', size: 720 }],
          tracks: course.subtitle_available
            ? [
                {
                  kind: 'captions',
                  label: course.subtitle_language || 'Subtitles',
                  srcLang: course.subtitle_language?.toLowerCase() || 'en',
                  src: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}/subtitles`,
                  default: true,
                },
              ]
            : [],
        }}
        options={{
          controls: [
            'play-large',
            'play',
            'progress',
            'current-time',
            'mute',
            'volume',
            'captions',
            'settings',
            'pip',
            'airplay',
            'fullscreen',
          ],
          settings: ['quality', 'speed', 'captions'],
          autoplay: false,
        }}
      />
    );
  }, [course, courseId]);

  // Truncate description for header
  const truncateDescription = (text, maxLength = 150) => {
    if (!text) return '';
    return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
  };

  // Generate course URL for QR code
  // Replace 'https://thugilcreation.com' with your actual domain
  const courseUrl = `https://thugilcreation.com/courses/${courseId}`;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 max-w-md w-full mx-4 text-center">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Course</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-6">
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <div className="flex gap-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="lg:hidden">
                <VideoSkeleton />
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="hidden lg:block mb-8">
                <VideoSkeleton />
              </div>
              <div className="bg-white p-6 space-y-6">
                <TextSkeleton lines={3} />
                <TextSkeleton lines={5} />
              </div>
            </div>
            <div className="w-full lg:w-80 xl:w-96">
              <div className="bg-white p-6 space-y-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-12 w-full" />
                <TextSkeleton lines={6} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 max-w-md w-full mx-4 text-center">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Not Found</h3>
          <p className="text-gray-600">The course you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style>
        {`
          .plyr {
            border-radius: 0 !important;
          }
          .plyr--video {
            background-color: #000;
          }
          .plyr__controls {
            background: rgba(0, 0, 0, 0.7) !important;
          }
          .plyr__control--overlaid {
            background: rgba(109, 40, 217, 0.8) !important;
          }
          .plyr--full-ui input[type="range"] {
            color: #8b5cf6 !important;
          }
          .plyr__control.plyr__tab-focus, .plyr__control:hover, .plyr__control[aria-expanded="true"] {
            background-color: #8b5cf6 !important;
          }
          .plyr--video .plyr__control.plyr__tab-focus, .plyr--video .plyr__control:hover, .plyr--video .plyr__control[aria-expanded="true"] {
            background-color: #8b5cf6 !important;
          }
          .no-border-radius {
            border-radius: 0 !important;
          }
          .course-badge {
            background-color: white;
            border: 2px solid #e5e7eb;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
          }
        `}
      </style>
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <nav className="flex items-center text-sm text-gray-400 mb-6">
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
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                {course.course_name}
              </h1>
              {course.description && (
                <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                  {truncateDescription(course.description)}
                </p>
              )}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {renderStars(course.rating)}
                  </div>
                  <span className="text-yellow-400 font-bold">{course.rating}</span>
                  <span className="text-gray-400">({course.total_ratings?.toLocaleString()} ratings)</span>
                </div>
                <span className="text-gray-400">{course.total_students?.toLocaleString()} students</span>
              </div>
              {course.instructor_name && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-gray-400">Created by</span>
                  <span className="text-purple-300 hover:text-purple-200 cursor-pointer underline">
                    {course.instructor_name}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                {course.last_updated && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Last updated {new Date(course.last_updated).toLocaleDateString()}</span>
                  </div>
                )}
                {course.course_language && (
                  <div className="flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    <span>{course.course_language}</span>
                  </div>
                )}
                {course.subtitle_available && (
                  <div className="flex items-center gap-1">
                    <Subtitles className="w-4 h-4" />
                    <span>Subtitles: {course.subtitle_language}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="lg:hidden">
              <div className="aspect-video bg-black no-border-radius overflow-hidden">
                {promoVideoPlayer}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row ">
          <div className="flex-1">
            <div className="hidden lg:block mb-8">
              <div className="aspect-video bg-black no-border-radius overflow-hidden">
                {promoVideoPlayer}
              </div>
            </div>
            <div className="bg-white border border-gray-200 no-border-radius mb-8">
              <div className="border-b border-gray-200">
                <nav className="flex">
                  <button
                    onClick={() => handleTabChange('overview')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'overview'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => handleTabChange('curriculum')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'curriculum'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Curriculum
                  </button>
                </nav>
              </div>
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">What you'll learn</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {course.learning_objectives?.split(',').map((objective, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-4 h-4 text-gray-900 mt-0.5 flex-shrink-0">✓</div>
                            <span className="text-gray-700 text-sm">{objective.trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {course.description && (
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Description</h2>
                        <p className="text-gray-700 text-sm leading-relaxed">{course.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-700 text-sm font-modern leading-relaxed">
                        This is a Thugil Creation course where they teach silk saree designing and the tools learning.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">This course includes:</h3>
                      <div className="flex flex-wrap gap-3">
                        {totalDuration > 0 && (
                          <div className="course-badge">
                            <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                            <span className="text-sm text-gray-700">
                              {formatDuration(totalDuration)} on-demand video
                            </span>
                          </div>
                        )}
                        {videos.length > 0 && (
                          <div className="course-badge">
                            <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="text-sm text-gray-700">
                              {videos.length} {videos.length === 1 ? 'lecture' : 'lectures'}
                            </span>
                          </div>
                        )}
                        {course.downloadable_resources && (
                          <div className="course-badge">
                            <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-sm text-gray-700">
                              {course.downloadable_resources} downloadable resources
                            </span>
                          </div>
                        )}
                        <div className="course-badge">
                          <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-700">Access on mobile and TV</span>
                        </div>
                        <div className="course-badge">
                          <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-700">Full lifetime access</span>
                        </div>
                        {course.subtitle_available && (
                          <div className="course-badge">
                            <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4v16a1 1 0 001 1h8a1 1 0 001-1V4M9 9h6M9 13h6" />
                            </svg>
                            <span className="text-sm text-gray-700">
                              Closed captions ({course.subtitle_language || 'Available'})
                            </span>
                          </div>
                        )}
                        {course.certificate_available && (
                          <div className="course-badge">
                            <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            <span className="text-sm text-gray-700">Certificate of completion</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'curriculum' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Course content</h2>
                        <p className="text-gray-600 mt-1">
                          {videos.length > 0 && `${videos.length} ${videos.length === 1 ? 'section' : 'sections'}`}
                          {totalDuration > 0 && ` • ${formatDuration(totalDuration)} total length`}
                        </p>
                      </div>
                      <button
                        onClick={() => setExpandedSections(videos.reduce((acc, v) => ({ ...acc, [v.id]: true }), {}))}
                        className="text-purple-600 text-sm font-medium"
                      >
                        Expand all sections
                      </button>
                    </div>
                    <div className="border border-gray-200 no-border-radius overflow-hidden">
                      <div className="border-b border-gray-100">
                        <button
                          onClick={() => toggleSection('main')}
                          className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900">{course.course_name}</h3>
                              <p className="text-sm text-gray-600">{videos.length} lectures • {formatDuration(totalDuration)}</p>
                            </div>
                            <ChevronRight className={`w-5 h-5 transition-transform ${expandedSections.main ? 'rotate-90' : ''}`} />
                          </div>
                        </button>
                        {expandedSections.main && (
                          <div className="border-t border-gray-100 bg-gray-50">
                            {videos.map((video) => (
                              <div
                                key={video.id}
                                className="border-b border-gray-100 last:border-b-0"
                                ref={(el) => (videoRefs.current[video.id] = el)}
                                data-videoid={video.id}
                                onMouseEnter={() => handleMouseEnter(video.id)}
                                onMouseLeave={() => handleMouseLeave(video.id)}
                              >
                                <div className="p-4 flex items-center gap-4">
                                  <Play className="w-4 h-4 text-gray-600" />
                                  <div className="flex-1">
                                    <h4 className="text-sm font-medium text-gray-900">
                                      {video.video_detail}
                                    </h4>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                      <span>{formatDuration(video.video_duration_minutes)}</span>
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {String(video.video_duration_minutes).padStart(2, '0')}:{String(video.video_duration_minutes * 60 % 60).padStart(2, '0')}
                                  </span>
                                </div>
                                {visibleVideos[video.id] && hoveredVideoId === video.id && video.is_preview && (
                                  <div className="p-4 bg-gray-50">
                                    <Plyr
                                      source={getPlyrSources(video)}
                                      options={getPlyrOptions()}
                                      ref={plyrRef}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {course.instructor_name && (
              <div className="bg-white border border-gray-200 no-border-radius p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Instructor</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-purple-100 flex items-center justify-center no-border-radius flex-shrink-0">
                    <span className="text-purple-600 font-bold text-xl">
                      {course.instructor_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">
                      {course.instructor_name}
                    </h4>
                    {course.instructor_title && (
                      <p className="text-gray-600 text-sm">{course.instructor_title}</p>
                    )}
                    {course.instructor_rating && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {renderStars(course.instructor_rating)}
                        </div>
                        <span className="text-sm text-gray-600">{course.instructor_rating}</span>
                      </div>
                    )}
                  </div>
                </div>
                {course.instructor_bio && (
                  <p className="text-gray-700 text-sm mt-4 leading-relaxed">
                    {course.instructor_bio}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="w-full lg:w-80 xl:w-96">
            <div className="sticky top-6">
              <div className="bg-white border border-gray-200 no-border-radius overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4 text-purple-600 text-sm">
                    <div className="w-5 h-5 bg-purple-600 no-border-radius flex items-center justify-center">
                      <span className="text-white text-xs font-bold">P</span>
                    </div>
                    <span>This Premium course is included in plans</span>
                  </div>
                  <div className="mb-6">
                    {isDiscounted ? (
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className="text-3xl font-bold text-gray-900">
                          ₹{finalPrice.toFixed(0)}
                        </span>
                        <span className="text-lg text-gray-500 line-through">
                          ₹{course.price.toLocaleString()}
                        </span>
                        <span className="text-sm font-medium text-gray-600">
                          {discountPercentage}% off
                        </span>
                      </div>
                    ) : (
                      <div className="text-3xl font-bold text-gray-900 mb-2">
                        ₹{finalPrice.toFixed(0)}
                      </div>
                    )}
                    {isDiscounted && (
                      <div className="text-sm text-red-600 font-medium mb-2">
                        {discountPercentage}% OFF - Limited time offer!
                      </div>
                    )}
                    <div className="text-sm text-red-600 font-medium flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {course.offer_end && new Date(course.offer_end) > new Date() ? (
                        <span>Offer ends {new Date(course.offer_end).toLocaleDateString()}</span>
                      ) : (
                        <span>7 hours left at this price!</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3 mb-6">
                    <button
                      onClick={handleButtonClick}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 font-bold text-lg no-border-radius transition-colors"
                    >
                      {hasPurchased ? 'Start Learning' : 'Buy Now'}
                    </button>
                  </div>
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-600">Full Lifetime Access</p>
                  </div>
                  <div className="flex gap-3 mb-6">
                    <button className="flex-1 border border-gray-300 hover:bg-gray-50 py-2 px-3 text-sm no-border-radius transition-colors flex items-center justify-center gap-2">
                      <Share className="w-4 h-4" />
                      Share
                    </button>
                    <button className="flex-1 border border-gray-300 hover:bg-gray-50 py-2 px-3 text-sm no-border-radius transition-colors flex items-center justify-center gap-2">
                      Gift this course
                    </button>
                  </div>
                  <div className="text-center mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">Subscribe to Thugil Creation's top courses</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Get this course, plus 32,000+ of our top-rated courses, with Personal Plan.
                    </p>
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-600 py-3 px-4 font-bold no-border-radius cursor-not-allowed"
                    >
                      Start subscription
                    </button>
                    <div className="text-xs text-gray-500 mt-2">
                      Starting at ₹850 per month<br />
                      Cancel anytime
                    </div>
                  </div>
                  <div className="text-center mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">Scan to visit this course</h4>
                    <div className="flex justify-center">
                      <QRCodeSVG
                        value={courseUrl}
                        size={128}
                        level="M"
                        includeMargin={true}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}