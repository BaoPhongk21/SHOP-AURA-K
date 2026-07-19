export const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || 
  (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);
