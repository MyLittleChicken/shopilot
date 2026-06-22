import { describe, it, expect } from "vitest";
import { ProductQuerySchema } from "@shopilot/schemas";
import type { ChatMessage } from "@shopilot/schemas";
import { understandQuery } from "./understand-query";
import { capturingLLM, throwingLLM } from "./test-support/llm-doubles";

const msgs = (t: string): ChatMessage[] => [{ role: "user", content: t }];

describe("understandQuery", () => {
  it("LLM이 budgetMax를 주면 추출해 query에 넣는다(text·category는 base 유지)", async () => {
    const llm = capturingLLM([{ type: "text", text: '{"budgetMax": 1000000}' }]);
    const q = await understandQuery(llm, msgs("100만원 이하 세탁기"), "appliance");
    expect(q.budgetMax).toBe(1000000);
    expect(q.text).toBe("100만원 이하 세탁기");
    expect(q.category).toBe("appliance");
    expect(ProductQuerySchema.safeParse(q).success).toBe(true);
  });

  it("budgetMax null이면 미설정(undefined)", async () => {
    const llm = capturingLLM([{ type: "text", text: '{"budgetMax": null}' }]);
    expect((await understandQuery(llm, msgs("세탁기"), "appliance")).budgetMax).toBeUndefined();
  });

  it("JSON 아님 / 양의정수 아님 / throw → base 폴백(budgetMax undefined)", async () => {
    expect((await understandQuery(capturingLLM([{ type: "text", text: "그냥 텍스트" }]), msgs("세탁기"), "appliance")).budgetMax).toBeUndefined();
    expect((await understandQuery(capturingLLM([{ type: "text", text: '{"budgetMax": -5}' }]), msgs("세탁기"), "appliance")).budgetMax).toBeUndefined();
    expect((await understandQuery(throwingLLM("iterate"), msgs("세탁기"), "appliance")).budgetMax).toBeUndefined();
  });

  it("프롬프트에 질의 text가 포함된다", async () => {
    const llm = capturingLLM([{ type: "text", text: '{"budgetMax": null}' }]);
    await understandQuery(llm, msgs("조용한 냉장고"), "appliance");
    const userText = llm.calls[0]?.messages.map((m) => m.content).join("\n") ?? "";
    expect(userText).toContain("조용한 냉장고");
  });
});
