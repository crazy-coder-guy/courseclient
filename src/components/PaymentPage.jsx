import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function PaymentPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [course, setCourse] = useState(null);
  const [finalPrice, setFinalPrice] = useState(null);
  const [billingAddress, setBillingAddress] = useState('');

  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve, reject) => {
        if (window.Razorpay) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay script'));
        document.body.appendChild(script);
      });
    };

    const checkAuthAndFetchCourse = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate(`/signup?redirect=/courses/${courseId}/payment`);
        return;
      }

      try {
        await loadRazorpayScript();

        const [authResponse, courseResponse, priceResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/check`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}`),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}/price`),
        ]);

        if (!authResponse.ok) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate(`/signup?redirect=/courses/${courseId}/payment`);
          return;
        }

        if (!courseResponse.ok) {
          const errorData = await courseResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load course');
        }

        if (!priceResponse.ok) {
          const errorData = await priceResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load course price');
        }

        const courseData = await courseResponse.json();
        const priceData = await priceResponse.json();
        setCourse(courseData);
        setFinalPrice(priceData.finalPrice);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    checkAuthAndFetchCourse();
  }, [courseId, navigate]);

  const handlePayment = async () => {
    setError(null);
    setLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please sign in to proceed with payment');
      navigate(`/signup?redirect=/courses/${courseId}/payment`);
      setLoading(false);
      return;
    }

    if (!billingAddress) {
      setError('Please enter your billing address');
      setLoading(false);
      return;
    }

    if (!finalPrice || finalPrice <= 0) {
      setError('Invalid course price');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}/create-order`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ billingAddress }),
        }
      );

      const orderData = await response.json();
      if (!response.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'Thugil Creation',
        description: `Payment for course: ${course?.course_name || 'Unknown Course'}`,
        handler: async (response) => {
          try {
            const verifyResponse = await fetch(
              `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}/verify-payment`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            alert('Payment successful! You have enrolled in the course.');
            navigate(`/purchasedcourse/${courseId}`);
          } catch (err) {
            setError(`Payment verification failed: ${err.message}`);
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          email: localStorage.getItem('email') || '',
          name: localStorage.getItem('firstName') || '',
        },
        theme: {
          color: '#a435f0',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError(`Payment failed: ${response.error.description || 'Unknown error'}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white py-4 px-6 border-b">
          <div className="max-w-7xl mx-auto">
            <div className="h-8 bg-gray-200 animate-pulse w-1/4"></div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8">
                <div className="h-6 bg-gray-200 animate-pulse w-1/3 mb-6"></div>
                <div className="h-12 bg-gray-200 animate-pulse w-full"></div>
              </div>
              <div className="bg-white p-8">
                <div className="h-6 bg-gray-200 animate-pulse w-1/3 mb-6"></div>
                <div className="h-16 bg-gray-200 animate-pulse w-full"></div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white p-8 sticky top-4">
                <div className="h-6 bg-gray-200 animate-pulse w-1/3 mb-6"></div>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 animate-pulse w-1/3"></div>
                    <div className="h-4 bg-gray-200 animate-pulse w-1/4"></div>
                  </div>
                  <div className="h-14 bg-gray-200 animate-pulse w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white py-4 px-6 border-b">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="bg-red-50 border border-red-200 p-8 max-w-md w-full">
              <div className="text-center">
                <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-semibold text-red-900 mb-3">Something went wrong</h3>
                <p className="text-red-700 leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isDiscounted = course && finalPrice < course.price;
  const discountPercentage = isDiscounted
    ? Math.round(((course.price - finalPrice) / course.price) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header */}
      <div className="bg-white py-4 px-6 border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Checkout</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Billing Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Billing Address */}
            <div className="bg-white p-8 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Billing Address</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Enter your full billing address"
                  className="w-full border border-gray-300 px-4 py-3 text-gray-900 bg-white focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600 transition-colors"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white p-8 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Payment Method</h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <input
                    type="radio"
                    id="razorpay"
                    name="payment"
                    defaultChecked
                    className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500 mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="razorpay" className="text-base font-medium text-gray-900 block mb-3">
                      Credit/Debit Card, Net Banking, UPI & more
                    </label>
                    <div className="flex items-center space-x-3">
                      <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsNgW6FaeEe3QP2NMKcry5tSEINxi2Slv8og&s" alt="Visa" className="h-6" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                      <img src="https://images.icon-icons.com/2699/PNG/512/upi_logo_icon_169316.png" alt="UPI" className="h-6" />
                      <span className="text-sm text-gray-500 font-medium">& more</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white p-8 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Details</h2>
              <div className="border-b border-gray-200 pb-6 mb-6">
                <div className="flex space-x-4">
                  <img 
                    src={course?.thumbnail || "https://via.placeholder.com/120x68"} 
                    alt="Course thumbnail"
                    className="w-32 h-18 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 leading-tight">
                      {course?.course_name || 'Course Name'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      By <span className="font-medium">Thugil Creation</span>
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-orange-400">4.5</span>
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 text-orange-400 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">(1,234 ratings)</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-base text-gray-700">Original Price:</span>
                  <span className="text-base font-medium text-gray-900">₹{course?.price?.toLocaleString('en-IN') || '0'}</span>
                </div>
                {isDiscounted && (
                  <div className="flex justify-between items-center">
                    <span className="text-base text-gray-700">Discount:</span>
                    <span className="text-base font-medium text-green-600">-₹{(course.price - finalPrice).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <hr className="border-gray-200" />
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-gray-900">₹{finalPrice?.toLocaleString('en-IN') || '0'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 border border-gray-200 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Summary</h2>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between">
                  <span className="text-base text-gray-700">Original price:</span>
                  <span className="text-base font-medium text-gray-900">₹{course?.price?.toLocaleString('en-IN') || '0'}</span>
                </div>
                {isDiscounted && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-base text-gray-700">Discounts:</span>
                      <span className="text-base font-medium text-green-600">-₹{(course.price - finalPrice).toLocaleString('en-IN')}</span>
                    </div>
                    <hr className="border-gray-200" />
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-xl font-bold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-gray-900">₹{finalPrice?.toLocaleString('en-IN') || '0'}</span>
                </div>
              </div>
              
              {isDiscounted && (
                <div className="bg-purple-50 border border-purple-200 p-4 mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-bold text-purple-900">{discountPercentage}% off</span>
                  </div>
                  {course?.offer_end && new Date(course.offer_end) > new Date() && (
                    <p className="text-sm text-purple-700 font-medium">
                      Offer expires {new Date(course.offer_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 text-base transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Complete Payment'}
              </button>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 font-medium">30-Day Money-Back Guarantee</p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">This course includes:</h3>
                <div className="flex flex-wrap gap-3">
                  {course.downloadable_resources && (
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-sm text-gray-700">
                        {course.downloadable_resources} downloadable resources
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700">Access on mobile and TV</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4M7 4h10M7 4v16a1 1 0 001 1h8a1 1 0 001-1V4M9 9h6M9 13h6" />
                    </svg>
                    <span className="text-sm text-gray-700">Full lifetime access</span>
                  </div>
                  {course.subtitle_available && (
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4v16a1 1 0 001 1h8a1 1 0 001-1V4M9 9h6M9 13h6" />
                      </svg>
                      <span className="text-sm text-gray-700">
                        Closed captions ({course.subtitle_language || 'Available'})
                      </span>
                    </div>
                  )}
                  {course.certificate_available && (
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span className="text-sm text-gray-700">Certificate of completion</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Ensure sharp edges by setting border-radius to 0 */
        .border {
          border-radius: 0 !important;
        }
        input, select, button {
          border-radius: 0 !important;
        }
        /* Modernistic styling */
        .font-sans {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        .bg-gray-100 {
          background-color: #f7fafc;
        }
        .bg-white {
          background-color: #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .text-gray-900 {
          color: #1a202c;
        }
        .text-gray-700 {
          color: #4a5568;
        }
        .text-gray-600 {
          color: #718096;
        }
        .text-gray-500 {
          color: #a0aec0;
        }
        .text-purple-600 {
          color: #a435f0;
        }
        .text-purple-700 {
          color: #9f7aea;
        }
        .bg-purple-600 {
          background-color: #a435f0;
        }
        .hover\:bg-purple-700:hover {
          background-color: #9f7aea;
        }
        .text-green-600 {
          color: #2f855a;
        }
        .bg-purple-50 {
          background-color: #faf5ff;
        }
        .border-purple-200 {
          border-color: #e9d8fd;
        }
        .text-purple-900 {
          color: #553c9a;
        }
        .text-orange-400 {
          color: #f6ad55;
        }
        button {
          transition: all 0.2s ease-in-out;
        }
        input:focus, select:focus {
          box-shadow: 0 0 0 3px rgba(164, 53, 240, 0.1);
        }
      `}</style>
    </div>
  );
}

export default PaymentPage;