import axios from 'axios';
import { reportRequestDuration } from './networkStatus';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// Attach the JWT to every request once the user is logged in, and stamp
// a start time so the response interceptor can measure duration.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ledger_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.metadata = { startTime: Date.now() };
  return config;
});

// If the token expires or is rejected, bounce back to login instead of
// leaving the UI stuck on a silently-failing request.
api.interceptors.response.use(
  (res) => {
    if (res.config.metadata) {
      reportRequestDuration(Date.now() - res.config.metadata.startTime);
    }
    return res;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ledger_token');
      localStorage.removeItem('ledger_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
