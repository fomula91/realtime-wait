import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 개발 중 /api 요청을 로컬 worker(8787)로 프록시한다
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
