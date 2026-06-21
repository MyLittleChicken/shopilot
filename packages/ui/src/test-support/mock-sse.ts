import type { AgentEvent } from "@shopilot/schemas";

/** AgentEvent → 서버와 동일한 SSE 프레임(`event: <type>\ndata: <json>\n\n`). */
export function frame(ev: AgentEvent): string {
  return `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
}

/** 주어진 청크들을 순서대로 흘리는 200 SSE 응답 fetch. 청크 경계를 임의 지정해 부분청크 검증. */
export function sseFetch(chunks: string[], status = 200): typeof fetch {
  return async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder();
        for (const ch of chunks) controller.enqueue(enc.encode(ch));
        controller.close();
      },
    });
    return new Response(stream, { status });
  };
}

/** fetch가 거부(네트워크 오류)하는 경우. */
export function throwingFetch(): typeof fetch {
  return async () => {
    throw new Error("network down");
  };
}

/** 호출 횟수를 세는 fetch(빈 입력 무시 검증용). */
export function countingFetch(chunks: string[] = []): { fetchImpl: typeof fetch; readonly calls: number } {
  let n = 0;
  const inner = sseFetch(chunks);
  return {
    fetchImpl: (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      n += 1;
      return inner(input, init);
    },
    get calls() {
      return n;
    },
  };
}

/** 테스트가 프레임을 한 개씩 풀어주는 게이트형 스트림(로딩 상태 전이 결정론 검증용). */
export function gatedSse(): { fetchImpl: typeof fetch; push: (frameStr: string) => void; close: () => void } {
  let ctrl: ReadableStreamDefaultController<Uint8Array> | null = null;
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      ctrl = controller;
    },
  });
  return {
    fetchImpl: async () => new Response(stream, { status: 200 }),
    push: (frameStr) => ctrl?.enqueue(enc.encode(frameStr)),
    close: () => ctrl?.close(),
  };
}
