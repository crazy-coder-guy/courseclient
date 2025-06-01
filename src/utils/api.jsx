export const apiFetch = async (url, options = {}) => {
  const BASE_URL = import.meta.env.VITE_API_URL;

  // Enhanced token retrieval that works across all environments
  const getToken = () => {
    // First try to get from cookies if in browser environment
    if (typeof document !== 'undefined') {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      
      if (cookieValue) {
        console.log(`[${new Date().toISOString()}] Token retrieved from cookies`, {
          tokenSnippet: cookieValue.substring(0, 10) + '...',
        });
        return cookieValue;
      }
    }
    
    // Then try storage if available
    if (typeof window !== 'undefined') {
      try {
        const localToken = localStorage.getItem('token');
        if (localToken) {
          console.log(`[${new Date().toISOString()}] Token retrieved from localStorage`, {
            tokenSnippet: localToken.substring(0, 10) + '...',
          });
          return localToken;
        }
        const sessionToken = sessionStorage.getItem('token');
        if (sessionToken) {
          console.log(`[${new Date().toISOString()}] Token retrieved from sessionStorage`, {
            tokenSnippet: sessionToken.substring(0, 10) + '...',
          });
          return sessionToken;
        }
      } catch (e) {
        console.warn(`[${new Date().toISOString()}] Storage access failed:`, e.message);
      }
    }
    
    console.log(`[${new Date().toISOString()}] No token found in cookies or storage`);
    return null;
  };

  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Mobile-specific optimizations
  if (typeof navigator !== 'undefined' && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    headers['Cache-Control'] = 'no-cache';
    headers['Pragma'] = 'no-cache';
    headers['X-Mobile-Request'] = 'true'; // Add custom header for mobile debugging
  }

  const fullUrl = url.startsWith('http')
    ? url
    : `${BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;

  console.log(`[${new Date().toISOString()}] Making request to ${fullUrl}`, {
    headers: { ...headers, Authorization: token ? 'Bearer [REDACTED]' : 'None' },
    credentials: options.credentials || 'include',
    userAgent: navigator.userAgent || 'Unknown',
    isMobile: typeof navigator !== 'undefined' && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
  });

  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-cache',
    mode: 'cors',
  };

  try {
    const response = await fetch(fullUrl, fetchOptions);

    console.log(`[${new Date().toISOString()}] Response from ${fullUrl}:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      isMobile: typeof navigator !== 'undefined' && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
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
        userAgent: navigator.userAgent || 'Unknown',
      });
      
      if (response.status === 401) {
        // Clear potentially corrupted tokens
        try {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          document.cookie = 'token=; Max-Age=0; path=/;';
          console.log(`[${new Date().toISOString()}] Cleared tokens due to 401 error`);
        } catch (e) {
          console.warn(`[${new Date().toISOString()}] Failed to clear storage:`, e.message);
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
      userAgent: navigator.userAgent || 'Unknown',
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
export const TokenManager = {
  setToken: (token) => {
    try {
      // Try cookies first
      document.cookie = `token=${token}; path=/; max-age=${5 * 24 * 60 * 60}; secure=${process.env.NODE_ENV === 'production' ? 'true' : 'false'}; sameSite=${process.env.NODE_ENV === 'production' ? 'none' : 'lax'}`;
      
      // Then try storage as fallback
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('token', token);
          sessionStorage.setItem('token', token);
          console.log(`[${new Date().toISOString()}] Token stored in localStorage and sessionStorage`, {
            tokenSnippet: token.substring(0, 10) + '...',
          });
        } catch (storageError) {
          console.warn(`[${new Date().toISOString()}] Storage access failed, using cookies only:`, storageError.message);
        }
      }
      console.log(`[${new Date().toISOString()}] Token stored in cookies`, {
        tokenSnippet: token.substring(0, 10) + '...',
      });
      return true;
    } catch (e) {
      console.error(`[${new Date().toISOString()}] Failed to set token:`, e.message);
      return false;
    }
  },

  getToken: () => {
    try {
      // First try to get from cookies
      if (typeof document !== 'undefined') {
        const cookieValue = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];
        
        if (cookieValue) {
          console.log(`[${new Date().toISOString()}] Token retrieved from cookies`, {
            tokenSnippet: cookieValue.substring(0, 10) + '...',
          });
          return cookieValue;
        }
      }
      
      // Fallback to storage
      if (typeof window !== 'undefined') {
        const localToken = localStorage.getItem('token');
        if (localToken) {
          console.log(`[${new Date().toISOString()}] Token retrieved from localStorage`, {
            tokenSnippet: localToken.substring(0, 10) + '...',
          });
          return localToken;
        }
        const sessionToken = sessionStorage.getItem('token');
        if (sessionToken) {
          console.log(`[${new Date().toISOString()}] Token retrieved from sessionStorage`, {
            tokenSnippet: sessionToken.substring(0, 10) + '...',
          });
          return sessionToken;
        }
      }
      
      console.log(`[${new Date().toISOString()}] No token found in cookies or storage`);
      return null;
    } catch (e) {
      console.warn(`[${new Date().toISOString()}] Failed to retrieve token:`, e.message);
      return null;
    }
  },

  removeToken: () => {
    try {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      document.cookie = `token=; Max-Age=0; path=/; sameSite=${process.env.NODE_ENV === 'production' ? 'none' : 'lax'}; secure=${process.env.NODE_ENV === 'production' ? 'true' : 'false'}`;
      console.log(`[${new Date().toISOString()}] Tokens removed from storage and cookies`);
      return true;
    } catch (e) {
      console.warn(`[${new Date().toISOString()}] Failed to remove token from storage:`, e.message);
      return false;
    }
  },

  isTokenValid: async () => {
    const token = TokenManager.getToken();
    if (!token) {
      console.log(`[${new Date().toISOString()}] No token available for validation`);
      return false;
    }

    try {
      const response = await apiFetch('api/auth/check');
      console.log(`[${new Date().toISOString()}] Token validation response:`, {
        user: response?.user,
      });
      return response && response.user;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Token validation failed:`, error.message);
      TokenManager.removeToken();
      return false;
    }
  }
};