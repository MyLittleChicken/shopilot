import { createRoot } from "react-dom/client";
import { ChatPanel } from "@shopilot/ui";

// 외부 사이트 CSS와 충돌하지 않도록 Shadow DOM에 격리 마운트한다.
// apiBaseUrl은 공개 변수(VITE_*)에서 읽어 주입한다. 시크릿은 클라 번들에 넣지 않는다.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

const host =
  document.getElementById("shopilot-root") ??
  document.body.appendChild(document.createElement("div"));

const shadow = host.attachShadow({ mode: "open" });
const mount = document.createElement("div");
shadow.appendChild(mount);

createRoot(mount).render(<ChatPanel apiBaseUrl={apiBaseUrl} />);
