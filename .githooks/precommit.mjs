#!/usr/bin/env node
// git pre-commit 보안 검사 — 모든 커밋터에게 적용(Claude 도구와 무관).
// 스테이징된 변경에서 (1) .env 등 금지 파일, (2) 하드코딩된 비밀 값을 차단한다.
// 우회: git commit --no-verify (권장하지 않음).
import { execFileSync } from "node:child_process";

const git = (args) => execFileSync("git", args, { encoding: "utf8" });
const norm = (p) => p.replace(/\\/g, "/");

// 실제 "비밀 값" 패턴. 정규식 리터럴 자체는 자기매칭하지 않도록 설계됨.
const SECRETS = [
  { name: "Anthropic API key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "OpenAI API key", re: /sk-(?:proj-)?[A-Za-z0-9]{24,}/ },
  { name: "Google API key", re: /AIza[0-9A-Za-z_-]{30,}/ },
  { name: "AWS access key id", re: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "Slack token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
  { name: "JWT", re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
];
const PLACEHOLDER = /(x{3,}|your[-_ ]?|placeholder|example|changeme|dummy|<[^>]+>|\.\.\.|REPLACE)/i;

// 커밋 금지 env 파일 (.env / .env.local 등은 금지, .env.example/.sample/.template 은 허용)
function isForbiddenEnvFile(p) {
  const base = norm(p).split("/").pop() || "";
  if (!/^\.env(\.|$)/.test(base)) return false;
  return !/\.(example|sample|template|dist)$/.test(base);
}

let staged = [];
try {
  staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACM"])
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
} catch {
  process.exit(0); // git 컨텍스트 아님 → 통과
}
if (!staged.length) process.exit(0);

const problems = [];

// 1) 금지 파일 스테이징
for (const f of staged) {
  if (isForbiddenEnvFile(f)) problems.push(`금지 파일 스테이징: ${f}`);
}

// 2) 스테이징된 텍스트에서 비밀 값 스캔 (바이너리·lock·훅 디렉터리 제외)
for (const f of staged) {
  const nf = norm(f);
  if (/\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|zip|gz|mp4|mov)$/i.test(nf)) continue;
  if (/(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/.test(nf)) continue;
  if (/\.githooks\//.test(nf)) continue; // 패턴 정의가 사는 곳
  let blob = "";
  try {
    blob = git(["show", `:${f}`]);
  } catch {
    continue;
  }
  for (const { name, re } of SECRETS) {
    const m = blob.match(re);
    if (m && !PLACEHOLDER.test(m[0])) {
      problems.push(`${f}: 하드코딩된 비밀 값 의심(${name}) — ${m[0].slice(0, 10)}…`);
    }
  }
}

if (problems.length) {
  console.error("\n✖ pre-commit 보안 검사 실패:\n");
  for (const p of problems) console.error("  - " + p);
  console.error("\n비밀 값은 .env(커밋 금지)로 옮기고, 금지 파일은 스테이징에서 내린 뒤 다시 커밋하세요.\n");
  process.exit(1);
}
process.exit(0);
