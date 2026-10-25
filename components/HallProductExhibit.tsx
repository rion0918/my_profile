"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Product } from '../lib/products';

function ProductGallery({ product }: { product: Product }) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [actualSize, setActualSize] = useState(false);
  const viewer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const media = product.media!;
  const current = media[index];
  const changeImage = (direction: number) => {
    setIndex(value => (value + direction + media.length) % media.length);
    setActualSize(false);
    viewport.current?.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!expanded) return;
    const modal = viewer.current!;
    modal.showModal();
    return () => {
      modal.close();
      if (trigger.current?.isConnected && trigger.current.closest('dialog')?.open) trigger.current.focus({ preventScroll: true });
    };
  }, [expanded]);

  const viewerKeys = (event: KeyboardEvent<HTMLDialogElement>) => {
    event.stopPropagation();
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !(actualSize && event.target === viewport.current)) {
      event.preventDefault();
      changeImage(event.key === 'ArrowLeft' ? -1 : 1);
    }
    if (event.key === 'Tab') {
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button, [tabindex="0"]');
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };

  return <>
    <section className="hallGallery" aria-label={`${product.name}の実画面`}>
      <button className="hallGalleryMain" ref={trigger} aria-label={`${product.name}の画面を拡大：${current.caption}`} onClick={() => { setActualSize(false); setExpanded(true); }}>
        <img src={current.src} alt={current.alt} />
        <span className="hallGalleryExpand">画面を拡大 <span aria-hidden="true">↗</span></span>
      </button>
      <div className="hallGalleryCaption" aria-live="polite"><span>{current.caption}</span><span>{String(index + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}</span></div>
      <div className="hallGalleryThumbnails" role="group" aria-label="表示する画面">
        {media.map((item, itemIndex) => <button key={item.src} aria-label={`${itemIndex + 1}枚目を表示：${item.caption}`} aria-pressed={index === itemIndex} onClick={() => setIndex(itemIndex)}>
          <img src={item.src} alt="" loading="lazy" /><span>{item.caption}</span>
        </button>)}
      </div>
    </section>
    {expanded && createPortal(<dialog className="hallImageViewer" ref={viewer} aria-label={`${product.name}の画像ビューアー`} onKeyDown={viewerKeys}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); setExpanded(false); }}
      onClick={event => { event.stopPropagation(); if (event.target === viewer.current) setExpanded(false); }}>
      <header className="hallImageToolbar"><span>{product.name}の実画面</span><button onClick={() => { setActualSize(value => !value); viewport.current?.scrollTo(0, 0); }}>{actualSize ? '画面に収める' : '実寸で表示'}</button><button onClick={() => setExpanded(false)} aria-label="画像ビューアーを閉じる">閉じる <span aria-hidden="true">×</span></button></header>
      <div className={`hallImageViewport${actualSize ? ' isActualSize' : ''}`} ref={viewport} role="region" aria-label="画像表示領域" tabIndex={actualSize ? 0 : -1}><img src={current.src} alt={current.alt} /></div>
      <footer className="hallImageFooter"><button onClick={() => changeImage(-1)} aria-label="前の画像">←</button><p aria-live="polite">{current.caption}<span>{index + 1} / {media.length}</span></p><button onClick={() => changeImage(1)} aria-label="次の画像">→</button></footer>
    </dialog>, document.body)}
  </>;
}

export function HallProductExhibit({ product }: { product: Product }) {
  const overviewId = `hall-${product.slug}-overview`, featuresId = `hall-${product.slug}-features`, techId = `hall-${product.slug}-tech`;
  const jumpTo = (id: string) => {
    const target = document.getElementById(id);
    target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    target?.focus({ preventScroll: true });
  };
  const facts = [['想定ユーザー', product.audience], ['開発期間', product.period], ['開発体制', product.team], ['担当範囲', product.role]].filter(([, value]) => value);
  return <div className={`hallProductExhibit product-${product.slug}`}>
    <nav className="hallChapterNav" aria-label="館内の展示">
      {[['概要', overviewId], ['画面と機能', featuresId], ['使用技術', techId]].map(([label, id]) => <button key={id} onClick={() => jumpTo(id)} aria-label={`${label}へ移動`}>{label}</button>)}
    </nav>
    <section id={overviewId} className="hallProductHero" tabIndex={-1} aria-label={`${product.name}の概要`}>
      <div className="hallProductIntroduction">
        <h3>{product.name}</h3>
        <p className="hallProductSummary">{product.summary}</p>
        {product.status && <p>{product.status}</p>}
      </div>
      {product.media?.length ? <ProductGallery product={product} /> : null}
      <div className="hallProductContext"><p className="hallProductPlatform">{product.technologies.slice(1, 3).join(' / ')}</p>{product.mediaNote && <p className="hallProductMediaNote">{product.mediaNote}</p>}</div>
    </section>
    <section className="hallExhibitSection" aria-labelledby={featuresId}>
      <h3 id={featuresId} tabIndex={-1}>画面と機能</h3>
      <div className="hallFeatures">{product.features.map(feature => <article className="hallFeature" key={feature.title}><h4>{feature.title}</h4><p>{feature.description}</p></article>)}</div>
    </section>
    <section className="hallExhibitSection" aria-labelledby={techId}>
      <h3 id={techId} tabIndex={-1}>使用技術</h3>
      <div className="hallTechnologies">{product.technologies.map(tech => <span key={tech}>{tech}</span>)}</div>
      {facts.length > 0 && <dl className="hallProductFacts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      {product.decisions && <div className="hallProductNotes"><h4>設計の考え方</h4>{product.decisions.map(text => <p key={text}>{text}</p>)}</div>}
      {product.outcomes && <div className="hallProductNotes"><h4>成果と学び</h4>{product.outcomes.map(text => <p key={text}>{text}</p>)}</div>}
      <div className="hallProductLinks">{product.links?.map(link => <a className="hallAction" href={link.href} key={link.href} target="_blank" rel="noopener noreferrer">{link.label} <span aria-hidden="true">↗</span></a>)}<a className="textLink" href="/tech">技術スタックの一覧を見る ↗</a></div>
      {product.links?.length ? <p className="hallExternalNote">外部サイトは別タブで開きます。</p> : null}
    </section>
  </div>;
}
