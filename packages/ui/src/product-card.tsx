import type { Product } from "@shopilot/schemas";

/** 상품 카드. green에서 브랜드·평점·attributes(제네릭) 표시를 채운다. */
export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="shopilot-card">
      <strong className="shopilot-card__title">{product.title}</strong>
      <span className="shopilot-card__price">{product.price.toLocaleString("ko-KR")}원</span>
    </article>
  );
}
