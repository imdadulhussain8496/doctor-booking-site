import axios from 'axios';

const getBaseURL = () => {
  if (window.location.hostname === 'staging.drappointment24.com') {
    return 'https://staging.drappointment24.com/api';
  }
  if (window.location.hostname === 'drappointment24.com') {
    return 'https://drappointment24.com/api';
  }
  return 'http://localhost:5000';
};

const API_BASE_URL = getBaseURL();

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('🔧 API Base URL:', API_BASE_URL);

export default api;
