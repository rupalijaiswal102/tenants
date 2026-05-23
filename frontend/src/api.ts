import axios from 'axios';

// Uses VITE_API_URL in production (Render), empty string in dev (Vite proxy handles it)
const api = axios.create({
  // import.meta.env may not be typed in some TS configs, cast to any to access Vite env vars
  baseURL: ((import.meta as any).env?.VITE_API_URL as string) || '',
});

// Attach auth token automatically
api.interceptors.request.use(config => {
  try {
    const auth = JSON.parse(localStorage.getItem('neoteric_auth') || 'null');
    if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`;
  } catch {}
  return config;
});

export default api;
