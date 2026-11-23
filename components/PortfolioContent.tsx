import { profile, career, activities, socials, type TimelineEntry } from "../lib/portfolio";

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

function TimelineEntryBody({ entry }: { entry: TimelineEntry }) {
  return (
    <div>
      <h3>
        {entry.prefix && <small>{entry.prefix}</small>}
        {entry.title}
        {entry.suffix && <small>{entry.suffix}</small>}
      </h3>
      <p>{entry.description}</p>
      {entry.links && (
        <div className="careerLinks">
          {entry.links.map((link) => (
            <a className="textLink" key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>
          ))}
        </div>
      )}
    </div>
  );
}

export function CareerContent() {
  return (
    <div className="careerFlow">
      {career.map((entry, index) => (
        <article key={entry.title} className="careerItem">
          <div className="flowMeta">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <time>{entry.period.split(/(?=（)/).map((part, partIndex) => (partIndex === 0 ? part : <span className="periodNote" key={part}>{part}</span>))}</time>
          </div>
          <TimelineEntryBody entry={entry} />
        </article>
      ))}
    </div>
  );
}

export function ActivitiesContent() {
  return (
    <div className="activityList">
      {activities.map((entry, index) => (
        <article key={entry.title} className="activityItem">
          <div className="activityMeta">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <small>{entry.period}</small>
          </div>
          <TimelineEntryBody entry={entry} />
        </article>
      ))}
    </div>
  );
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
