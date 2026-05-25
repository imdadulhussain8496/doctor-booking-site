import axios from 'axios';

const API_BASE_URL = 'https://drappointment24.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('🔧 API Base URL:', API_BASE_URL);

export default api;
