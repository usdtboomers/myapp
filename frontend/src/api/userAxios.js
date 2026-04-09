import axios from 'axios';

// Automatically switch between Local and Live
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const api = axios.create({
  // Local par 5000 port use hoga, Live par sirf /api
  baseURL: isLocal ? 'http://localhost:5000/api' : '/api', 
});

// Request Interceptor: Token automatically add karega
api.interceptors.request.use((config) => {
  const isAdminRoute = config.url && config.url.startsWith('/admin');

  if (isAdminRoute) {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  } else {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor: 401 error handle karega
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401) {
      if (originalRequest.url.includes('/login') || window.location.pathname === '/login') {
        return Promise.reject(error);
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;