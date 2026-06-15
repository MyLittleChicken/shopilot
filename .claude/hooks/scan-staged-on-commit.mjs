#!/usr/bin/env node
// PreToolUse(Bash) — git commit 직전, 스테이징된 내용을 스캔.
//  · 금지 파일(.env) 스테이징 시 차단
//  · 스테이징된 텍스트에 비밀 값 의심 문자열 발견 시 차단 (gitleaks 경량판)
import { readInput, deny, allow, SECRET_VALUE_PATTERNS, isPlaceholder, isForbiddenEnvFile, norm } from './_lib.mjs';
import { execFileSync } from 'node:child_process';

const input = await readInput();
const cmd = String(input.tool_input?.command || '');
if (!/\bgit\s+commit\b/.test(cmd)) allow();

const cwd = input.cwd || process.cwd();
const git = (args) => execFileSync('git', args, { cwd, encoding: 'utf8' });

let files = [];
try {
  files = git(['diff', '--cached', '--name-only']).split('\n').map((s) => s.trim()).filter(Boolean);
} catch {
  allow(); // git 컨텍스트 아님 → 통과
}
if (!files.length) allow();

// 1) 금지 파일이 스테이징됐는가
const forbidden = files.filter((f) => isForbiddenEnvFile(f));
if (forbidden.length) {
  deny(`🔒 [scan-staged] 커밋 금지 파일이 스테이징됨: ${forbidden.join(', ')}\n→ \`git restore --staged <file>\` 로 내린 뒤 다시 커밋하세요.`);
}

// 2) 스테이징된 텍스트 내용 스캔 (바이너리·lock·훅 디렉터리 제외)
for (const f of files) {
  const nf = norm(f);
  if (/\.claude\/hooks\//.test(nf)) continue;
  if (/\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|zip|gz)$/i.test(nf)) continue;
  if (/(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/.test(nf)) continue;
  let blob = '';
  try { blob = git(['show', `:${f}`]); } catch { continue; }
  for (const { name, re } of SECRET_VALUE_PATTERNS) {
    const m = blob.match(re);
    if (m && !isPlaceholder(m[0])) {
      deny(`🔒 [scan-staged] ${f} 에 비밀 값(${name}) 의심 문자열이 있어 커밋을 막았습니다: ${m[0].slice(0, 10)}…\n→ 값을 제거/이동(.env)한 뒤 다시 커밋하세요.`);
    }
  }
}
allow();
