import { ProductContent } from "./ProductContent";
import { halls, type HallId } from '../lib/world-halls';
import { products } from '../lib/products';
import { careerGroups } from '../lib/portfolio';

export function HallContent({ id }: { id: HallId }) {
  const hall = halls.find(h => h.id === id)!;
  const product = products.find(p => p.slug === id);
  const link = hall.external;
  return <div className={`hallContent hall-${id}`}>
    {!product && <p className="hallLead">{hall.tagline}</p>}
    {product && <ProductContent product={product} />}
    {(id === 'experience' || id === 'history') && <div className="hallCareerGrid">
      {careerGroups.find(group => group.id === id)!.items.map((entry, index) => <article className="hallCareerCard" key={entry.title}>
        <p className="hallCareerPeriod"><span>{String(index + 1).padStart(2, '0')}</span> {entry.period}</p>
        <h3>{'prefix' in entry && entry.prefix && <small>{entry.prefix}</small>}{entry.title}{'suffix' in entry && entry.suffix && <small>{entry.suffix}</small>}</h3>
        <p>{entry.description}</p>
        {id === 'experience' && <div className="miniTags">{entry.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
      </article>)}
    </div>}
    {(id === 'github' || id === 'zenn') && <p className="hallInvitation">{id === 'github' ? '取り組んできたコードやリポジトリは、GitHubでご覧いただけます。' : '技術についての学びや発信は、Zennでご覧いただけます。'}</p>}
    <a className="hallLinkDoor" href={link?.href ?? hall.href} target={link ? '_blank' : undefined} rel={link ? 'noopener noreferrer' : undefined}>
      <span><strong>{link?.label ?? (product ? `${product.name}の作品詳細へ` : id === 'history' ? 'これまでの歩みを詳しく読む' : '経験を詳しく読む')}</strong>
        <small>{link ? `${new URL(link.href).hostname} · 別タブで開きます` : product ? '制作の意図や、機能・使用技術を読む' : id === 'history' ? '学校・内定先について読む' : '実務経験とコミュニティ活動を読む'}</small></span>
      <span aria-hidden="true">{link ? '↗' : '→'}</span>
    </a>
    {id === 'history' && <p className="hallFactNote">合同会社DMM.comは、27卒 Webフロントエンドエンジニアとして内定しています。</p>}
    {product && <div className="hallDetailLinks">
      {link && <a className="textLink" href={hall.href}>機能・使用技術を詳しく読む ↗</a>}
      <a className="textLink" href="/tech">技術スタックの一覧を見る ↗</a>
    </div>}
  </div>;
}
