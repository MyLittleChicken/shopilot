import { describe, it, expect } from "vitest";
import { AgentEventSchema } from "./index";

describe("AgentEventSchema", () => {
  it("message_delta를 파싱한다", () => {
    expect(AgentEventSchema.safeParse({ type: "message_delta", text: "안녕" }).success).toBe(true);
  });

  it("기존 변형(thinking·message·products·done·error)을 유지한다", () => {
    expect(AgentEventSchema.safeParse({ type: "thinking", text: "…" }).success).toBe(true);
    expect(AgentEventSchema.safeParse({ type: "message", text: "x" }).success).toBe(true);
    expect(AgentEventSchema.safeParse({ type: "done" }).success).toBe(true);
  });

  it("알 수 없는 type은 거부한다", () => {
    expect(AgentEventSchema.safeParse({ type: "nope" }).success).toBe(false);
  });
});
