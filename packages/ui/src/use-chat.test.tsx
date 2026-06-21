import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";
import { useChat } from "./use-chat";
import { frame, sseFetch, countingFetch } from "./test-support/mock-sse";

afterEach(cleanup);

const stream = [
  frame({ type: "thinking", text: "…" }),
  frame({ type: "message", text: "답" }),
  frame({ type: "done" }),
].join("");

describe("useChat", () => {
  it("send(text)는 user 메시지를 추가하고 스트림을 소비한다", async () => {
    const { result } = renderHook(() => useChat({ apiBaseUrl: "http://x", fetchImpl: sseFetch([stream]) }));
    act(() => result.current.send("세탁기"));
    await waitFor(() => {
      expect(result.current.messages.some((m) => m.role === "user" && m.content === "세탁기")).toBe(true);
      expect(result.current.messages.some((m) => m.role === "assistant" && m.content === "답")).toBe(true);
      expect(result.current.status).toBe("idle");
    });
  });

  it("빈/공백 입력 send는 요청을 보내지 않는다", () => {
    const counter = countingFetch([stream]);
    const { result } = renderHook(() => useChat({ apiBaseUrl: "http://x", fetchImpl: counter.fetchImpl }));
    act(() => result.current.send("   "));
    expect(counter.calls).toBe(0);
    expect(result.current.messages.length).toBe(0);
  });
});
