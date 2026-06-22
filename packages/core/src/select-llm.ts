import type { LLMAdapter } from "./ports";

/**
 * 키 우선순위로 LLM 어댑터를 고른다: Anthropic > OpenAI > Mock.
 * env는 process.env(또는 테스트 평문 객체). 키는 서버가 읽어 전달 — 시크릿 서버 출처 유지.
 * green에서 구현.
 */
export function selectLLM(_env: Record<string, string | undefined>): LLMAdapter {
  throw new Error("미구현: selectLLM");
}
