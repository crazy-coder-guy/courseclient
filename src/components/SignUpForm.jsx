import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function SignUpForm() {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    newsletter: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const redirectUrl = query.get('redirect') || '/courses';

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/check`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.ok) {
            navigate(redirectUrl, { replace: true });
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setError('Your session has expired. Please sign in again.');
          }
        } catch (err) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setError('Network error. Please try again.');
        }
      }
    };

    checkAuth();
  }, [navigate, redirectUrl]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = () => {
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    if (!isLogin && (!formData.firstName || !formData.lastName)) {
      setError('First name and last name are required for sign-up.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;

    setLoading(true);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const url = isLogin ? `${BASE_URL}/api/auth/signin` : `${BASE_URL}/api/auth/signup`;

      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : {
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            newsletter: formData.newsletter,
          };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('email', data.user.email);
      localStorage.setItem('firstName', data.user.first_name || '');
      localStorage.setItem('lastName', data.user.last_name || '');

      navigate(redirectUrl, { replace: true });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Left Side - Image/Illustration */}
        <div className="hidden lg:flex lg:w-1/2 bg-gray-50 items-center justify-center p-12">
          <div className="max-w-md text-center">
            <div className="w-64 h-64 mx-auto mb-8 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Learn silk saree craftsmanship
            </h2>
            <p className="text-gray-600">
              Master the traditional art of silk saree making with our comprehensive courses and expert guidance.
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {isLogin ? 'Log in to your account' : 'Sign up and start learning'}
              </h2>
            </div>

            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-3 py-3 border border-gray-400 rounded-sm focus:outline-none focus:border-gray-900 text-gray-900 placeholder-gray-500"
                      required={!isLogin}
                      aria-required={!isLogin}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-3 border border-gray-400 rounded-sm focus:outline-none focus:border-gray-900 text-gray-900 placeholder-gray-500"
                      required={!isLogin}
                      aria-required={!isLogin}
                    />
                  </div>
                </div>
              )}
              
              <div>
                <input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-gray-400 rounded-sm focus:outline-none focus:border-gray-900 text-gray-900 placeholder-gray-500"
                  required
                  aria-required="true"
                />
              </div>
              
              <div>
                <input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-gray-400 rounded-sm focus:outline-none focus:border-gray-900 text-gray-900 placeholder-gray-500"
                  required
                  aria-required="true"
                />
              </div>

              {!isLogin && (
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    name="newsletter"
                    id="newsletter"
                    checked={formData.newsletter}
                    onChange={handleChange}
                    className="mt-1 mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    aria-label="Subscribe to newsletter"
                  />
                  <label htmlFor="newsletter" className="text-sm text-gray-600 cursor-pointer">
                    Send me special offers, personalized recommendations, and learning tips.
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-purple-600 text-white font-bold rounded-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-busy={loading}
              >
                {loading ? 'Please wait...' : isLogin ? 'Log in' : 'Sign up'}
              </button>

              {!isLogin && (
                <p className="text-xs text-gray-500 text-center leading-relaxed">
                  By signing up, you agree to our{' '}
                  <a href="#" className="text-purple-600 underline">Terms of Use</a>{' '}
                  and{' '}
                  <a href="#" className="text-purple-600 underline">Privacy Policy</a>.
                </p>
              )}
            </form>

            <div className="text-center mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  className="text-purple-600 font-bold underline hover:text-purple-700 transition-colors"
                  aria-label={isLogin ? 'Switch to sign-up' : 'Switch to sign-in'}
                >
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpForm;