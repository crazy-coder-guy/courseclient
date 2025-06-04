import React, { useEffect, useState } from 'react';
import CourseCard from '../components/CourseCard';
import './styles.css'; // Import the CSS file

export default function HomePage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/courses`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch courses');
        }
        const data = await response.json();
        setCourses(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <div className="min-h-screen bg-yellow-50 font-nunito-sans">
      {/* Hero Section */}
      <div className="bg-rose-900 border-b border-gray-200 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Large gradient orbs */}
          <div className="absolute w-96 h-96 rounded-full top-10 right-20 bg-gradient-to-r from-rose-900/20 to-yellow-50/10 animate-pulse"></div>
          <div className="absolute w-64 h-64 rounded-full top-40 right-80 bg-gradient-to-r from-rose-900/15 to-yellow-50/20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          {/* Floating geometric shapes */}
          <div className="absolute top-20 right-32 animate-bounce" style={{ animationDuration: '6s' }}>
            <div className="w-16 h-16 border-2 border-rose-900/30 transform rotate-45"></div>
          </div>
          <div className="absolute top-60 right-20 animate-bounce" style={{ animationDuration: '8s', animationDelay: '2s' }}>
            <div className="w-12 h-12 bg-gradient-to-br from-rose-900/20 to-yellow-50/20 rounded-full"></div>
          </div>
          <div className="absolute top-32 right-60 animate-pulse" style={{ animationDuration: '4s' }}>
            <div className="w-8 h-8 border border-rose-900/40 rotate-45 transform"></div>
          </div>
          {/* Spinning decorative elements */}
          <div className="absolute top-16 right-96 animate-spin" style={{ animationDuration: '20s' }}>
            <div className="w-24 h-24 border border-rose-900/20 rounded-full relative">
              <div className="absolute top-2 left-2 w-4 h-4 bg-rose-900/40 rounded-full"></div>
              <div className="absolute bottom-2 right-2 w-3 h-3 bg-rose-900/30 rounded-full"></div>
            </div>
          </div>
          {/* Silk thread inspired lines */}
          <div className="absolute top-0 right-40 w-px h-full bg-gradient-to-b from-transparent via-rose-900/20 to-transparent animate-pulse" style={{ animationDuration: '10s' }}></div>
          <div className="absolute top-0 right-72 w-px h-full bg-gradient-to-b from-transparent via-rose-900/15 to-transparent animate-pulse" style={{ animationDuration: '12s', animationDelay: '3s' }}></div>
          {/* Floating dots pattern */}
          <div className="absolute top-24 right-48">
            <div className="grid grid-cols-4 gap-4 opacity-20">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-rose-900 rounded-full animate-bounce"
                  style={{
                    animationDuration: '3s',
                    animationDelay: `${i * 0.2}s`
                  }}
                ></div>
              ))}
            </div>
          </div>
          {/* Decorative saree-inspired curves */}
          <div className="absolute top-20 right-16 opacity-10">
            <svg width="200" height="300" viewBox="0 0 200 300" className="animate-pulse" style={{ animationDuration: '6s' }}>
              <path d="M50 50 Q 150 100 50 150 Q 150 200 50 250" stroke="#FAF9F1" strokeWidth="2" fill="none" />
              <path d="M70 30 Q 170 80 70 130 Q 170 180 70 230" stroke="#FAF9F1" strokeWidth="1" fill="none" />
            </svg>
          </div>
          {/* Glowing particles */}
          <div className="absolute top-12 right-24 animate-ping" style={{ animationDuration: '4s' }}>
            <div className="w-1 h-1 bg-rose-900 rounded-full"></div>
          </div>
          <div className="absolute top-48 right-52 animate-ping" style={{ animationDuration: '6s', animationDelay: '1s' }}>
            <div className="w-1 h-1 bg-rose-900 rounded-full"></div>
          </div>
          <div className="absolute top-72 right-36 animate-ping" style={{ animationDuration: '5s', animationDelay: '2s' }}>
            <div className="w-1 h-1 bg-rose-900 rounded-full"></div>
          </div>
          {/* Animated border decoration */}
          <div className="absolute top-8 right-8 w-32 h-32 border-2 border-rose-900/20 rounded-lg animate-pulse transform rotate-12" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-8 right-12 w-24 h-24 border border-rose-900/15 rounded-full animate-spin" style={{ animationDuration: '15s' }}></div>
        </div>

        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, white 2px, transparent 2px),
            radial-gradient(circle at 80% 50%, white 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px, 60px 60px'
        }}></div>

        {/* Your existing content */}
        <div className="max-w-[1340px] mx-auto px-6 py-16 relative z-10">
          <div className="max-w-xl">
            <h1 className="text-5xl font-extrabold text-yellow-50 mb-4 leading-tight tracking-tight animate-fade-in">
              Welcome to Thugil Creation
            </h1>
            <p className="text-lg text-yellow-50 mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Master the art of Silk Saree Design with our expert-led video tutorials and workshops.
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 1s ease-out forwards;
          }
        `}</style>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-yellow-200">
        <div className="max-w-[1340px] mx-auto px-6">
          <div className="flex space-x-8 overflow-x-auto">
            <button
              className="py-4 px-2 text-sm font-medium whitespace-nowrap border-b-2 text-gray-600 border-transparent hover:text-rose-800 hover:border-yellow-300"
              onClick={() => {
                setShowDropdown(false);
              }}
            >
              Basics
            </button>
            <button
              className="py-4 px-2 text-sm font-medium whitespace-nowrap border-b-2 text-rose-900 border-rose-600"
              onClick={toggleDropdown}
            >
              Advanced
            </button>
          </div>
          {showDropdown && (
            <div className="mt-2">
              <div className="flex flex-col space-y-2">
                {[
                  'Designing Tools',
                  'Color Matching',
                  'Zari Work',
                  'Design Sketching',
                  'Thread Techniques',
                  'Embroidery',
                  'Traditional Motifs',
                ].map((category) => (
                  <button
                    key={category}
                    className="py-2 text-sm font-medium text-gray-600 hover:text-rose-800"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1340px] mx-auto px-6 py-10">
        {/* Section Header */}
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-rose-900 mb-3">
            Explore the World of Silk Saree Artistry
          </h2>
          <p className="text-rose-700 text-base">
            Learn age-old techniques from industry experts — from selecting the perfect silk to creating intricate zari patterns.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-600 mb-6 text-sm font-medium">Error: {error}</div>
        )}

        {/* Course Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 8 }).map((_, index) => (
                <CourseCard key={index} isLoading={true} />
              ))
            : courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
        </div>

        {/* Show More Button */}
        {!loading && courses.length > 0 && (
          <div className="mt-8 text-center">
            <button className="border border-rose-600 text-rose-600 hover:bg-rose-50 px-6 py-3 font-bold text-sm transition-colors">
              Show more courses
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        /* Ensure sharp edges by setting border-radius to 0 */
        .border,
        button {
          border-radius: 0 !important;
        }

        /* New custom colors */
        .bg-yellow-50 {
        }
        .bg-rose-900 {
          background-color: #561C24;
        }
        .text-yellow-50 {
          color: #FAF9F1;
        }
        .text-rose-900 {
          color: #561C24;
        }
        .border-yellow-50 {
          border-color: #FAF9F1;
        }
        .border-rose-900 {
          border-color: #561C24;
        }

        /* Replace previous purple styles */
        .hover\:bg-rose-800:hover {
          background-color: #4a161d;
        }
        .text-rose-800 {
          color: #4a161d;
        }
        .border-rose-800 {
          border-color: #4a161d;
        }

        /* Gray & red styles remain */
        .text-gray-900 {
          color: #1a202c;
        }
        .text-gray-600 {
          color: #4a5568;
        }
        .text-red-600 {
          color: #e53e3e;
        }

        /* Buttons and transitions */
        button {
          transition: all 0.2s ease-in-out;
        }
        button:focus {
          box-shadow: 0 0 0 3px rgba(86, 28, 36, 0.2); /* soft maroon glow */
        }
      `}</style>
    </div>
  );
}
