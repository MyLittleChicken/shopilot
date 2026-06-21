import type { ReactNode } from "react";
import type { Product } from "@shopilot/schemas";

/**
 * 공유 UI 컴포넌트 — web·widget이 같은 컴포넌트를 쓴다.
 * 컨테이너 쿼리로 작성해 넓은 화면과 좁은 위젯 패널 양쪽에 대응한다.
 */

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="shopilot-card">
      <strong>{product.title}</strong>
      <span>{product.price.toLocaleString("ko-KR")}원</span>
    </article>
  );
}

export function ChatPanel({ children }: { children?: ReactNode }) {
  return (
    <section className="shopilot-panel" role="log" aria-label="Shopilot 대화">
      {children}
    </section>
  );
}
