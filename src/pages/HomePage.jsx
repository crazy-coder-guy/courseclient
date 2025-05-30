import React, { useEffect, useState } from 'react';
import CourseCard from '../components/CourseCard';
import './styles.css'; // Import the CSS file
export default function HomePage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div className="min-h-screen bg-gray-100 font-nunito-sans">
      {/* Hero Section */}
       <div className="bg-purple-900 border-b border-gray-200 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Large gradient orbs */}
        <div className="absolute w-96 h-96 rounded-full top-10 right-20 bg-gradient-to-r from-purple-500/20 to-purple-600/10 animate-pulse"></div>
        <div className="absolute w-64 h-64 rounded-full top-40 right-80 bg-gradient-to-r from-purple-400/15 to-purple-700/20 animate-pulse" style={{animationDelay: '2s'}}></div>
        
        {/* Floating geometric shapes */}
        <div className="absolute top-20 right-32 animate-bounce" style={{animationDuration: '6s'}}>
          <div className="w-16 h-16 border-2 border-purple-300/30 transform rotate-45"></div>
        </div>
        
        <div className="absolute top-60 right-20 animate-bounce" style={{animationDuration: '8s', animationDelay: '2s'}}>
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-full"></div>
        </div>
        
        <div className="absolute top-32 right-60 animate-pulse" style={{animationDuration: '4s'}}>
          <div className="w-8 h-8 border border-purple-200/40 rotate-45 transform"></div>
        </div>
        
        {/* Spinning decorative elements */}
        <div className="absolute top-16 right-96 animate-spin" style={{animationDuration: '20s'}}>
          <div className="w-24 h-24 border border-purple-300/20 rounded-full relative">
            <div className="absolute top-2 left-2 w-4 h-4 bg-purple-400/40 rounded-full"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 bg-purple-300/30 rounded-full"></div>
          </div>
        </div>
        
        {/* Silk thread inspired lines */}
        <div className="absolute top-0 right-40 w-px h-full bg-gradient-to-b from-transparent via-purple-300/20 to-transparent animate-pulse" style={{animationDuration: '10s'}}></div>
        <div className="absolute top-0 right-72 w-px h-full bg-gradient-to-b from-transparent via-purple-400/15 to-transparent animate-pulse" style={{animationDuration: '12s', animationDelay: '3s'}}></div>
        
        {/* Floating dots pattern */}
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
        
        {/* Decorative saree-inspired curves */}
        <div className="absolute top-20 right-16 opacity-10">
          <svg width="200" height="300" viewBox="0 0 200 300" className="animate-pulse" style={{animationDuration: '6s'}}>
            <path d="M50 50 Q 150 100 50 150 Q 150 200 50 250" stroke="rgb(196 181 253)" strokeWidth="2" fill="none" />
            <path d="M70 30 Q 170 80 70 130 Q 170 180 70 230" stroke="rgb(196 181 253)" strokeWidth="1" fill="none" />
          </svg>
        </div>
        
        {/* Glowing particles */}
        <div className="absolute top-12 right-24 animate-ping" style={{animationDuration: '4s'}}>
          <div className="w-1 h-1 bg-purple-300 rounded-full"></div>
        </div>
        <div className="absolute top-48 right-52 animate-ping" style={{animationDuration: '6s', animationDelay: '1s'}}>
          <div className="w-1 h-1 bg-purple-300 rounded-full"></div>
        </div>
        <div className="absolute top-72 right-36 animate-ping" style={{animationDuration: '5s', animationDelay: '2s'}}>
          <div className="w-1 h-1 bg-purple-300 rounded-full"></div>
        </div>
        
        {/* Animated border decoration */}
        <div className="absolute top-8 right-8 w-32 h-32 border-2 border-purple-300/20 rounded-lg animate-pulse transform rotate-12" style={{animationDuration: '8s'}}></div>
        <div className="absolute bottom-8 right-12 w-24 h-24 border border-purple-400/15 rounded-full animate-spin" style={{animationDuration: '15s'}}></div>
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
          <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight animate-fade-in">
            Welcome to Thugil Creation
          </h1>
          <p className="text-lg text-purple-200 mb-6 animate-fade-in" style={{animationDelay: '0.2s'}}>
            Master the art of Silk Saree Design with our expert-led video tutorials and workshops.
          </p>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 font-semibold text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in" style={{animationDelay: '0.4s'}}>
            Start Learning
          </button>
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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1340px] mx-auto px-6">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              'Desigining Tools',
              'Color Matching',
              'Zari Work',
              'Design Sketching',
              'Thread Techniques',
              'Embroidery',
              'Traditional Motifs',
            ].map((category, index) => (
              <button
                key={category}
                className={`py-4 px-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  index === 0
                    ? 'text-purple-900 border-purple-600'
                    : 'text-gray-600 border-transparent hover:text-purple-800 hover:border-purple-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1340px] mx-auto px-6 py-10">
        {/* Section Header */}
    <div className="mb-6 text-center">
  <h2 className="text-3xl font-bold text-gray-900 mb-3">
    Explore the World of Silk Saree Artistry
  </h2>
  <p className="text-gray-700 text-base">
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
            <button className="border border-purple-600 text-purple-600 hover:bg-purple-50 px-6 py-3 font-bold text-sm transition-colors">
              Show more courses
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        /* Apply Nunito Sans as fallback font */
        .font-nunito-sans {
          font-family: 'Nunito Sans', sans-serif;
        }

        /* Ensure sharp edges by setting border-radius to 0 */
        .border,
        button {
          border-radius: 0 !important;
        }

        /* Modernistic styling */
        .bg-gray-100 {
          background-color: #f7fafc;
        }
        .bg-white {
          background-color: #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .bg-purple-900 {
          background-color: #3c1a6b;
        }
        .bg-purple-600 {
          background-color: #a435f0;
        }
        .hover\:bg-purple-700:hover {
          background-color: #9f7aea;
        }
        .text-purple-600 {
          color: #a435f0;
        }
        .text-purple-200 {
          color: #e9d8fd;
        }
        .text-purple-800 {
          color: #6b46c1;
        }
        .border-purple-600 {
          border-color: #a435f0;
        }
        .border-purple-200 {
          border-color: #e9d8fd;
        }
        .text-gray-900 {
          color: #1a202c;
        }
        .text-gray-600 {
          color: #4a5568;
        }
        .text-red-600 {
          color: #e53e3e;
        }
        .hover\:bg-purple-50:hover {
          background-color: #faf5ff;
        }
        button {
          transition: all 0.2s ease-in-out;
        }
        button:focus {
          box-shadow: 0 0 0 3px rgba(164, 53, 240, 0.1);
        }
      `}</style>
    </div>
  );
}