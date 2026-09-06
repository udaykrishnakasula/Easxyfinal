import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production" || process.env.NODE_ENV === "production";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    esbuild: {
      // Strip debug console logs and debugger statements in production builds
      drop: isProd ? ["debugger"] : [],
      pure: isProd ? ["console.log", "console.debug", "console.info"] : [],
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      minify: isProd ? "esbuild" : false,
      cssMinify: isProd,
      cssCodeSplit: true,
      sourcemap: false,
      target: "es2020",
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
          manualChunks: {
            "vendor-core": [
              "react",
              "react-dom",
              "react-router-dom",
              "@tanstack/react-query",
              "axios",
            ],
            "vendor-ui": [
              "lucide-react",
              "framer-motion",
              "clsx",
              "tailwind-merge",
              "class-variance-authority",
            ],
            "vendor-charts": ["recharts"],
          },
        },
      },
    },
    server: {
      hmr: false,
    },
  };
});



