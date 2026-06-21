import type { ChatMessage, Product, ProductQuery } from "@shopilot/schemas";

/* ── LLM 어댑터 (provider-agnostic) ──
   Claude/OpenAI/Gemini를 동일 인터페이스 뒤에서 교체한다. */
export interface ToolSpec {
  name: string;
  description: string;
  schema: unknown;
}
export type LLMChunk =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; args: unknown };
export interface LLMAdapter {
  readonly name: string;
  stream(input: { messages: ChatMessage[]; system?: string; tools?: ToolSpec[] }): AsyncIterable<LLMChunk>;
}

/* ── 데이터 소스 어댑터 (목 ↔ 시드 ↔ 실데이터) ── */
export interface DataSourceAdapter {
  readonly name: string;
  search(query: ProductQuery): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
}

/* ── 카테고리 프로파일 ──
   파이프라인은 하나로 유지하고, 카테고리 차이는 프로파일(시스템 프롬프트·비교 기준·설정)로 다룬다. */
export interface CategoryProfile {
  readonly category: string;
  readonly systemPrompt: string;
  /** 비교·추천 시 중요하게 보는 attributes 키 */
  readonly compareKeys: readonly string[];
}

/** 카테고리 → 프로파일 레지스트리 */
export class ProfileRegistry {
  private readonly map = new Map<string, CategoryProfile>();
  register(profile: CategoryProfile): void {
    this.map.set(profile.category, profile);
  }
  get(category: string): CategoryProfile | null {
    return this.map.get(category) ?? null;
  }
  categories(): string[] {
    return [...this.map.keys()];
  }
}

/** runAgent 파이프라인이 주입받는 의존성. 코어는 인터페이스만 알고 구현체는 모른다. */
export interface RunAgentDeps {
  dataSource: DataSourceAdapter;
  profiles: ProfileRegistry;
  // llm?: LLMAdapter;  // 슬라이스 1 미사용. 후속 슬라이스에서 주입.
}
