#!/usr/bin/env node
// PreToolUse(Edit|Write|MultiEdit) — 하드코딩된 "실제 비밀 값" 기록 차단 (모든 파일).
import { readInput, deny, allow, newContentOf, norm, SECRET_VALUE_PATTERNS, isPlaceholder } from './_lib.mjs';

const input = await readInput();
const ti = input.tool_input || {};
const path = norm(ti.file_path || '');

// 훅 디렉터리(패턴 정의가 사는 곳)와 lock 파일은 스캔 제외 — 자기매칭 방지.
if (/\/\.claude\/hooks\//.test(path)) allow();
if (/(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/.test(path)) allow();

const content = newContentOf(ti);

for (const { name, re } of SECRET_VALUE_PATTERNS) {
  const m = content.match(re);
  if (m && !isPlaceholder(m[0])) {
    const masked = m[0].slice(0, 10) + '…';
    deny(
      `🔒 [block-hardcoded-secrets] ${path} 에 하드코딩된 비밀 값으로 보이는 문자열(${name})이 감지됐습니다: ${masked}\n` +
      `→ 실제 키는 코드에 박지 말고 .env(서버) 또는 시크릿 매니저로 옮기세요. 예시/플레이스홀더라면 'xxx'·'your-...' 형태로 적으면 통과합니다.`,
    );
  }
}
allow();
