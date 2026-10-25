import { halls, type HallId } from '../lib/world-halls';
import { products } from '../lib/products';
import { careerGroups, socials } from '../lib/portfolio';
import { HallProductExhibit } from './HallProductExhibit';

export function HallContent({ id }: { id: HallId }) {
  const hall = halls.find(h => h.id === id)!;
  const product = products.find(p => p.slug === id);
  if (product) return <div className={`hallContent hall-${id}`}><HallProductExhibit product={product} /></div>;

  if (id === 'history') {
    const entries = careerGroups.find(group => group.id === id)!.items;
    const school = entries[1], offer = entries[2];
    return <div className="hallContent hall-history">
      <div className="hallCareerHero">
        <div className="hallIntroduction">
          <h3>{hall.name}</h3>
        </div>
        <section className="hallCurrent" aria-label="現在の立場">
          <p className="hallCurrentLabel">現在の立場</p>
          <p className="hallCurrentSchool">{school.title}<span>{'suffix' in school && school.suffix} · {school.period}</span></p>
          <div className="hallCurrentOffer">
            <span className="hallOfferBadge">{offer.period}・内定</span>
            <h4>{offer.title}</h4>
            <p className="hallFactNote">{offer.description}</p>
          </div>
        </section>
      </div>
      <section className="hallHistoryExhibit" aria-labelledby="hall-history-heading">
        <h3 id="hall-history-heading">タイムライン</h3>
        <ol className="hallTimeline" aria-label="タイムライン">
          {entries.map(entry => <li key={entry.title}>
            <article className="hallCareerCard">
              <p className="hallTimelinePeriod">{entry.period}</p>
              <h3>{entry.title}{'suffix' in entry && entry.suffix && <small>{entry.suffix}</small>}</h3>
              <p>{entry.description}</p>
            </article>
          </li>)}
        </ol>
      </section>
    </div>;
  }

  if (id === 'experience') return <div className="hallContent hall-experience">
    <div className="hallIntroduction hallExperienceIntro">
      <h3>実務経験・活動</h3>
      <p>{hall.tagline}</p>
    </div>
    <div className="hallActivities">
      {careerGroups.find(group => group.id === id)!.items.map((entry, index) => <article className="hallCareerCard hallActivity" key={entry.title}>
        <p className="hallActivityType">{index === 0 ? '実務経験' : 'コミュニティづくり'}</p>
        <h3>{'prefix' in entry && entry.prefix && <small>{entry.prefix}</small>}{entry.title}</h3>
        <p className="hallActivityPeriod">{entry.period}</p>
        <p className="hallActivityDescription">{entry.description}</p>
        <div className="hallActivityTags">{entry.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
        {'links' in entry && entry.links && <div className="careerLinks">
          {entry.links.map(link => <a className="textLink" key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}
        </div>}
      </article>)}
    </div>
  </div>;

  const account = socials.find(s => s.href === hall.external!.href)!;
  const icon = id === 'github' ? '/images/brands/github-invertocat-white.png' : id === 'zenn' ? '/images/brands/zenn-mark.png' : '/images/brands/x-logo-white.png';
  return <div className={`hallContent hall-${id}`}>
    <div className="hallSocialHero">
      <div className="hallSocialMark"><img src={icon} alt={`${account.label}の公式アイコン`} width="180" height="180" /></div>
      <div className="hallIntroduction">
        <h3>{account.label}</h3>
        <p>{hall.tagline}</p>
        <p className="hallAccount">{account.display}</p>
        <a className="hallAction" href={hall.external!.href} target="_blank" rel="noopener noreferrer">{hall.external!.label} <span aria-hidden="true">↗</span></a>
        <p className="hallExternalNote">別タブで開きます。街の案内はそのまま続けられます。</p>
      </div>
    </div>
  </div>;
}
