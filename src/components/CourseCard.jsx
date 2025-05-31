import React, { useState, useEffect, useRef } from 'react';
import { Star, Clock, PlayCircle, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './styles.css';

export default function CourseCard({ course, isLoading = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);
  const navigate = useNavigate();

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  // Intersection Observer to trigger fade-up effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target); // Stop observing once visible
        }
      },
      { threshold: 0.1 } // Trigger when 10% of the card is visible
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  // Calculate final price based on API logic
  const calculateFinalPrice = () => {
    if (!course || !course.price) {
      return null;
    }

    let finalPrice = parseFloat(course.price) || 0;
    const now = new Date();
    const offerStart = course.offer_start ? new Date(course.offer_start) : null;
    const offerEnd = course.offer_end ? new Date(course.offer_end) : null;
    const offerDiscount = parseFloat(course.offer_discount) || 0;

    const isOfferActive =
      offerStart &&
      offerEnd &&
      now >= offerStart &&
      now <= offerEnd &&
      !isNaN(offerDiscount) &&
      offerDiscount > 0;

    if (isOfferActive) {
      finalPrice = finalPrice * (1 - offerDiscount / 100);
    }

    return isNaN(finalPrice) || finalPrice <= 0 ? null : finalPrice;
  };

  const finalPrice = calculateFinalPrice();

  if (isLoading || !course) {
    return (
    <div className="bg-yellow-50 border border-gray-200 rounded overflow-hidden">
  <div className="aspect-video bg-rose-200 animate-pulse"></div>
  <div className="p-3 space-y-2">
    <div className="h-4 bg-rose-200 rounded w-full animate-pulse"></div>
    <div className="h-3 bg-rose-200 rounded w-3/4 animate-pulse"></div>
    <div className="flex items-center space-x-2">
      <div className="h-2.5 w-8 bg-rose-200 rounded animate-pulse"></div>
      <div className="h-2.5 w-12 bg-rose-200 rounded animate-pulse"></div>
    </div>
  </div>
</div>

    );
  }

  return (
    <div
      ref={cardRef}
       className={`group bg-yellow-50 border border-gray-200 rounded overflow-hidden hover:shadow-md transition-all cursor-pointer text-rose-900 ${
    isVisible ? 'animate-fade-up' : 'opacity-0'
  }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => navigate(`/course/${course.id}`)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.course_name || 'Course'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src =
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjEzNSIgdmlld0JveD0iMCAwIDI0MCAxMzUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0MCIgaGVpZ2h0PSIxMzUiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNOTYgNjdMMTQ0IDQyVjkzSDk2IDY3WiIgZmlsbD0iIjlDOUNBMyIvPjwvc3ZnPg==';
            }}
          />
        ) : (
         <div className="w-full h-full bg-gray-100 flex items-center justify-center text-rose-900 text-xs">
            No preview
          </div>
        )}

        {/* Play Hover */}
       <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all">
  <PlayCircle
    className="w-10 h-10 text-rose-900 opacity-0 group-hover:opacity-100 transition-opacity"
    style={{ minWidth: '40px', minHeight: '40px' }}
  />
</div>


        {/* Wishlist Icon */}
   <button
  onClick={(e) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  }}
  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white shadow transition"
>
  <Heart
    className={`w-4 h-4 ${isWishlisted ? 'text-rose-900 fill-current' : 'text-rose-400'}`}
    style={{ minWidth: '16px', minHeight: '16px' }}
  />
</button>


        {/* Badge */}
     {course.bestseller && (
  <div className="absolute top-2 left-2 bg-yellow-50 text-[10px] font-semibold px-1.5 py-0.5 text-rose-900 rounded-sm shadow">
    Bestseller
  </div>
)}

      </div>

      {/* Content */}
      <div className="p-3">
  <h3 className="text-sm font-semibold text-rose-900 line-clamp-2 group-hover:text-rose-700 transition">
    {course.course_name || 'Untitled Course'}
  </h3>
  <p className="text-xs text-rose-900 mb-2 line-clamp-1">
    {course.description || 'An immersive silk design course.'}
  </p>

  {/* Price and Duration in One Row */}
  <div className="flex justify-between items-center mb-2">
    <div className="flex items-center space-x-2">
      <span className="text-sm font-bold text-rose-900 bg-yellow-50 px-2 py-1 rounded">
        ₹{finalPrice ? finalPrice.toLocaleString('en-IN') : 'N/A'}
      </span>
      {course.price && finalPrice && finalPrice < parseFloat(course.price) && (
        <span className="text-[12px] text-gray-500 line-through">
          ₹{parseFloat(course.price).toLocaleString('en-IN')}
        </span>
      )}
    </div>

    {course.duration_hours && (
      <span className="text-sm text-gray-500 font-semibold whitespace-nowrap">
        {course.duration_hours} hours
      </span>
    )}
  </div>

  {/* Course meta */}
  <div className="flex flex-wrap text-[10px] text-gray-500 items-center gap-1">
    {course.lectures && <span>• {course.lectures} lectures</span>}
    {course.level && <span>• {course.level}</span>}
  </div>
</div>

    </div>
  );
}