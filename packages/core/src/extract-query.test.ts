import { describe, it, expect } from "vitest";
import { ProductQuerySchema } from "@shopilot/schemas";
import type { ChatMessage } from "@shopilot/schemas";
import { extractQuery } from "./extract-query";

describe("extractQuery", () => {
  it("마지막 user 메시지 content를 trim해 text로 매핑한다", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "안녕" },
      { role: "assistant", content: "무엇을 도와드릴까요?" },
      { role: "user", content: "  냉장고 추천  " },
    ];
    expect(extractQuery(messages).text).toBe("냉장고 추천");
  });

  it("user 메시지가 여럿이면 가장 마지막 것을 쓴다", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "세탁기" },
      { role: "user", content: "에어컨" },
    ];
    expect(extractQuery(messages).text).toBe("에어컨");
  });

  it("user 메시지가 없으면(전부 assistant/system) 마지막 메시지 content를 쓴다", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "시스템" },
      { role: "assistant", content: "도움말" },
    ];
    expect(extractQuery(messages).text).toBe("도움말");
  });

  it("category 인자가 있으면 그대로, 없으면 appliance 기본", () => {
    const messages: ChatMessage[] = [{ role: "user", content: "x" }];
    expect(extractQuery(messages).category).toBe("appliance");
    expect(extractQuery(messages, "tv").category).toBe("tv");
  });

  it("limit 기본 10, budgetMax undefined, 반환값은 ProductQuerySchema를 통과한다", () => {
    const messages: ChatMessage[] = [{ role: "user", content: "x" }];
    const q = extractQuery(messages);
    expect(q.limit).toBe(10);
    expect(q.budgetMax).toBeUndefined();
    expect(ProductQuerySchema.safeParse(q).success).toBe(true);
  });
});
