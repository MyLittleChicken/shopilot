import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// ui 컴포넌트/훅 테스트는 happy-dom(DOM). streamChat 같은 비-DOM 테스트는
// 파일 상단 `// @vitest-environment node`로 개별 오버라이드한다.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
  },
});
