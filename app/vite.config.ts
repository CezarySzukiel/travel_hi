import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

export default defineConfig(() => {

  const httpsOptions = {
    key: fs.readFileSync(path.resolve(".certs/localhost-key.pem")),
    cert: fs.readFileSync(path.resolve(".certs/localhost.pem")),
  };

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      https: httpsOptions,            // ← prawdziwy cert + klucz
      strictPort: true,
      hmr: {
        protocol: "wss",              // ← ważne przy HTTPS
        host: "localhost",
        port: 5173,
      },
      proxy: {
        // proxy do backendu na http://localhost:8000
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
          ws: true,
        },
      },
    },
    // opcjonalnie: base: "/"
  };
});