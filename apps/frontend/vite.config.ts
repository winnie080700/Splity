import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiProxyTarget = env.VITE_DEV_API_PROXY_TARGET?.trim() || "http://localhost:5204";
  const allowedHosts = (env.VITE_DEV_ALLOWED_HOSTS?.split(",") ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@api-client": path.resolve(__dirname, "../../packages/api-client/src/index.ts")
      }
    },
    server: {
      allowedHosts: allowedHosts.length > 0
        ? allowedHosts
        : [".trycloudflare.com"],
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true
        },
        "/health": {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});
