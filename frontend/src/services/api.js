// src/services/api.js – only for Excel downloads
import axios from 'axios';
import { auth } from './firebase';

// my computer's IP – used only for Excel
export const BASE_URL = 'http://10.0.2.33:5000';

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// Attach token for Excel requests (if needed)
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken(true);
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn('Token error:', e.message);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message || 'Network error';
    return Promise.reject(new Error(msg));
  }
);

// Only Excel endpoints remain 
export const ExcelAPI = {
  reports:    () => `${BASE_URL}/api/excel/reports`,
  attendance: () => `${BASE_URL}/api/excel/attendance`,
  ratings:    () => `${BASE_URL}/api/excel/ratings`,
  courses:    () => `${BASE_URL}/api/excel/courses`,
};

export default api;