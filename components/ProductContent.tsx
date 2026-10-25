import { products, type Product } from "../lib/products";

export function ProductList() {
  return (
    <div className="productList">
      {products.map((product, index) => (
        <a
          className="productLink"
          href={`/projects/${product.slug}`}
          key={product.slug}
        >
          <span className="productNumber">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3>{product.name}</h3>
            <p>{product.summary}</p>
            <span className="textLink">作品を読む ↗</span>
          </div>
          {product.media?.[0] && <div className={`productListPreview product-${product.slug}`} aria-hidden="true">
            <img src={product.media[0].src} alt="" loading="lazy" />
          </div>}
        </a>
      ))}
    </div>
  );
}

export function ProductContent({ product }: { product: Product }) {
  return (
    <div className={`productDetail product-${product.slug}`}>
      <div className="productHero">
        <div className="productIntroduction">
          <p className="productLead">{product.summary}</p>
          {product.status && <p>{product.status}</p>}
          <p className="productPlatform">{product.technologies.slice(1, 3).join(" / ")}</p>
          {product.mediaNote && <p className="productMediaNote">{product.mediaNote}</p>}
        </div>
        {product.media && <section className="productShowcase" aria-label={`${product.name}のアプリ画面`}>
          {product.media.map((media) => <figure key={media.src}>
            <a href={media.src} target="_blank" rel="noopener noreferrer" className="productScreen" aria-label={`${media.alt}。画像を拡大する`}>
              <img src={media.src} alt={media.alt} loading="lazy" />
            </a>
            <figcaption>{media.caption}</figcaption>
          </figure>)}
        </section>}
      </div>
      {product.features.map((feature) => (
        <section key={feature.title}>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </section>
      ))}
      <section>
        <h3>使用技術</h3>
        <div className="pillList">
          {product.technologies.map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </div>
      </section>
      {(product.audience || product.period || product.team || product.role) && (
        <dl>
          {[
            ["想定ユーザー", product.audience],
            ["開発期間", product.period],
            ["開発体制", product.team],
            ["担当範囲", product.role],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      )}
      {product.decisions && (
        <section>
          <h3>設計の考え方</h3>
          {product.decisions.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </section>
      )}
      {product.outcomes && (
        <section>
          <h3>成果と学び</h3>
          {product.outcomes.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </section>
      )}
      {product.links?.map((link) => (
        <a
          className="textLink"
          href={link.href}
          target="_blank"
          rel="noreferrer"
          key={link.href}
        >
          {link.label} ↗
        </a>
      ))}
    </div>
  );
}
