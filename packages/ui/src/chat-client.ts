import type { AgentEvent, ChatRequest } from "@shopilot/schemas";

/**
 * 서버 POST /chat SSE를 파싱해 AgentEvent를 yield하는 프레임워크 비종속 클라이언트.
 * 와이어: `event: <type>\ndata: <json>\n\n`. data JSON만 파싱·검증한다.
 * green에서 구현.
 */
export async function* streamChat(
  _apiBaseUrl: string,
  _request: ChatRequest,
  _fetchImpl?: typeof fetch,
): AsyncIterable<AgentEvent> {
  throw new Error("미구현: streamChat");
}
