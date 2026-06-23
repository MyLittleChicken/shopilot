import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductSchema } from "@shopilot/schemas";
import { ChatPanel } from "./chat-panel";
import { frame, sseFetch, gatedSse } from "./test-support/mock-sse";

afterEach(cleanup);

const product = ProductSchema.parse({
  id: "w1",
  title: "드럼 세탁기 12kg",
  price: 690000,
  category: "appliance",
});

const fullStream = [
  frame({ type: "thinking", text: "…" }),
  frame({ type: "products", items: [product] }),
  frame({ type: "message", text: "세탁기 1개를 찾았어요." }),
  frame({ type: "done" }),
].join("");

describe("ChatPanel", () => {
  it("질의 전송 후 user 메시지·상품 카드·어시스턴트 멘트를 렌더한다", async () => {
    render(<ChatPanel apiBaseUrl="http://x" fetchImpl={sseFetch([fullStream])} />);
    await userEvent.type(screen.getByLabelText("메시지"), "세탁기");
    await userEvent.click(screen.getByRole("button", { name: "보내기" }));

    expect(await screen.findByText("세탁기")).toBeTruthy();
    expect(await screen.findByText("드럼 세탁기 12kg")).toBeTruthy();
    expect(await screen.findByText("세탁기 1개를 찾았어요.")).toBeTruthy();
  });

  it("thinking 동안 로딩이 켜지고 done에서 꺼진다", async () => {
    const gate = gatedSse();
    render(<ChatPanel apiBaseUrl="http://x" fetchImpl={gate.fetchImpl} />);
    await userEvent.type(screen.getByLabelText("메시지"), "가전");
    await userEvent.click(screen.getByRole("button", { name: "보내기" }));

    gate.push(frame({ type: "thinking", text: "…" }));
    expect(await screen.findByRole("status")).toBeTruthy();

    gate.push(frame({ type: "message", text: "끝" }));
    gate.push(frame({ type: "done" }));
    gate.close();

    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });

  it("스타일(<style>)을 동반 렌더해 Shadow DOM에서도 적용되게 한다", () => {
    const { container } = render(<ChatPanel apiBaseUrl="http://x" />);
    const style = container.querySelector("style");
    expect(style).toBeTruthy();
    const css = style?.textContent ?? "";
    expect(css).toContain(".shopilot-panel");
    expect(css).toContain(".shopilot-card");
    expect(css).toContain("@container");
    expect(css).toContain("@keyframes");
    expect(css).toContain("prefers-reduced-motion");
  });
});
