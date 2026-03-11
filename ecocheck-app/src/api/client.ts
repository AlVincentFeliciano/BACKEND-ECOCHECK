import axios from 'axios';
import { API_URL } from '../utils/config';
import { getToken } from '../utils/auth';

const client = axios.create({
  baseURL: API_URL,
});

// ✅ Automatically attach token to every request
client.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default client;
