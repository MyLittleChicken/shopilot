import type { CategoryProfile } from "../ports";

/** 가전 카테고리 프로파일. 첫 대상. 새 카테고리는 프로파일+데이터만 추가해 확장한다. */
export const applianceProfile: CategoryProfile = {
  category: "appliance",
  systemPrompt:
    "당신은 가전·전자제품 쇼핑을 돕는 코파일럿입니다. 사용자의 예산·용도·설치 환경을 고려해 " +
    "비교 기준(용량·에너지등급·소음)을 중심으로 후보를 좁히고, 근거와 함께 제안합니다.",
  compareKeys: ["capacity", "energyGrade", "noiseLevel"],
};
