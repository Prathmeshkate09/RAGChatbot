import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000',
});

api.interceptors.request.use(async (config) => {
  if (auth) {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      const h = (config.headers ?? {}) as any;
      if (typeof h.set === 'function') {
        h.set('Authorization', `Bearer ${token}`);
      } else {
        (config.headers as any) = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
      }
    }
  }
  return config;
});

export default api;