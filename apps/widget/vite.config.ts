import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 임베더블 위젯 — 단일 IIFE 번들로 빌드해 외부 사이트에 <script>로 주입한다. CDN 배포 대상.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/main.tsx",
      name: "Shopilot",
      fileName: () => "widget.js",
      formats: ["iife"],
    },
  },
});
