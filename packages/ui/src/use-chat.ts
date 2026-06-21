import type { Product } from "@shopilot/schemas";

export interface UseChat {
  messages: { role: "user" | "assistant"; content: string }[];
  products: Product[];
  status: "idle" | "streaming";
  send: (text: string) => void;
}

/** 입력·메시지·로딩·상품 상태를 관리하는 훅. green에서 streamChat 소비로 구현. */
export function useChat(_opts: { apiBaseUrl: string; fetchImpl?: typeof fetch }): UseChat {
  return { messages: [], products: [], status: "idle", send: () => {} };
}
