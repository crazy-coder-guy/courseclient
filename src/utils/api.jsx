export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  console.log(`[${new Date().toISOString()}] Making request to ${url} with token: ${token ? 'present' : 'missing'}`, {
    headers,
    credentials: options.credentials || 'include',
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Support cookie-based authentication
    });

    console.log(`[${new Date().toISOString()}] Response from ${url}:`, {
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
      console.error(`[${new Date().toISOString()}] API error for ${url}:`, {
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
    console.error(`[${new Date().toISOString()}] API fetch error for ${url}:`, {
      error: error.message,
      stack: error.stack,
    });
    if (error.message.includes('Failed to fetch')) {
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