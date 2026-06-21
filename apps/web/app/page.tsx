"use client";

import { ChatPanel } from "@shopilot/ui";

// 풀페이지 웹 — packages/ui를 렌더한다. ChatPanel은 useChat(클라이언트 훅)을 쓰므로 'use client'.
// apiBaseUrl은 공개 변수(NEXT_PUBLIC_*)에서 읽어 주입한다. 시크릿은 서버 전용.
export default function Home() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";
  return (
    <main>
      <h1>Shopilot</h1>
      <p>AI Shopping Copilot</p>
      <ChatPanel apiBaseUrl={apiBaseUrl} />
    </main>
  );
}
