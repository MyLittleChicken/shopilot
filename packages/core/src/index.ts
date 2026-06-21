/**
 * @shopilot/core 공개 표면(배럴).
 * 에이전트 파이프라인·어댑터·카테고리 프로파일. 코어는 인터페이스만 알고 구현체는 모른다.
 */
export * from "./ports";
export { extractQuery } from "./extract-query";
export { MockDataSourceAdapter } from "./mock-data-source";
export { appliances } from "./fixtures/appliances";
export { applianceProfile } from "./profiles/appliance";
export { createRunAgent, createDefaultRunAgent } from "./agent";
