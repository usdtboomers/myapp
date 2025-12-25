import axios from 'axios';

// 🌐 Automatically switch between Local and Live
const isLocal = window.location.hostname === "localhost";

const api = axios.create({
  // Local par 5000 port use hoga, Live par sirf /api (Nginx handle karega)
  baseURL: isLocal ? 'http://localhost:5000/api' : '/api', 
});

// 1. Request Interceptor: Token automatically add karega
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// 2. Response Interceptor: 401 error (Session Expired) handle karega
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;