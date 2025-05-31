import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';

function PaymentPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [course, setCourse] = useState(null);
  const [billingAddress, setBillingAddress] = useState('');
  const [isCancelled, setIsCancelled] = useState(false);
  const billingAddressRef = useRef(null);

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

        const [authResponse, courseResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/check`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses/${courseId}`),
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

        const courseData = await courseResponse.json();
        setCourse(courseData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    checkAuthAndFetchCourse();
  }, [courseId, navigate, isCancelled]);

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
      billingAddressRef.current?.scrollIntoView({ behavior: 'smooth' });
      setLoading(false);
      return;
    }

    if (billingAddress.length < 15) {
      setError('Billing address must be at least 15 characters long');
      billingAddressRef.current?.scrollIntoView({ behavior: 'smooth' });
      setLoading(false);
      return;
    }

    const finalPrice = calculateFinalPrice();
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
            // Replace the current history entry with CourseDetails page
            navigate(`/course/${courseId}`, { replace: true });
            // Then navigate to CourseLearn page
            navigate(`/courses/${courseId}/learn`);
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
          color: '#4c1d95',
        },
        modal: {
          ondismiss: () => {
            setIsCancelled(true);
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError(`Payment failed: ${response.error.description || 'Unknown error'}`);
        setIsCancelled(true);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDismissError = () => {
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-14 h-14 border-4 border-t-dark-purple-900 border-gray-200 rounded-full"
        />
      </div>
    );
  }

  if (error && !billingAddress) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-gradient-to-b from-gray-50 to-white"
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-extrabold text-dark-purple-900 mb-4">Checkout</h1>
          <div className="flex items-center justify-center min-h-96">
            <div className="bg-red-50 border border-red-200 p-4 max-w-md w-full relative">
              <div className="text-center">
                <svg className="w-14 h-14 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-red-900 mb-2">Something went wrong</h3>
                <p className="text-base text-red-700 leading-relaxed font-medium">{error}</p>
                <button
                  onClick={handleDismissError}
                  className="mt-4 text-base text-red-600 hover:text-red-800 font-semibold"
                >
                  Dismiss
                </button>
              </div>
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-red-200"></div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const finalPrice = calculateFinalPrice();
  const isDiscounted = course && finalPrice < course.price;
  const discountPercentage = isDiscounted
    ? Math.round(((course.price - finalPrice) / course.price) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-white"
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h1 className="text-3xl font-extrabold text-dark-purple-900 mb-4">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 space-y-4">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-gray-200"
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-xl font-bold text-dark-purple-900">Billing Information</h2>
              </div>
              <div className="px-4 py-4">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 20, opacity: 0 }}
                      className="mb-4 bg-red-50 border border-red-200 p-3 text-base text-red-700 font-medium flex justify-between items-center"
                    >
                      <span>{error}</span>
                      <button onClick={handleDismissError} className="text-red-600 hover:text-red-800 font-semibold">
                        ×
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-base font-semibold text-dark-purple-900 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter first name"
                      defaultValue={localStorage.getItem('firstName') || ''}
                      className="w-full border border-gray-300 px-3 py-2 text-base text-gray-900 bg-white focus:outline-none focus:border-dark-purple-900 focus:ring-1 focus:ring-dark-purple-900 transition-all font-medium"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-base font-semibold text-dark-purple-900 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter last name"
                      defaultValue={localStorage.getItem('lastName') || ''}
                      className="w-full border border-gray-300 px-3 py-2 text-base text-gray-900 bg-white focus:outline-none focus:border-dark-purple-900 focus:ring-1 focus:ring-dark-purple-900 transition-all font-medium"
                    />
                  </div>
                  <div className="md:col-span-2 relative">
                    <label className="block text-base font-semibold text-dark-purple-900 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="Enter email address"
                      defaultValue={localStorage.getItem('email') || ''}
                      className="w-full border border-gray-300 px-3 py-2 text-base text-gray-900 bg-white focus:outline-none focus:border-dark-purple-900 focus:ring-1 focus:ring-dark-purple-900 transition-all font-medium"
                    />
                  </div>
                  <div className="md:col-span-2 relative">
                    <label className="block text-base font-semibold text-dark-purple-900 mb-1">
                      Billing Address * (Minimum 15 characters)
                    </label>
                    <textarea
                      ref={billingAddressRef}
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      placeholder="Enter your complete billing address (minimum 15 characters)"
                      rows={3}
                      className={`w-full border ${error && (billingAddress.length < 15 || !billingAddress) ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-base text-gray-900 bg-white focus:outline-none focus:border-dark-purple-900 focus:ring-1 focus:ring-dark-purple-900 transition-all resize-none font-medium`}
                    />
                    {error && (billingAddress.length < 15 || !billingAddress) && (
                      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-red-500"></div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white border border-gray-200 p-4"
            >
              <h2 className="text-xl font-bold text-dark-purple-900 mb-4">Why Choose This Course?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Expert Instructors', desc: 'Learn from industry leaders with years of experience.' },
                  { title: 'Flexible Learning', desc: 'Study at your own pace, anytime, anywhere.' },
                  { title: 'Practical Projects', desc: 'Apply your skills with hands-on projects.' },
                  { title: 'Community Support', desc: 'Join a vibrant learner community.'}
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    className="p-3 bg-gray-50 border border-gray-200"
                  >
                    <h3 className="text-base font-bold text-dark-purple-900">{item.title}</h3>
                    <p className="text-sm text-gray-600 font-medium">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-2">
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-gray-200 sticky top-24"
            >
              <div className="p-4 border-b border-gray-100">
                <div className="flex space-x-3">
                  <motion.img
                    whileHover={{ scale: 1.1 }}
                    src={course?.thumbnail || 'https://via.placeholder.com/120x68'}
                    alt="Course thumbnail"
                    className="w-24 h-14 object-cover border border-gray-200 cursor-pointer"
                    onClick={() => alert('Course preview coming soon!')}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-dark-purple-900 mb-1 leading-tight">
                      {course?.course_name || 'Course Name'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1 font-medium">
                      By <span className="font-semibold">Thugil Creation</span>
                    </p>
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-0.5">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500 font-medium">4.8 (2,847)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-b border-gray-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-base text-gray-700 font-medium">Original Price:</span>
                    <span className="text-base font-semibold text-dark-purple-900">₹{course?.price?.toLocaleString('en-IN') || '0'}</span>
                  </div>
                  {isDiscounted && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-between items-center"
                    >
                      <span className="text-base text-gray-700 font-medium">Discount ({discountPercentage}% off):</span>
                      <span className="text-base font-semibold text-green-600">-₹{(course.price - finalPrice).toLocaleString('en-IN')}</span>
                    </motion.div>
                  )}
                  {isDiscounted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                      className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-2 py-1"
                    >
                      {discountPercentage}% Off - Limited Offer!
                    </motion.div>
                  )}
                  <hr className="border-gray-200" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-dark-purple-900">Total:</span>
                    <span className="text-lg font-extrabold text-dark-purple-900">₹{finalPrice?.toLocaleString('en-IN') || '0'}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">This course includes:</h3>
                  <div className="flex flex-wrap gap-3">
                    {course.downloadable_resources && (
                      <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-800 px-4 py-2 rounded-full shadow-sm">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-sm font-medium">
                          {course.downloadable_resources} downloadable resources
                        </span>
                      </div>
                    )}
                    <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-800 px-4 py-2 rounded-full shadow-sm">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">Access on mobile and TV</span>
                    </div>
                    {course.subtitle_available && (
                      <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-800 px-4 py-2 rounded-full shadow-sm">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4v16a1 1 0 001 1h8a1 1 0 001-1V4M9 9h6M9 13h6" />
                        </svg>
                        <span className="text-sm font-medium">
                          Closed captions ({course.subtitle_language || 'Available'})
                        </span>
                      </div>
                    )}
                    {course.certificate_available && (
                      <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-800 px-4 py-2 rounded-full shadow-sm">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span className="text-sm font-medium">Certificate of completion</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="p-4 border-b border-gray-100"
              >
                <div className="bg-dark-purple-50 border border-dark-purple-200 p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <svg className="w-5 h-5 text-dark-purple-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-extrabold text-base text-dark-purple-900">Secure Payment</span>
                  </div>
                  <p className="text-base text-dark-purple-700 font-medium">
                    Your payment is protected with Razorpay's secure gateway.
                  </p>
                </div>
              </motion.div>

              <div className="p-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full bg-dark-purple-900 text-white font-bold py-3 text-base hover:bg-dark-purple-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing Payment...' : 'Complete Payment'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row bg-white rounded-lg overflow-hidden p-6 md:p-8 gap-6">
          <div className="w-full md:w-1/2">
            <img
              src="https://cdn.venngage.com/template/thumbnail/full/d793fea5-7d9c-4cdf-a438-69ea99c696b3.webp"
              alt="Certificate Preview"
              className="w-full h-auto object-cover rounded-md shadow-sm"
            />
          </div>
          <div className="w-full md:w-1/2 flex flex-col justify-center text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Industry-Recognized Certificate
            </h2>
            <p className="text-gray-600 text-base leading-relaxed">
              Upon successful completion of this course, you’ll receive a verifiable certificate that demonstrates your skills and commitment to professional growth. Perfect for showcasing on LinkedIn or including in your resume.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        * {
          border-radius: 0 !important;
        }

        input:focus,
        textarea:focus,
        select:focus {
          box-shadow: 0 0 0 1px #4c1d95;
          outline: none;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        input,
        textarea,
        button {
          transition: all 0.2s ease-in-out;
        }

        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: #f3f4f6;
        }

        ::-webkit-scrollbar-thumb {
          background: #d1d5db;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        .bg-dark-purple-900 {
          background-color: #4c1d95;
        }
        .hover\:bg-dark-purple-800:hover {
          background-color: #5b21b6;
        }
        .focus\:border-dark-purple-900 {
          border-color: #4c1d95;
        }
        .focus\:ring-dark-purple-900 {
          --tw-ring-color: #4c1d95;
        }
        .text-dark-purple-900 {
          color: #4c1d95;
        }
        .bg-dark-purple-50 {
          background-color: #f5f3ff;
        }
        .border-dark-purple-200 {
          border-color: #ddd6fe;
        }
        .text-dark-purple-700 {
          color: #6d28d9;
        }
      `}</style>
    </motion.div>
  );
}

export default PaymentPage;