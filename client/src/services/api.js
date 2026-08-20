/**
 * Beacon API Client
 * Automatically attaches JWT from localStorage if available
 */

const API_BASE = '/api';

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('beacon_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

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
