export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  console.log(`Making request to ${url} with token: ${token ? 'present' : 'missing'}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Support cookie-based authentication
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API fetch error for ${url}:`, error.message);
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
    console.error('localStorage is not available:', e.message);
    return false;
  }
};