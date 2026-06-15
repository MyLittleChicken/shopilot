import { ChatPanel } from "@shopilot/ui";

// 풀페이지 웹 — packages/ui를 렌더한다. 디자인 원본·데모 표면.
export default function Home() {
  return (
    <main>
      <h1>Shopilot</h1>
      <p>AI Shopping Copilot</p>
      <ChatPanel />
    </main>
  );
}
