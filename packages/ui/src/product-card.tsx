import type { Product } from "@shopilot/schemas";

/** attributes 값은 unknown — 표시 가능한 string/number만 좁혀 렌더한다(가전 전용 키 하드코딩 안 함). */
function displayableAttributes(attrs: Product["attributes"]): [string, string][] {
  return Object.entries(attrs)
    .filter(([, v]) => typeof v === "string" || typeof v === "number")
    .map(([k, v]) => [k, String(v)] as [string, string]);
}

export function ProductCard({ product }: { product: Product }) {
  const attrs = displayableAttributes(product.attributes);
  return (
    <article className="shopilot-card">
      <div className="shopilot-card__media">
        {product.imageUrl !== undefined ? (
          <img src={product.imageUrl} alt={product.title} loading="lazy" />
        ) : (
          <span className="shopilot-card__placeholder" aria-hidden="true">
            {product.title.slice(0, 1)}
          </span>
        )}
      </div>
      <strong className="shopilot-card__title">{product.title}</strong>
      {product.brand !== undefined && <span className="shopilot-card__brand">{product.brand}</span>}
      <span className="shopilot-card__price">{product.price.toLocaleString("ko-KR")}원</span>
      {product.rating !== undefined && <span className="shopilot-card__rating">★ {product.rating}</span>}
      {attrs.length > 0 && (
        <dl className="shopilot-card__attrs">
          {attrs.map(([k, v]) => (
            <div key={k} className="shopilot-card__attr">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
