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

// 2. Response Interceptor: 401 error handle karega
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check karein ki ye error kaha se aaya hai
    const originalRequest = error.config;

    // Agar error 401 hai...
    if (error.response && error.response.status === 401) {
      
      // 🔥 FIX: Agar ye request '/login' endpoint ki thi (yani user login try kar raha tha),
      // to hum redirect NAHI karenge. Hum error ko Component tak jane denge.
      if (originalRequest.url.includes('/login') || window.location.pathname === '/login') {
        return Promise.reject(error);
      }

      // Agar user Dashboard par tha aur session expire hua, tabhi logout karo
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;