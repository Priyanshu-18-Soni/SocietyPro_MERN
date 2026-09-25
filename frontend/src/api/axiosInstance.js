import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach Authorization header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle session expiry (401) and account inactivity (403)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 Unauthorized: Session expired or invalid token
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/register-owner') ||
        url.includes('/auth/register-resident');

      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
          window.location.href = '/login?session=expired';
        }
      }
    }

    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'ACCOUNT_INACTIVE'
    ) {
      if (window.location.pathname !== '/pending-approval') {
        window.location.href = '/pending-approval';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

