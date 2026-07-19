import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Cấu hình headers để cho phép các Popup (Facebook/Google) hoạt động tốt nhất
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
    },
  },
});
