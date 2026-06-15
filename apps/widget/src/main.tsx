import { createRoot } from "react-dom/client";
import { ChatPanel } from "@shopilot/ui";

// 외부 사이트 CSS와 충돌하지 않도록 Shadow DOM에 격리 마운트한다.
const host =
  document.getElementById("shopilot-root") ??
  document.body.appendChild(document.createElement("div"));

const shadow = host.attachShadow({ mode: "open" });
const mount = document.createElement("div");
shadow.appendChild(mount);

createRoot(mount).render(<ChatPanel />);
