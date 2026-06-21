import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { streamSSE } from "hono/streaming";
import { cors } from "hono/cors";
import { ChatRequestSchema } from "@shopilot/schemas";
import type { AgentEvent } from "@shopilot/schemas";
import {
  createRunAgent,
  ProfileRegistry,
  MockDataSourceAdapter,
  appliances,
  applianceProfile,
  MockLLMAdapter,
  ClaudeAdapter,
} from "@shopilot/core";

// 두뇌 — 에이전트·어댑터·시크릿·SSE. 시크릿(LLM 키 등)은 여기(서버)에서만 process.env로 읽는다.
const app = new Hono();

// 컴포지션 루트 — 키가 있으면 Claude, 없으면 목 LLM(추천은 결정론 폴백). 실데이터 전환도 여기서.
const apiKey = process.env.ANTHROPIC_API_KEY;
const llm = apiKey
  ? new ClaudeAdapter({ apiKey, ...(process.env.ANTHROPIC_MODEL ? { model: process.env.ANTHROPIC_MODEL } : {}) })
  : new MockLLMAdapter();
const profiles = new ProfileRegistry();
profiles.register(applianceProfile);
const runAgent = createRunAgent({ dataSource: new MockDataSourceAdapter(appliances), profiles, llm });

// 위젯은 외부 도메인에서 호출 → cross-origin 허용. 운영에선 CORS_ORIGIN으로 제한.
app.use(
  "/chat",
  cors({
    origin: process.env.CORS_ORIGIN ?? "*",
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "shopilot-server" }));

// 채팅 스트리밍(SSE) — 요청 검증 → runAgent → 이벤트마다 SSE 방출.
app.post("/chat", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", issues: parsed.error.issues }, 400);
  }
  return streamSSE(c, async (stream) => {
    try {
      for await (const ev of runAgent(parsed.data)) {
        await stream.writeSSE({ event: ev.type, data: JSON.stringify(ev) });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const errorEvent: AgentEvent = { type: "error", message };
      await stream.writeSSE({ event: errorEvent.type, data: JSON.stringify(errorEvent) });
    }
  });
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`shopilot-server listening on :${port}`);
