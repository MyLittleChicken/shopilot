import { AgentEventSchema } from "@shopilot/schemas";
import type { AgentEvent, ChatRequest } from "@shopilot/schemas";

/**
 * 서버 POST /chat SSE를 파싱해 AgentEvent를 yield하는 프레임워크 비종속 클라이언트.
 * 와이어: `event: <type>\ndata: <json>\n\n`. data JSON만 파싱해 AgentEventSchema로 검증한다.
 * 종료: done/error yield 후 return, reader EOF 시 return → 유한 종료 보장.
 */
export async function* streamChat(
  apiBaseUrl: string,
  request: ChatRequest,
  fetchImpl?: typeof fetch,
): AsyncIterable<AgentEvent> {
  const f = fetchImpl ?? globalThis.fetch;

  let res: Response;
  try {
    res = await f(`${apiBaseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    yield { type: "error", message: "네트워크 오류가 발생했어요." };
    return;
  }
  if (!res.ok) {
    yield { type: "error", message: `요청 실패(HTTP ${res.status})` };
    return;
  }
  if (!res.body) {
    yield { type: "error", message: "응답 본문이 없어요." };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      const ev = parseFrame(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
      if (ev) {
        yield ev;
        if (ev.type === "done" || ev.type === "error") return;
      }
      sep = buffer.indexOf("\n\n");
    }
  }
  // 트레일링 \n\n 없이 끝난 경우 잔여 버퍼를 한 번 더 시도.
  const tail = parseFrame(buffer);
  if (tail) yield tail;
}

/** SSE 프레임에서 data: 라인만 취해 JSON 파싱·검증. event:/id:/주석·빈 줄은 무시. */
function parseFrame(frameStr: string): AgentEvent | null {
  const dataLines = frameStr.split("\n").filter((l) => l.startsWith("data:"));
  if (dataLines.length === 0) return null;
  const json = dataLines.map((l) => l.replace(/^data:\s?/, "")).join("\n");
  try {
    const parsed = AgentEventSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
