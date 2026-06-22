import { describe, it, expect } from "vitest";
import { selectLLM } from "./select-llm";

describe("selectLLM", () => {
  it("Anthropic 키 → claude", () => {
    expect(selectLLM({ ANTHROPIC_API_KEY: "dummy" }).name).toBe("claude");
  });

  it("OpenAI 키만 → openai", () => {
    expect(selectLLM({ OPENAI_API_KEY: "dummy" }).name).toBe("openai");
  });

  it("키 없음 → mock-llm", () => {
    expect(selectLLM({}).name).toBe("mock-llm");
  });

  it("둘 다면 Anthropic 우선", () => {
    expect(selectLLM({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o" }).name).toBe("claude");
  });
});
