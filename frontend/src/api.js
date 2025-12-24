import axios from 'axios';

const api = axios.create({
  baseURL: 'http://178.128.20.53:5000/api',  // Backend base URL
});

// Add a request interceptor to include token in headers if exists
// api.interceptors.request.use(config => {
//   const token = localStorage.getItem('token');
//   if (token) config.headers.Authorization = token;
//   return config;
// });
axios.get('/api/dashboard', {
  headers: {
    Authorization: localStorage.getItem('token')
  }
});


export default api;
