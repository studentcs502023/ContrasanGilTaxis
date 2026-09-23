import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let inMemoryToken = null;

export const setAccessToken = (token) => {
  inMemoryToken = token;
};

export const getAccessToken = () => inMemoryToken || localStorage.getItem('token');

// Interceptor de solicitudes: adjunta el token en cada llamada
axiosClient.interceptors.request.use(
  (config) => {
    const token = inMemoryToken || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuestas: maneja la expiración del token
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      setAccessToken(null);
      localStorage.removeItem('token');

      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;