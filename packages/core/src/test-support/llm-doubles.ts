import type { ChatMessage } from "@shopilot/schemas";
import type { LLMAdapter, LLMChunk, ToolSpec } from "../ports";

type Input = { messages: ChatMessage[]; system?: string; tools?: ToolSpec[] };

/** 입력과 호출 횟수를 기록하고 주어진 청크를 방출하는 캡처형 목(호출 시점에 기록). */
export function capturingLLM(chunks: LLMChunk[]): LLMAdapter & { calls: Input[] } {
  const calls: Input[] = [];
  return {
    name: "capturing-llm",
    calls,
    stream(input: Input): AsyncIterable<LLMChunk> {
      calls.push(input);
      return (async function* () {
        for (const c of chunks) yield c;
      })();
    },
  };
}

/** 실패 목 — `call`: .stream() 호출 즉시 throw / `iterate`: 이터레이션 중 throw. */
export function throwingLLM(when: "call" | "iterate"): LLMAdapter {
  return {
    name: "throwing-llm",
    stream(_input: Input): AsyncIterable<LLMChunk> {
      if (when === "call") throw new Error("llm call failed");
      return (async function* (): AsyncIterable<LLMChunk> {
        throw new Error("llm iterate failed");
      })();
    },
  };
}
