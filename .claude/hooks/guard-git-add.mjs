#!/usr/bin/env node
// PreToolUse(Bash) — 위험한 git 스테이징 차단.
//  · .env* 가 스테이징되는 명령 차단 (.env.example 등 템플릿은 허용)
//  · 광역 스테이징(git add . / -A / --all, git commit -a) 차단 → 파일 명시 유도
import { readInput, deny, allow, isForbiddenEnvFile } from './_lib.mjs';

const input = await readInput();
const cmd = String(input.tool_input?.command || '');

if (!/\bgit\b/.test(cmd)) allow();

const isAdd = /\bgit\s+(add|stage)\b/.test(cmd);
const isCommitAll = /\bgit\s+commit\b[^|&;]*\s(-a|--all|-[a-zA-Z]*a[a-zA-Z]*)\b/.test(cmd);

if (!isAdd && !isCommitAll) allow();

// 금지 파일(.env 등)이 명령에 직접 등장
for (const token of cmd.split(/\s+/)) {
  if (isForbiddenEnvFile(token)) {
    deny(`🔒 [guard-git-add] .env* 파일은 커밋 금지입니다(.env.example 등 템플릿은 허용): ${token}`);
  }
}

// 광역 스테이징 차단
if (/\bgit\s+add\s+(-A|--all|\.)(\s|$)/.test(cmd) || isCommitAll) {
  deny(
    `🔒 [guard-git-add] 광역 스테이징(git add . / -A / --all, git commit -a)은 금지입니다.\n` +
    `→ .env·시크릿이 휩쓸려 들어갈 위험이 있어, 커밋할 파일을 명시적으로 지정하세요. 명령: ${cmd}`,
  );
}
allow();
