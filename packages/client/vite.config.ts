import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@mjwz/engine": path.resolve(__dirname, "../engine/src/index.ts"),
      "@mjwz/server/types": path.resolve(__dirname, "../server/src/types.ts"),
    },
  },
  server: {
    port: 5173,
    open: true,
    host: true, // écoute sur 0.0.0.0 pour permettre l'accès via LAN
  },
});
