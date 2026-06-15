import type { ReactNode } from "react";

export const metadata = {
  title: "Shopilot — AI Shopping Copilot",
  description: "현명한 소비를 위한 당신의 AI 쇼핑 파트너",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
