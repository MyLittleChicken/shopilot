import { ProductSchema } from "@shopilot/schemas";
import type { Product } from "@shopilot/schemas";

/**
 * 가전 시드 카탈로그 (목). ProductSchema.parse로 출력 타입(currency·attributes 포함)을 보장한다.
 * attributes 키는 capacity·energyGrade·noiseLevel로 고정(applianceProfile.compareKeys와 일치).
 * washer-1·washer-2는 동점 가격(690000) — 최저가 안정 정렬 회귀 방지.
 */
const raw = [
  { id: "fridge-1", title: "스마트 냉장고 300L", brand: "쿨테크", price: 890000, rating: 4.5, category: "appliance", attributes: { capacity: "300L", energyGrade: "1등급", noiseLevel: 35 } },
  { id: "fridge-2", title: "4도어 냉장고 600L", brand: "쿨테크", price: 1690000, rating: 4.7, category: "appliance", attributes: { capacity: "600L", energyGrade: "1등급", noiseLevel: 38 } },
  { id: "washer-1", title: "드럼 세탁기 12kg", brand: "워시킹", price: 690000, rating: 4.3, category: "appliance", attributes: { capacity: "12kg", energyGrade: "2등급", noiseLevel: 42 } },
  { id: "washer-2", title: "드럼 세탁기 10kg", brand: "워시킹", price: 690000, rating: 4.2, category: "appliance", attributes: { capacity: "10kg", energyGrade: "1등급", noiseLevel: 40 } },
  { id: "ac-1", title: "벽걸이 에어컨 6평", brand: "쿨바람", price: 540000, rating: 4.1, category: "appliance", attributes: { capacity: "6평", energyGrade: "3등급", noiseLevel: 44 } },
  { id: "vac-1", title: "무선 청소기 200W", brand: "클린업", price: 320000, rating: 4.6, category: "appliance", attributes: { capacity: "0.5L", energyGrade: "—", noiseLevel: 70 } },
  { id: "tv-1", title: "4K 스마트 TV 55형", brand: "비전", price: 850000, rating: 4.4, category: "appliance", attributes: { capacity: "55형", energyGrade: "2등급", noiseLevel: 25 } },
];

export const appliances: Product[] = raw.map((p) => ProductSchema.parse(p));
