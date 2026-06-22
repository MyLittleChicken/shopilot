/**
 * Shopilot UI 스타일 — ChatPanel이 <style>로 동반 렌더해 Shadow DOM 안에서도 적용된다.
 * 모든 규칙은 shopilot-* 스코프드 클래스로 한정(외부 사이트 CSS와 비충돌).
 * 컨테이너 쿼리로 좁은 위젯(1열)·넓은 웹(2~3열) 양쪽 대응.
 */
export const shopilotStyles = `
.shopilot-panel {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #1a1a1a;
  background: #fff;
  border-radius: 12px;
  box-sizing: border-box;
}
.shopilot-messages {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.shopilot-msg {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.shopilot-msg--user {
  align-self: flex-end;
  background: #2563eb;
  color: #fff;
}
.shopilot-msg--assistant {
  align-self: flex-start;
  background: #f1f3f5;
  color: #1a1a1a;
}
.shopilot-loading {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}
.shopilot-products {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
@container (min-width: 480px) {
  .shopilot-products { grid-template-columns: repeat(2, 1fr); }
}
@container (min-width: 720px) {
  .shopilot-products { grid-template-columns: repeat(3, 1fr); }
}
.shopilot-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}
.shopilot-card__title { font-size: 14px; font-weight: 600; }
.shopilot-card__brand { font-size: 12px; color: #6b7280; }
.shopilot-card__price { font-size: 15px; font-weight: 700; color: #111827; }
.shopilot-card__rating { font-size: 12px; color: #f59e0b; }
.shopilot-card__attrs {
  margin: 4px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 12px;
  color: #4b5563;
}
.shopilot-card__attr { display: flex; gap: 4px; }
.shopilot-card__attr dt { font-weight: 600; }
.shopilot-card__attr dd { margin: 0; }
.shopilot-input {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.shopilot-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}
.shopilot-input button {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
.shopilot-input button:hover { background: #1d4ed8; }
.shopilot-sronly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;
