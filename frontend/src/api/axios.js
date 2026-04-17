import axios from 'axios';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Loading bar ki setting
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.2 });

// Automatically switch between Local and Live
const isLocal = window.location.hostname === "localhost";

const api = axios.create({
  baseURL: isLocal ? 'http://localhost:5000/api' : '/api', 
});

// ✅ 1. EKLAUTA SMART REQUEST INTERCEPTOR 
api.interceptors.request.use((config) => {
  NProgress.start(); 

  // Agar component se pehle hi Authorization header bheja gaya hai, toh wahi use karo
  if (config.headers && config.headers.Authorization) {
    return config;
  }

  // Pata karo ki route admin ka hai YA user admin panel mein hai
  const isAdminRoute = config.url && config.url.startsWith('/admin');
  const isAdminPanel = window.location.pathname.startsWith('/super-panal'); 

  if (isAdminRoute || isAdminPanel) {
    // Agar admin page par hai, toh sirf adminToken bhejo
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
}, (error) => {
  NProgress.done(); 
  return Promise.reject(error);
});

// ✅ 2. RESPONSE INTERCEPTOR (401 Error handle karne ke liye)
api.interceptors.response.use(
  (response) => {
    NProgress.done(); 
    return response;
  },
  (error) => {
    NProgress.done(); 

    const originalRequest = error.config;

    if (error.response && error.response.status === 401) {
      if (originalRequest.url.includes('/login') || window.location.pathname === '/login') {
        return Promise.reject(error);
      }

      // Session expire hone par logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;