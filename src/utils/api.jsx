export const apiFetch = async (url, options = {}) => {
  const BASE_URL = import.meta.env.VITE_API_URL;

  console.log(`[${new Date().toISOString()}] VITE_API_URL: ${BASE_URL}`);

  if (!BASE_URL) {
    console.error(`[${new Date().toISOString()}] VITE_API_URL is not defined`);
    throw new Error('API URL is not configured. Please check your environment variables.');
  }

  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const fullUrl = url.startsWith('http')
    ? url
    : `${BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;

  console.log(`[${new Date().toISOString()}] Making request to ${fullUrl}`, {
    headers,
    credentials: options.credentials || 'include',
  });

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      credentials: 'include',
    });

    console.log(`[${new Date().toISOString()}] Response from ${fullUrl}:`, {
      status: response.status,
      statusText: response.statusText,
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
      });
      if (response.status === 401) {
        throw new Error('Unauthorized: Please sign in again');
      }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] API fetch error for ${fullUrl}:`, {
      error: error.message,
      stack: error.stack,
    });

    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('Unable to connect to the server. Please check your network or contact support.');
    }

    throw error;
  }
};

export const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.error(`[${new Date().toISOString()}] localStorage is not available:`, e.message);
    return false;
  }
};
