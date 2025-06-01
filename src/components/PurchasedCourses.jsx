import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PurchasedCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPurchasedCourses = async () => {
      try {
        // Get JWT token from localStorage (assuming it's stored there after login)
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please log in to view your purchased courses.');
          setLoading(false);
          return;
        }

        // Fetch purchased courses by querying the purchases table and joining with courses
        const { data } = await axios.get('http://localhost:5000/api/courses', {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Filter courses where the user has a completed purchase
        const purchasedCourses = await Promise.all(
          data.map(async (course) => {
            try {
              const response = await axios.get(
                `http://localhost:5000/api/courses/${course.id}/purchase-status`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (response.data.hasPurchased) {
                return course;
              }
              return null;
            } catch (err) {
              console.error(`Error checking purchase status for course ${course.id}:`, err);
              return null;
            }
          })
        );

        // Filter out null values (courses not purchased)
        const validCourses = purchasedCourses.filter((course) => course !== null);
        setCourses(validCourses);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching purchased courses:', err);
        setError('Failed to load purchased courses. Please try again later.');
        setLoading(false);
      }
    };

    fetchPurchasedCourses();
  }, []);

  const handleCourseClick = (courseId) => {
    navigate(`/courses/${courseId}/learn`);
  };

  if (loading) {
    return (
        <div className='bg-yellow-50'>
      <div className="container mx-auto p-4 max-w-7xl">
        <h1 className="text-3xl font-bold mb-6 text-red-950">My Purchased Courses</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Skeleton Loader for 3 cards as a placeholder */}
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="bg-rose-200 shadow-md overflow-hidden animate-pulse"
            >
              <div className="w-full h-48 bg-rose-200"></div>
              <div className="p-4">
                <div className="h-6 bg-rose-200 rounded mb-2"></div>
                <div className="h-4 bg-rose-200 rounded mb-2"></div>
                <div className="h-4 bg-rosse-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-50 border border-gray-400 text-red-950 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-yellow-50'>
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6 text-red-950">My Purchased Courses</h1>
      {courses.length === 0 ? (
        <p className="text-red-950 text-lg">You haven't purchased any courses yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              onClick={() => handleCourseClick(course.id)}
              className="bg-yellow-50  shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
            >
              <img
                src={course.thumbnail}
                alt={course.course_name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h2 className="text-xl font-semibold text-red-950 mb-2">{course.course_name}</h2>
                <p className="text-red-950 mb-2">Instructor: {course.instructor}</p>
                <p className="text-red-950 text-sm">{course.description.substring(0, 100)}...</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
};

export default PurchasedCourses;