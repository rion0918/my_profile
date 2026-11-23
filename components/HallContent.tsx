import { halls, type HallId } from '../lib/world-halls';
import { products } from '../lib/products';
import { career, activities, socials } from '../lib/portfolio';
import { HallProductExhibit } from './HallProductExhibit';

export function HallContent({ id }: { id: HallId }) {
  const hall = halls.find(h => h.id === id)!;
  const product = products.find(p => p.slug === id);
  if (product) return <div className={`hallContent hall-${id}`}><HallProductExhibit product={product} /></div>;

  if (id === 'history') {
    const entries = [...career].reverse();
    const school = career.find(entry => entry.title === '神戸電子専門学校')!;
    const offer = career.find(entry => entry.title === '合同会社DMM.com')!;
    return <div className="hallContent hall-history">
      <div className="hallCareerHero">
        <div className="hallIntroduction">
          <h3>{hall.name}</h3>
        </div>
        <section className="hallCurrent" aria-label="現在の立場">
          <p className="hallCurrentLabel">現在の立場</p>
          <p className="hallCurrentSchool">{school.title}<span>{school.suffix} · {school.period}</span></p>
          <div className="hallCurrentOffer">
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
              <h3>{entry.title}{entry.suffix && <small>{entry.suffix}</small>}</h3>
              <p>{entry.description}</p>
            </article>
          </li>)}
        </ol>
      </section>
    </div>;
  }

  if (id === 'experience') return <div className="hallContent hall-experience">
    <div className="hallIntroduction hallExperienceIntro">
      <h3>{hall.name}</h3>
      <p>{hall.tagline}</p>
    </div>
    <div className="hallActivities">
      {activities.map(entry => <article className="hallCareerCard hallActivity" key={entry.title}>
        <h3>{entry.prefix && <small>{entry.prefix}</small>}{entry.title}</h3>
        <p className="hallActivityPeriod">{entry.period}</p>
        <p className="hallActivityDescription">{entry.description}</p>
        {entry.links && <div className="careerLinks">
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
