#!/usr/bin/env node
// PreToolUse(Edit|Write|MultiEdit) — 클라이언트 코드에 서버 시크릿 유입 차단.
// "시크릿은 서버에만" (CLAUDE.md §8) 강제. 클라이언트엔 NEXT_PUBLIC_*/VITE_* 만 허용.
import { readInput, deny, allow, newContentOf, isClientPath, norm, ENV_REF_RE, isServerSecretEnvName } from './_lib.mjs';

const input = await readInput();
const ti = input.tool_input || {};
const path = norm(ti.file_path || '');

// 클라이언트 표면(apps/web, apps/widget, packages/ui)이 아니면 관심 없음.
if (!isClientPath(path)) allow();
// 타입/환경 선언 파일은 예외 (값이 아니라 선언일 뿐)
if (/\.d\.ts$|env\.example$/.test(path)) allow();

const content = newContentOf(ti);

// 1) 서버 전용 env 사용 탐지
const hits = new Set();
let m;
while ((m = ENV_REF_RE.exec(content))) {
  if (isServerSecretEnvName(m[1])) hits.add(m[1]);
}

// 2) 서버/LLM SDK를 클라이언트로 import 하는 행위 탐지
const serverImport = content.match(
  /from\s+['"](@anthropic-ai\/sdk|openai|@google\/generative-ai|hono(?:\/.*)?|.*\/server(?:\/.*)?)['"]/,
);

if (hits.size || serverImport) {
  const parts = [];
  if (hits.size) parts.push(`서버 전용 시크릿 사용: ${[...hits].join(', ')}`);
  if (serverImport) parts.push(`서버/LLM SDK import: ${serverImport[1]}`);
  deny(
    `🔒 [block-client-secrets] 클라이언트 코드(${path})에서 ${parts.join(' / ')} 가 감지됐습니다.\n` +
    `→ 시크릿·LLM 호출·서버 어댑터는 apps/server 에만 두세요. 클라이언트는 서버 API를 호출하고, 공개 변수는 NEXT_PUBLIC_*/VITE_* 만 사용합니다.`,
  );
}
allow();
