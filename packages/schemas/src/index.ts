import { z } from "zod";

/** 상품 — 모든 카테고리 공통 핵심 필드. 카테고리별 세부는 attributes로 확장. */
export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  brand: z.string().optional(),
  price: z.number().int().nonnegative(),
  currency: z.literal("KRW").default("KRW"),
  imageUrl: z.string().url().optional(),
  rating: z.number().min(0).max(5).optional(),
  url: z.string().url().optional(),
  category: z.string(),
  attributes: z.record(z.string(), z.unknown()).default({}),
});
export type Product = z.infer<typeof ProductSchema>;

/** 채팅 메시지 */
export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/** 상품 질의 */
export const ProductQuerySchema = z.object({
  text: z.string(),
  category: z.string().optional(),
  budgetMax: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(50).default(10),
});
export type ProductQuery = z.infer<typeof ProductQuerySchema>;

/** 채팅 요청 (클라이언트 → 서버) */
export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  category: z.string().optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/** 에이전트 이벤트 — 서버가 SSE로 스트리밍한다. */
export const AgentEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("thinking"), text: z.string() }),
  z.object({ type: z.literal("message"), text: z.string() }),
  z.object({ type: z.literal("message_delta"), text: z.string() }),
  z.object({ type: z.literal("products"), items: z.array(ProductSchema) }),
  z.object({ type: z.literal("done") }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type AgentEvent = z.infer<typeof AgentEventSchema>;
