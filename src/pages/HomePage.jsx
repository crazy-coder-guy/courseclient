import React, { useEffect, useState } from 'react';
import CourseCard from '../components/CourseCard';

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
      <div className="bg-purple-900 border-b border-gray-200">
        <div className="max-w-[1340px] mx-auto px-6 py-16">
          <div className="max-w-xl">
            <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
              Welcome to Thugil Creation
            </h1>
            <p className="text-lg text-purple-200 mb-6">
              Master the art of Silk Saree Design with our expert-led video tutorials and workshops.
            </p>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 font-semibold text-sm transition-colors">
              Start Learning
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1340px] mx-auto px-6">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              'Handloom Weaving',
              'Color Matching',
              'Zari Work',
              'Design Sketching',
              'Thread Techniques',
              'Blouse Stitching',
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Explore the World of Silk Saree Artistry
          </h2>
          <p className="text-gray-600 text-sm">
            Learn age-old techniques from industry experts — from selecting the perfect silk to creating intricate zari patterns.
          </p>
        </div>

        {/* Explore Button */}
        <div className="mb-8">
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 font-bold text-sm transition-colors">
            View All Courses
          </button>
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