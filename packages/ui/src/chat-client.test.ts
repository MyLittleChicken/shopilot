// @vitest-environment node
import { describe, it, expect } from "vitest";
import { AgentEventSchema } from "@shopilot/schemas";
import type { AgentEvent, ChatRequest } from "@shopilot/schemas";
import { streamChat } from "./chat-client";
import { frame, sseFetch, throwingFetch } from "./test-support/mock-sse";

const req: ChatRequest = { messages: [{ role: "user", content: "세탁기" }] };

async function collect(s: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const out: AgentEvent[] = [];
  for await (const e of s) out.push(e);
  return out;
}

const seq: AgentEvent[] = [
  { type: "thinking", text: "…" },
  { type: "products", items: [] },
  { type: "message", text: "추천" },
  { type: "done" },
];

describe("streamChat", () => {
  it("POST /chat에 JSON 본문으로 호출한다", async () => {
    let captured: { url: unknown; init: RequestInit | undefined } | null = null;
    const f: typeof fetch = async (url, init) => {
      captured = { url, init };
      return new Response(
        new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(new TextEncoder().encode(frame({ type: "done" })));
            c.close();
          },
        }),
        { status: 200 },
      );
    };
    await collect(streamChat("http://api", req, f));
    expect(captured!.url).toBe("http://api/chat");
    expect(captured!.init?.method).toBe("POST");
    expect(JSON.parse(String(captured!.init?.body))).toEqual(req);
  });

  it("event+data 프레임에서 data만 파싱해 순서대로 yield하고 모두 스키마를 통과한다", async () => {
    const evs = await collect(streamChat("http://x", req, sseFetch([seq.map(frame).join("")])));
    expect(evs.map((e) => e.type)).toEqual(["thinking", "products", "message", "done"]);
    for (const e of evs) expect(AgentEventSchema.safeParse(e).success).toBe(true);
  });

  it("한 프레임이 여러 청크에 쪼개져 와도 1개로 합쳐 yield한다", async () => {
    const whole = seq.map(frame).join("");
    const chunks = [whole.slice(0, 5), whole.slice(5, 30), whole.slice(30)];
    const evs = await collect(streamChat("http://x", req, sseFetch(chunks)));
    expect(evs.map((e) => e.type)).toEqual(["thinking", "products", "message", "done"]);
  });

  it("깨진 JSON 프레임은 건너뛰고 이후 정상 프레임·done까지 진행한다", async () => {
    const bad = `event: message\ndata: {깨진json\n\n`;
    const evs = await collect(
      streamChat("http://x", req, sseFetch([frame({ type: "thinking", text: "…" }) + bad + frame({ type: "done" })])),
    );
    expect(evs.map((e) => e.type)).toEqual(["thinking", "done"]);
  });

  it("res.ok=false면 error 1개만 yield하고 종료한다", async () => {
    const evs = await collect(streamChat("http://x", req, sseFetch([], 400)));
    expect(evs.map((e) => e.type)).toEqual(["error"]);
  });

  it("fetch가 throw하면 error 1개를 yield하고 종료한다", async () => {
    const evs = await collect(streamChat("http://x", req, throwingFetch()));
    expect(evs.map((e) => e.type)).toEqual(["error"]);
  });
});
