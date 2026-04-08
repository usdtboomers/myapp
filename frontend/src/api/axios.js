import axios from 'axios';

// 🌐 Automatically switch between Local and Live
const isLocal = window.location.hostname === "localhost";

const api = axios.create({
  // Local par 5000 port use hoga, Live par sirf /api (Nginx handle karega)
  baseURL: isLocal ? 'http://localhost:5000/api' : '/api', 
});

// 1. Request Interceptor: Token automatically add karega
api.interceptors.request.use((config) => {
  // 🔥 FIX: Pata karo ki ye request Admin ki hai ya Normal User ki
  const isAdminRoute = config.url && config.url.startsWith('/admin');

  if (isAdminRoute) {
    // Agar Admin route hai, toh adminToken bhejo
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  } else {
    // Warna normal user ka token bhejo
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
}, (error) => Promise.reject(error));

// 2. Response Interceptor: 401 error handle karega
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401) {
      if (originalRequest.url.includes('/login') || window.location.pathname === '/login') {
        return Promise.reject(error);
      }

      // Agar user Dashboard par tha aur session expire hua, tabhi logout karo
      // Note: Hum yahan adminToken delete nahi kar rahe taaki normal user session expire hone pe admin out na ho.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;