// 공통 헬퍼 — Shopilot 보안 훅 (순수 Node, 외부 의존성 0)
// Claude Code 훅은 stdin으로 JSON을 받고, exit 2 + stderr 로 도구 호출을 차단한다.

/** stdin 전체를 JSON으로 읽는다. 실패 시 {} 반환. */
export async function readInput() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/** 도구 호출 차단 (Claude에게 사유 전달). */
export function deny(reason) {
  process.stderr.write(String(reason) + '\n');
  process.exit(2);
}

/** 이의 없음 — 정상 진행. */
export function allow() {
  process.exit(0);
}

/** Edit/Write/MultiEdit 입력에서 "새로 기록될 내용" 을 모은다. */
export function newContentOf(toolInput = {}) {
  if (typeof toolInput.new_string === 'string') return toolInput.new_string;
  if (typeof toolInput.file_content === 'string') return toolInput.file_content;
  if (typeof toolInput.content === 'string') return toolInput.content;
  if (Array.isArray(toolInput.edits)) {
    return toolInput.edits.map((e) => e?.new_string ?? '').join('\n');
  }
  return '';
}

/** 경로 정규화 (백슬래시 → 슬래시). */
export function norm(p = '') {
  return String(p).replace(/\\/g, '/');
}

/** 클라이언트 표면(서버 시크릿 금지 영역)인가? */
export function isClientPath(p) {
  const n = norm(p);
  return /(^|\/)(apps\/(web|widget)|packages\/ui)\//.test(n);
}

/** 실제 "비밀 값" 패턴 (변수 이름이 아니라 값). 정규식 리터럴 자체는 자기매칭하지 않도록 설계됨. */
export const SECRET_VALUE_PATTERNS = [
  { name: 'Anthropic API key',     re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'OpenAI API key',        re: /sk-(?:proj-)?[A-Za-z0-9]{24,}/ },
  { name: 'Google API key',        re: /AIza[0-9A-Za-z_-]{30,}/ },
  { name: 'AWS access key id',     re: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub token',          re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: 'GitHub fine-grained PAT', re: /github_pat_[A-Za-z0-9_]{40,}/ },
  { name: 'Slack token',           re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'Private key block',     re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
  { name: 'JWT (service-role 의심)', re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
];

/** client 코드에서 process.env.<NAME> 사용을 찾는다. */
export const ENV_REF_RE = /process\.env\.([A-Z0-9_]+)/g;

/** 그 env 이름이 "서버 전용 시크릿" 인가? (NEXT_PUBLIC_*, VITE_* 는 공개라 허용) */
export function isServerSecretEnvName(name) {
  if (name.startsWith('NEXT_PUBLIC_')) return false;
  if (name.startsWith('VITE_')) return false;
  return /(SECRET|API_KEY|_KEY$|TOKEN|SERVICE_ROLE|PASSWORD|DATABASE_URL|DB_URL|PRIVATE)/.test(name);
}

/** 플레이스홀더(가짜 예시)면 true — 차단 제외. */
export function isPlaceholder(s = '') {
  return /(x{3,}|y{3,}|your[-_ ]?|placeholder|example|changeme|dummy|<[^>]+>|\.\.\.|REPLACE)/i.test(s);
}

/** 커밋 금지 env 파일인가? (.env / .env.local 등은 금지, .env.example/.sample/.template 은 허용) */
export function isForbiddenEnvFile(p = '') {
  const base = norm(p).split('/').pop() || '';
  if (!/^\.env(\.|$)/.test(base)) return false;
  return !/\.(example|sample|template|dist)$/.test(base);
}
