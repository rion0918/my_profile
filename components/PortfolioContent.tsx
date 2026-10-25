import { profile, techGroups, careerGroups, socials } from "../lib/portfolio";

export function AboutContent() {
  return (
    <div className="aboutGrid">
      {profile.map(([label, value]) => (
        <article key={label} className="factRow">
          <p>{label}</p>
          <h3>{value}</h3>
        </article>
      ))}
    </div>
  );
}

export function TechContent() {
  return (
    <div className="techGrid">
      {techGroups.map((group) => (
        <article key={group.title} className="techGroup">
          <h3>{group.title}</h3>
          <div className="pillList">
            {group.items.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function CareerContent({ group }: { group?: 'experience' | 'history' }) {
  return <div className="careerGroups">
    {careerGroups.filter(item => !group || item.id === group).map(item => <section id={item.id} className="careerGroup" key={item.id}>
      {!group && <h2>{item.title}</h2>}
      <div className="careerFlow">
        {item.items.map((entry, index) => <article key={entry.title} className="careerItem">
          <div className="flowMeta"><span>{String(index + 1).padStart(2, '0')}</span><time>{entry.period}</time></div>
          <div>
            <h3>{'prefix' in entry && entry.prefix && <small>{entry.prefix}</small>}{entry.title}{'suffix' in entry && entry.suffix && <small>{entry.suffix}</small>}</h3>
            <p>{entry.description}</p>
            <div className="miniTags">{entry.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
            {'links' in entry && entry.links && <div className="careerLinks">
              {entry.links.map(link => <a className="textLink" key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}
            </div>}
          </div>
        </article>)}
      </div>
    </section>)}
  </div>;
}

export function SocialContent() {
  return (
    <div className="socialList">
      {socials.map((social) => (
        <a
          key={social.label}
          id={social.label.toLowerCase()}
          href={social.href}
          target="_blank"
          rel="noreferrer"
        >
          <span>{social.label}</span>
          <small>{social.display}</small>
        </a>
      ))}
    </div>
  );
}
