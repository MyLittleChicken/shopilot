import { useState } from "react";
import type { Product } from "@shopilot/schemas";
import { useChat } from "./use-chat";
import { ProductCard } from "./product-card";

/**
 * 공유 채팅 패널 — web·widget이 같은 컴포넌트를 쓴다. apiBaseUrl은 각 앱이 주입한다(ui는 env 안 읽음).
 * fetchImpl은 테스트 주입용(앱은 생략). 컨테이너 쿼리로 넓은 화면·좁은 위젯 패널 양쪽 대응.
 */
export function ChatPanel({ apiBaseUrl, fetchImpl }: { apiBaseUrl: string; fetchImpl?: typeof fetch }) {
  const { messages, products, status, send } = useChat({ apiBaseUrl, fetchImpl });
  const [text, setText] = useState("");

  return (
    <section className="shopilot-panel" role="log" aria-label="Shopilot 대화">
      <ul className="shopilot-messages">
        {messages.map((m, i) => (
          <li key={i} className={`shopilot-msg shopilot-msg--${m.role}`}>
            {m.content}
          </li>
        ))}
      </ul>

      {status === "streaming" && (
        <p className="shopilot-loading" role="status">
          응답을 받고 있어요…
        </p>
      )}

      {products.length > 0 && (
        <div className="shopilot-products">
          {products.map((p: Product) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <form
        className="shopilot-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
          setText("");
        }}
      >
        <label htmlFor="shopilot-q" className="shopilot-sronly">
          메시지
        </label>
        <input
          id="shopilot-q"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="무엇을 찾으세요? 예: 12kg 드럼 세탁기"
        />
        <button type="submit">보내기</button>
      </form>
    </section>
  );
}
