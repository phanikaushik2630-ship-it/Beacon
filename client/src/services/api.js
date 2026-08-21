/**
 * Beacon API Client
 * Automatically attaches JWT from localStorage if available
 */

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const cleanUrl = envUrl.trim().replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  return '/api';
};

const API_BASE = getApiBase();

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('beacon_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    console.error('[API] Network error:', networkErr);
    const error = new Error(
      'Unable to connect to the server. Please check your internet connection or verify the backend server is running.'
    );
    error.isNetworkError = true;
    throw error;
  }

  // Check if response has JSON content type
  const contentType = response.headers.get('content-type') || '';
  let data = {};

  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    // If the server responded with HTML (e.g. Netlify fallback to index.html or 404/502 page)
    const text = await response.text().catch(() => '');
    console.warn('[API] Non-JSON response received:', text.slice(0, 200));

    if (response.ok) {
      // 200 OK with HTML usually means SPA routing caught the /api request because backend is not configured/proxied
      const error = new Error(
        'Backend server is not connected. If deployed on Netlify, please configure your backend URL in VITE_SERVER_URL.'
      );
      error.status = 200;
      throw error;
    } else {
      const error = new Error(`Server returned status ${response.status} (${response.statusText || 'Error'})`);
      error.status = response.status;
      throw error;
    }
  }

  if (!response.ok) {
    const errorMessage =
      data.error ||
      (Array.isArray(data.errors) ? data.errors.join(', ') : 'Something went wrong. Please try again.');
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const authApi = {
  register: (payload) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () =>
    apiRequest('/auth/me', {
      method: 'GET',
    }),

  updateProfile: (payload) =>
    apiRequest('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  forgotPassword: (payload) =>
    apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const messageApi = {
  getConversations: () =>
    apiRequest('/messages/conversations', {
      method: 'GET',
    }),

  getUsers: (search = '') =>
    apiRequest(`/messages/users${search ? `?search=${encodeURIComponent(search)}` : ''}`, {
      method: 'GET',
    }),

  getMessageHistory: (partnerId) =>
    apiRequest(`/messages/${partnerId}`, {
      method: 'GET',
    }),

  markAsRead: (partnerId) =>
    apiRequest(`/messages/${partnerId}/read`, {
      method: 'PATCH',
    }),

  deleteMessage: (messageId) =>
    apiRequest(`/messages/item/${messageId}`, {
      method: 'DELETE',
    }),

  clearThread: (partnerId) =>
    apiRequest(`/messages/thread/${partnerId}`, {
      method: 'DELETE',
    }),
};
