/** 호출 URL을 기록하고 주어진 body를 JSON으로 응답하는 fetch 더블. */
export function jsonFetch(body: unknown, status = 200): { fetchImpl: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = (input) => {
    calls.push(String(input));
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  };
  return { fetchImpl, calls };
}

/** HTTP 오류(기본 500) 응답 fetch. */
export function failingFetch(status = 500): typeof fetch {
  return () => Promise.resolve(new Response("err", { status }));
}

/** 네트워크 예외(거부) fetch. */
export function throwFetch(): typeof fetch {
  return () => Promise.reject(new Error("network"));
}
