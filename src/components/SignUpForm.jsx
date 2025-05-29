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

      if (isLogin) {
        navigate(redirectUrl, { replace: true });
      } else {
        // After signup, redirect to courses or stay on login
        navigate(redirectUrl, { replace: true });
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const accessProtectedRoute = async () => {
    setError(null);
    setLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please sign in to access this resource');
      setLoading(false);
      return;
    }

    try {
      // Example protected route; replace with actual endpoint if needed
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/courses`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        if (data.error.includes('expired')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('email');
          localStorage.removeItem('firstName');
          localStorage.removeItem('lastName');
          setError('Your session has expired. Please sign in again.');
        } else {
          setError(data.error || 'Failed to access protected route');
        }
      } else {
        console.log('Protected data:', data);
        setError('Successfully accessed protected route!');
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-100 to-gray-200"
      role="main"
      aria-label="Sign-up or Sign-in page"
    >
      <div className="flex w-full max-w-6xl items-center justify-center">
        <div className="hidden lg:flex lg:w-1/2 px-8">
          <div className="max-w-lg">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Welcome to <br />
              <span className="text-blue-600" style={{ fontFamily: "'Playfair Display', serif" }}>
                Thugil Creation
              </span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Discover the art of silk sarees and master the tools of the trade with our exclusive learning platform.
            </p>
          </div>
        </div>
        <div className="w-full lg:w-1/2 max-w-md">
          <div className="bg-white/90 backdrop-blur-sm p-8 border border-white/20 rounded-2xl shadow-lg">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-3">
                {isLogin ? 'Welcome Back' : 'Join Our Community'}
              </h2>
              <p className="text-gray-500 text-sm">
                {isLogin
                  ? 'Sign in to continue your learning journey'
                  : 'Create an account to access exclusive content'}
              </p>
            </div>
            {error && (
              <div
                className="bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-sm"
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
                    <label htmlFor="firstName" className="sr-only">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 placeholder-gray-400"
                      required={!isLogin}
                      aria-required={!isLogin}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="sr-only">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 placeholder-gray-400"
                      required={!isLogin}
                      aria-required={!isLogin}
                    />
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 placeholder-gray-400"
                  required
                  aria-required="true"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 placeholder-gray-400"
                  required
                  aria-required="true"
                />
              </div>
              {!isLogin && (
                <div className="flex items-center justify-center">
                  <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      name="newsletter"
                      checked={formData.newsletter}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      aria-label="Subscribe to newsletter"
                    />
                    Subscribe to our newsletter
                  </label>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-600 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
                aria-busy={loading}
              >
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
              </button>
              <div className="text-center">
                <p className="text-gray-500 text-sm">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError(null);
                    }}
                    className="text-purple-600 font-medium hover:text-purple-700 transition-colors duration-200"
                    aria-label={isLogin ? 'Switch to sign-up' : 'Switch to sign-in'}
                  >
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </form>
            <button
              onClick={accessProtectedRoute}
              disabled={loading}
              className="mt-4 w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-all duration-200 disabled:opacity-50"
              aria-busy={loading}
            >
              Test Protected Route
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpForm;