import type { LLMAdapter } from "./ports";
import { ClaudeAdapter } from "./claude-adapter";
import { OpenAIAdapter } from "./openai-adapter";
import { MockLLMAdapter } from "./mock-llm";

/**
 * 키 우선순위로 LLM 어댑터를 고른다: Anthropic > OpenAI > Mock.
 * env는 process.env(또는 테스트 평문 객체). 키는 서버가 읽어 전달 — 시크릿 서버 출처 유지.
 * 새 provider는 여기에 분기 한 줄과 어댑터를 추가하면 된다(provider-agnostic).
 */
export function selectLLM(env: Record<string, string | undefined>): LLMAdapter {
  if (env.ANTHROPIC_API_KEY) {
    return new ClaudeAdapter({
      apiKey: env.ANTHROPIC_API_KEY,
      ...(env.ANTHROPIC_MODEL ? { model: env.ANTHROPIC_MODEL } : {}),
    });
  }
  if (env.OPENAI_API_KEY) {
    return new OpenAIAdapter({
      apiKey: env.OPENAI_API_KEY,
      ...(env.OPENAI_MODEL ? { model: env.OPENAI_MODEL } : {}),
    });
  }
  return new MockLLMAdapter();
}
