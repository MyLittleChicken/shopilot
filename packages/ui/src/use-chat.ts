import { useCallback, useRef, useState } from "react";
import type { ChatRequest, Product } from "@shopilot/schemas";
import { streamChat } from "./chat-client";

type Message = { role: "user" | "assistant"; content: string };

export interface UseChat {
  messages: Message[];
  products: Product[];
  status: "idle" | "streaming";
  send: (text: string) => void;
}

/** 입력·메시지·로딩·상품 상태를 관리하는 훅. streamChat을 소비해 이벤트별로 상태를 갱신한다. */
export function useChat(opts: { apiBaseUrl: string; fetchImpl?: typeof fetch }): UseChat {
  const { apiBaseUrl, fetchImpl } = opts;
  const [messages, setMessages] = useState<Message[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"idle" | "streaming">("idle");
  const streamingRef = useRef(false);

  const send = useCallback(
    (text: string) => {
      const q = text.trim();
      if (q === "" || streamingRef.current) return; // 빈 입력·스트리밍 중 무시
      streamingRef.current = true;
      setMessages((prev) => [...prev, { role: "user", content: q }]);
      setProducts([]);
      setStatus("streaming");

      const request: ChatRequest = { messages: [{ role: "user", content: q }] };
      void (async () => {
        try {
          for await (const ev of streamChat(apiBaseUrl, request, fetchImpl)) {
            if (ev.type === "products") setProducts(ev.items);
            else if (ev.type === "message") setMessages((prev) => [...prev, { role: "assistant", content: ev.text }]);
            else if (ev.type === "error") setMessages((prev) => [...prev, { role: "assistant", content: ev.message }]);
          }
        } finally {
          streamingRef.current = false;
          setStatus("idle");
        }
      })();
    },
    [apiBaseUrl, fetchImpl],
  );

  return { messages, products, status, send };
}
