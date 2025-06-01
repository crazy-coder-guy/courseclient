// Enhanced apiFetch with mobile browser support
export const apiFetch = async (url, options = {}) => {
  const BASE_URL = import.meta.env.VITE_API_URL;

  console.log(`[${new Date().toISOString()}] VITE_API_URL: ${BASE_URL}`);

  if (!BASE_URL) {
    console.error(`[${new Date().toISOString()}] VITE_API_URL is not defined`);
    throw new Error('API URL is not configured. Please check your environment variables.');
  }

  // Enhanced token retrieval with fallback
  const getToken = () => {
    try {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    } catch (e) {
      console.warn(`[${new Date().toISOString()}] Storage access failed:`, e.message);
      return null;
    }
  };

  const token = getToken();
  
  // Enhanced headers for mobile compatibility
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const fullUrl = url.startsWith('http')
    ? url
    : `${BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;

  console.log(`[${new Date().toISOString()}] Making request to ${fullUrl}`, {
    headers: { ...headers, Authorization: token ? 'Bearer [REDACTED]' : 'None' },
    credentials: options.credentials || 'include',
    userAgent: navigator.userAgent,
  });

  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include',
    // Add mobile-specific options
    cache: 'no-cache',
    mode: 'cors',
  };

  try {
    const response = await fetch(fullUrl, fetchOptions);

    console.log(`[${new Date().toISOString()}] Response from ${fullUrl}:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP error! status: ${response.status}` };
      }
      
      console.error(`[${new Date().toISOString()}] API error for ${fullUrl}:`, {
        status: response.status,
        error: errorData.error,
        userAgent: navigator.userAgent,
      });
      
      if (response.status === 401) {
        // Clear potentially corrupted tokens
        try {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        } catch (e) {
          console.warn('Failed to clear storage:', e.message);
        }
        throw new Error('Unauthorized: Please sign in again');
      }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] API fetch error for ${fullUrl}:`, {
      error: error.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
    });

    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('Unable to connect to the server. Please check your network or contact support.');
    }

    throw error;
  }
};

// Enhanced localStorage availability check
export const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.error(`[${new Date().toISOString()}] localStorage is not available:`, e.message);
    
    // Try sessionStorage as fallback
    try {
      const testKey = '__test__';
      sessionStorage.setItem(testKey, testKey);
      sessionStorage.removeItem(testKey);
      console.log(`[${new Date().toISOString()}] Using sessionStorage as fallback`);
      return 'session';
    } catch (sessionError) {
      console.error(`[${new Date().toISOString()}] sessionStorage also not available:`, sessionError.message);
      return false;
    }
  }
};

// Enhanced token management for mobile
export const TokenManager = {
  setToken: (token) => {
    try {
      localStorage.setItem('token', token);
      // Also store in sessionStorage as backup for mobile
      sessionStorage.setItem('token', token);
      return true;
    } catch (e) {
      console.warn('Failed to store token in localStorage, trying sessionStorage:', e.message);
      try {
        sessionStorage.setItem('token', token);
        return true;
      } catch (sessionError) {
        console.error('Failed to store token in any storage:', sessionError.message);
        return false;
      }
    }
  },

  getToken: () => {
    try {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    } catch (e) {
      console.warn('Failed to retrieve token from storage:', e.message);
      return null;
    }
  },

  removeToken: () => {
    try {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      return true;
    } catch (e) {
      console.warn('Failed to remove token from storage:', e.message);
      return false;
    }
  },

  isTokenValid: async () => {
    const token = TokenManager.getToken();
    if (!token) return false;

    try {
      const response = await apiFetch('api/auth/check');
      return response && response.user;
    } catch (error) {
      console.error('Token validation failed:', error.message);
      TokenManager.removeToken();
      return false;
    }
  }
};