import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Play, Clock, Users, Star, Globe, Subtitles, Calendar, Smartphone, Award, FileText, HelpCircle } from 'lucide-react';
import Plyr from 'plyr-react';
import './styles.css';
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

// Modern Navigation Component
const ModernNav = ({ course }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Truncate description for tablet view (e.g., max 50 characters)
  const truncateDescription = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
};

export default function UdemyCourseDetails() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [hoveredVideoId, setHoveredVideoId] = useState(null);
  const [visibleVideos, setVisibleVideos] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const videoRefs = useRef({});
  const timeoutRef = useRef({});
  const plyrRef = useRef(null);
  const [playerState, setPlayerState] = useState({ currentTime: 0, isPlaying: false });

  // Fetch course data, check authentication, and fetch purchase details if purchased
  useEffect(() => {
    async function checkAuthAndFetchCourse() {
      const token = localStorage.getItem('token');
      let purchaseStatus = false;
      let purchaseData = null;

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
              const purchaseDataResponse = await purchaseResponse.json();
              purchaseStatus = purchaseDataResponse.hasPurchased;

              if (purchaseStatus) {
                // Fetch purchase details to get expiration_date
                const purchaseDetailsResponse = await fetch(
                  `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}/purchase-details`,
                  {
                    method: 'GET',
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );
                if (purchaseDetailsResponse.ok) {
                  purchaseData = await purchaseDetailsResponse.json();
                }
              }
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
        setPurchaseDetails(purchaseData);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(`Failed to load course details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndFetchCourse();
  }, [courseId]);
// Calculate days remaining and formatted expiration date
const { daysRemaining, formattedDate } = useMemo(() => {
  if (!hasPurchased || !purchaseDetails?.expiration_date) return { daysRemaining: null, formattedDate: null };

  const expirationDate = new Date(purchaseDetails.expiration_date);
  const now = new Date();
  const diffTime = expirationDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short', // e.g., "Jun"
    day: 'numeric', // e.g., "30"
  }).format(expirationDate);

  return {
    daysRemaining: diffDays >= 0 ? diffDays : 0,
    formattedDate,
  };
}, [hasPurchased, purchaseDetails]);

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
  const courseUrl = `https://courseclient.onrender.com`;

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
        <div className="bg-purple-900 text-white">
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
        <div className="max-w-7xl mx-auto px-1 py-4">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="hidden lg:block mb-4">
                <VideoSkeleton />
              </div>
              <div className="bg-white p-6 space-y-4">
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
      <div className="bg-purple-900 text-white relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-96 h-96 rounded-full top-10 right-20 bg-gradient-to-r from-purple-500/20 to-purple-600/10 animate-pulse"></div>
          <div className="absolute w-64 h-64 rounded-full top-40 right-80 bg-gradient-to-r from-purple-400/15 to-purple-700/20 animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute w-80 h-80 rounded-full -top-20 -left-20 bg-gradient-to-br from-purple-600/15 to-purple-800/10 animate-pulse" style={{animationDelay: '4s'}}></div>
          <div className="absolute top-20 right-32 animate-bounce" style={{animationDuration: '6s'}}>
            <div className="w-16 h-16 border-2 border-purple-300/30 transform rotate-45"></div>
          </div>
          <div className="absolute top-60 right-20 animate-bounce" style={{animationDuration: '8s', animationDelay: '2s'}}>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-full"></div>
          </div>
          <div className="absolute top-32 left-20 animate-bounce" style={{animationDuration: '7s', animationDelay: '1s'}}>
            <div className="w-10 h-10 border border-purple-200/40 rotate-45 transform"></div>
          </div>
          <div className="absolute top-16 right-96 animate-spin" style={{animationDuration: '20s'}}>
            <div className="w-24 h-24 border border-purple-300/20 rounded-full relative">
              <div className="absolute top-2 left-2 w-4 h-4 bg-purple-400/40 rounded-full"></div>
              <div className="absolute bottom-2 right-2 w-3 h-3 bg-purple-300/30 rounded-full"></div>
            </div>
          </div>
          <div className="absolute bottom-20 left-32 animate-spin" style={{animationDuration: '15s'}}>
            <div className="w-16 h-16 border border-purple-400/25 rounded-full"></div>
          </div>
          <div className="absolute top-0 right-40 w-px h-full bg-gradient-to-b from-transparent via-purple-300/20 to-transparent animate-pulse" style={{animationDuration: '10s'}}></div>
          <div className="absolute top-0 right-72 w-px h-full bg-gradient-to-b from-transparent via-purple-400/15 to-transparent animate-pulse" style={{animationDuration: '12s', animationDelay: '3s'}}></div>
          <div className="absolute top-0 left-60 w-px h-full bg-gradient-to-b from-transparent via-purple-200/15 to-transparent animate-pulse" style={{animationDuration: '8s', animationDelay: '1s'}}></div>
          <div className="absolute top-24 right-48">
            <div className="grid grid-cols-4 gap-4 opacity-20">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-purple-200 rounded-full animate-bounce"
                  style={{
                    animationDuration: '3s',
                    animationDelay: `${i * 0.2}s`
                  }}
                ></div>
              ))}
            </div>
          </div>
          <div className="absolute top-32 left-16">
            <div className="grid grid-cols-3 gap-3 opacity-15">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-ping"
                  style={{
                    animationDuration: '4s',
                    animationDelay: `${i * 0.5}s`
                  }}
                ></div>
              ))}
            </div>
          </div>
          <div className="absolute top-20 right-16 opacity-10">
            <svg width="200" height="300" viewBox="0 0 200 300" className="animate-pulse" style={{animationDuration: '6s'}}>
              <path d="M50 50 Q 150 100 50 150 Q 150 200 50 250" stroke="rgb(196 181 253)" strokeWidth="2" fill="none" />
              <path d="M70 30 Q 170 80 70 130 Q 170 180 70 230" stroke="rgb(196 181 253)" strokeWidth="1" fill="none" />
            </svg>
          </div>
          <div className="absolute bottom-20 left-16 opacity-10">
            <svg width="150" height="200" viewBox="0 0 150 200" className="animate-pulse" style={{animationDuration: '8s', animationDelay: '2s'}}>
              <path d="M20 20 Q 120 60 20 100 Q 120 140 20 180" stroke="rgb(196 181 253)" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <div className="absolute top-12 right-24 animate-ping" style={{animationDuration: '4s'}}>
            <div className="w-1 h-1 bg-purple-300 rounded-full"></div>
          </div>
          <div className="absolute top-48 right-52 animate-ping" style={{animationDuration: '6s', animationDelay: '1s'}}>
            <div className="w-1 h-1 bg-purple-300 rounded-full"></div>
          </div>
          <div className="absolute top-72 left-48 animate-ping" style={{animationDuration: '5s', animationDelay: '2s'}}>
            <div className="w-1 h-1 bg-purple-300 rounded-full"></div>
          </div>
          <div className="absolute bottom-32 right-36 animate-ping" style={{animationDuration: '7s', animationDelay: '3s'}}>
            <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
          </div>
          <div className="absolute top-8 right-8 w-32 h-32 border-2 border-purple-300/20 rounded-lg animate-pulse transform rotate-12" style={{animationDuration: '8s'}}></div>
          <div className="absolute bottom-8 right-12 w-24 h-24 border border-purple-400/15 rounded-full animate-spin" style={{animationDuration: '15s'}}></div>
          <div className="absolute top-16 left-8 w-20 h-20 border border-purple-300/25 rounded-lg animate-pulse transform -rotate-12" style={{animationDuration: '6s', animationDelay: '2s'}}></div>
          <div className="absolute top-1/3 left-1/4 animate-float" style={{animationDuration: '10s'}}>
            <div className="w-6 h-6 bg-gradient-to-r from-purple-400/20 to-purple-600/20 rounded-full"></div>
          </div>
          <div className="absolute bottom-1/3 right-1/4 animate-float" style={{animationDuration: '12s', animationDelay: '3s'}}>
            <div className="w-8 h-8 border border-purple-300/30 rounded-full"></div>
          </div>
        </div>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, white 2px, transparent 2px),
            radial-gradient(circle at 80% 50%, white 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px, 60px 60px'
        }}></div>
        <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
          <ModernNav course={course} />
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                {course.course_name}
              </h1>
              {course.description && (
                <p className="text-lg text-gray-300 mb-4 leading-relaxed line-clamp-2">
                  {truncateDescription(course.description)}
                </p>
              )}
              {course.instructor && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-gray-400">Created by</span>
                  <span className="text-purple-300 hover:text-purple-200 cursor-pointer underline">
                    {course.instructor}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                {course.updated_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Last updated {new Date(course.updated_at).toLocaleDateString()}</span>
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
              <div className="aspect-video bg-black no-border-radius overflow-hidden -mx-4">
                {promoVideoPlayer}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(5px) rotate(-1deg); }
        }
        .animate-float {
          animation: float var(--animation-duration, 8s) ease-in-out infinite;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-1 py-4">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="relative hidden lg:block mb-4">
              <div className="absolute inset-y-0 left-0 w-10 bg-black/60 backdrop-blur-md z-10"></div>
              <div className="absolute inset-y-0 right-0 w-10 bg-black/60 backdrop-blur-md z-10"></div>
              <div className="aspect-video bg-black overflow-hidden relative z-20">
                {promoVideoPlayer}
              </div>
            </div>
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex bg-gray-50 rounded-t-lg">
                  <button
                    onClick={() => handleTabChange('overview')}
                    className={`py-3 px-6 text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'overview'
                        ? 'border-b-2 border-purple-600 text-purple-600 bg-white'
                        : 'text-gray-500 hover:text-purple-600 hover:bg-white'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => handleTabChange('curriculum')}
                    className={`py-3 px-6 text-sm font-semibold transition-all duration-300 ${
                      activeTab === 'curriculum'
                        ? 'border-b-2 border-purple-600 text-purple-600 bg-white'
                        : 'text-gray-500 hover:text-purple-600 hover:bg-white'
                    }`}
                  >
                    Curriculum
                  </button>
                </nav>
              </div>
              <div className="p-6 space-y-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {course.description && (
                      <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Course Description</h2>
                        <p className="text-gray-600 text-sm font-normal leading-relaxed">{course.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-600 text-sm font-normal leading-relaxed">
                        This is a Thugil Creation course where they teach silk saree designing and the tools learning.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">This course includes:</h3>
                      <div className="flex flex-wrap gap-3">
                        {totalDuration > 0 && (
                          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md">
                            <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                            <span className="text-sm text-gray-700 font-medium">
                              {formatDuration(totalDuration)} on-demand video
                            </span>
                          </div>
                        )}
                        {videos.length > 0 && (
                          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md">
                            <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="text-sm text-gray-700 font-medium">
                              {videos.length} {videos.length === 1 ? 'lecture' : 'lectures'}
                            </span>
                          </div>
                        )}
                        {course.downloadable_resources && (
                          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md">
                            <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-sm text-gray-700 font-medium">
                              {course.downloadable_resources} downloadable resources
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md">
                          <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-700 font-medium">Access on mobile and TV</span>
                        </div>
                        {course.subtitle_available && (
                          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md">
                            <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4v16a1 1 0 001 1h8a1 1 0 001-1V4M9 9h6M9 13h6" />
                            </svg>
                            <span className="text-sm text-gray-700 font-medium">
                              Closed captions ({course.subtitle_language || 'Available'})
                            </span>
                          </div>
                        )}
                        {course.certificate_available && (
                          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md">
                            <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            <span className="text-sm text-gray-700 font-medium">Certificate of completion</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'curriculum' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-extrabold text-gray-900">Course content</h2>
                        <p className="text-gray-600 text-sm font-normal mt-1">
                          {videos.length > 0 && `${videos.length} ${videos.length === 1 ? 'section' : 'sections'}`}
                          {totalDuration > 0 && ` • ${formatDuration(totalDuration)} total length`}
                        </p>
                      </div>
                      <button
                        onClick={() => setExpandedSections(videos.reduce((acc, v) => ({ ...acc, [v.id]: true }), {}))}
                        className="text-purple-600 text-sm font-semibold hover:text-purple-700 transition-colors"
                      >
                        Expand all sections
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="border-b border-gray-100">
                        <button
                          onClick={() => toggleSection('main')}
                          className="w-full p-4 text-left hover:bg-gray-50 transition-colors duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-base font-bold text-gray-900">{course.course_name}</h3>
                              <p className="text-sm text-gray-600 font-normal">
                                {videos.length} lectures • {formatDuration(totalDuration)}
                              </p>
                            </div>
                            <ChevronRight
                              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                                expandedSections.main ? 'rotate-90' : ''
                              }`}
                            />
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
                                <div className="p-4 flex items-center gap-4 hover:bg-gray-100 transition-colors duration-200">
                                  <Play className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-gray-900">{video.video_detail}</h4>
                                    <div className="flex items-center gap-4 text-xs text-gray-600 font-normal mt-1">
                                      <span>{formatDuration(video.video_duration_minutes)}</span>
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-600 font-normal">
                                    {String(Math.floor(video.video_duration_minutes)).padStart(2, '0')}:
                                    {String(Math.round((video.video_duration_minutes * 60) % 60)).padStart(2, '0')}
                                  </span>
                                </div>
                                {visibleVideos[video.id] && hoveredVideoId === video.id && video.is_preview && (
                                  <div className="p-4 bg-gray-50">
                                    <Plyr source={getPlyrSources(video)} options={getPlyrOptions()} ref={plyrRef} />
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
            <div className="w-full bg-white border-t-4 border-purple-600 p-8">
              <h2 className="text-3xl font-bold text-purple-800 mb-4">About Thugilc</h2>
              <p className="text-gray-800 text-base leading-relaxed">
                <strong>Thugilc</strong> is a purpose-built learning platform launched exclusively for the
                <span className="text-purple-700 font-semibold"> Silk Saree Designing Course</span>.
                This initiative celebrates the timeless heritage of Indian textile artistry, with a strong focus on preserving
                and promoting the intricate techniques of silk saree creation. From traditional weaving and dyeing to
                modern digital design applications, Thugilc offers a curated journey for learners, designers, and artisans.
                Whether you're an aspiring saree designer, a fashion enthusiast, or a heritage craft lover, this platform
                aims to bridge knowledge with creativity and culture.
              </p>
            </div>
          </div>
          <div className="w-full lg:w-80 xl:w-96">
            <div className="sticky top-4">
              <div className="bg-white border border-gray-200 no-border-radius overflow-hidden">
                <div className="p-4">
                  <div className="mb-2">
                    <img
                      src={course.thumbnail || "https://via.placeholder.com/320x180?text=Course+Thumbnail"}
                      alt="Course Thumbnail"
                      className="w-full h-auto object-cover no-border-radius"
                    />
                  </div>
                  {hasPurchased ? (
                    <>
                     {daysRemaining !== null && (
  <div className="flex justify-center mb-2">
    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-none bg-purple-100 text-purple-700 text-m font-medium">
      <Clock className="w-4 h-4" />
      <span>
        {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
        {formattedDate && ` (until ${formattedDate})`}
      </span>
    </div>
  </div>
)}

                      <div className="space-y-2 mb-4">
                        <button
                          onClick={handleButtonClick}
                          className="group relative w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white py-3 px-4 font-bold text-base transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/25 active:scale-[0.98] active:shadow-lg active:shadow-purple-600/40 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                          <div className="absolute inset-0 bg-white/20 scale-0 group-active:scale-110 transition-transform duration-200 ease-out"></div>
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-300/30 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-sm">
                            Start Learning
                          </span>
                          <div className="absolute inset-0 border-2 border-purple-400/0 group-hover:border-purple-400/50 transition-colors duration-300"></div>
                          <div className="absolute top-0 left-0 w-2 h-2 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="absolute top-0 right-0 w-2 h-2 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="absolute bottom-0 left-0 w-2 h-2 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="absolute bottom-0 right-0 w-2 h-2 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>
                      </div>
                      <div className="text-center mb-4">
                        <h4 className="font-semibold text-gray-900 mb-1">Subscribe to Thugil Creation's top courses</h4>
                        <p className="text-xs text-gray-600 mb-2">
                          Get this course, plus 32,000+ of our top-rated courses, with Personal Plan.
                        </p>
                        <button
                          disabled
                          className="w-full bg-gray-300 text-gray-600 py-2 px-3 font-bold no-border-radius cursor-not-allowed"
                        >
                          Start subscription
                        </button>
                        <div className="text-xs text-gray-500 mt-1">
                          Starting at ₹850 per month<br />
                          Cancel anytime
                        </div>
                      </div>
                      <div className="text-center mb-4">
                        <h4 className="font-semibold text-gray-900 mb-1">Scan to visit this course</h4>
                        <div className="flex justify-center">
                          <QRCodeSVG
                            value={courseUrl}
                            size={100}
                            level="M"
                            includeMargin={true}
                            bgColor="#ffffff"
                            fgColor="#000000"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 mb-2 text-purple-600 text-sm">
                        <div className="w-5 h-5 bg-purple-600 no-border-radius flex items-center justify-center">
                          <span className="text-white text-xs font-bold">P</span>
                        </div>
                        <span>This Premium course is included in plans</span>
                      </div>
                      <div className="mb-4">
                        {isDiscounted && discountPercentage > 0 ? (
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-bold text-gray-900">
                              ₹{finalPrice.toFixed(0)}
                            </span>
                            <span className="text-base text-gray-500 line-through">
                              ₹{course.price.toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-white bg-purple-600 px-2 py-1 no-border-radius">
                              {discountPercentage}% off
                            </span>
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-gray-900 mb-1">
                            ₹{finalPrice.toFixed(0)}
                          </div>
                        )}
                        {isDiscounted && discountPercentage > 0 && (
                          <div className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-none">
                            <Clock className="w-3 h-3" />
                            {course.offer_end && new Date(course.offer_end) > new Date() ? (
                              <span>Offer ends {new Date(course.offer_end).toLocaleDateString()}</span>
                            ) : (
                              <span>7 hours left at this price!</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 mb-4">
                        <button
                          onClick={handleButtonClick}
                          className="group relative w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white py-3 px-4 font-bold text-base transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/25 active:scale-[0.98] active:shadow-lg active:shadow-purple-600/40 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                          <div className="absolute inset-0 bg-white/20 scale-0 group-active:scale-110 transition-transform duration-200 ease-out"></div>
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-300/30 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-sm">
                            Buy Now
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-wallet-cards transition-all transform opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 group-active:scale-110 group-active:rotate-6 duration-300"
                            >
                              <rect width="18" height="18" x="3" y="3" rx="2" />
                              <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" />
                              <path d="M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21" />
                            </svg>
                          </span>
                          <div className="absolute inset-0 border-2 border-purple-400/0 group-hover:border-purple-400/50 transition-colors duration-300"></div>
                          <div className="absolute top-0 left-0 w-2 h-2 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="absolute top-0 right-0 w-2 h-2 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="absolute bottom-0 left-0 w-2 h-2 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="absolute bottom-0 right-0 w-2 h-2 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>
                      </div>
                      <div className="text-center mb-4">
                        <h4 className="font-semibold text-gray-900 mb-1">Subscribe to Thugil Creation's top courses</h4>
                        <p className="text-xs text-gray-600 mb-2">
                          Get this course, plus 32,000+ of our top-rated courses, with Personal Plan.
                        </p>
                        <button
                          disabled
                          className="w-full bg-gray-300 text-gray-600 py-2 px-3 font-bold no-border-radius cursor-not-allowed"
                        >
                          Start subscription
                        </button>
                        <div className="text-xs text-gray-500 mt-1">
                          Starting at ₹850 per month<br />
                          Cancel anytime
                        </div>
                      </div>
                      <div className="text-center mb-4">
                        <h4 className="font-semibold text-gray-900 mb-1">Scan to visit this course</h4>
                        <div className="flex justify-center">
                          <QRCodeSVG
                            value={courseUrl}
                            size={100}
                            level="M"
                            includeMargin={true}
                            bgColor="#ffffff"
                            fgColor="#000000"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}