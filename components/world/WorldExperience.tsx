"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { halls } from "../../lib/world-halls";
import { welcomeStorageKey } from "../../lib/world-zones";
import WorldAudio from "./WorldAudio";
import WorldGuide from "./WorldGuide";
import type { WorldMapData } from "../../lib/world-map-data";
import type { WorldNavigation } from "../../lib/world-map";
import { ModeBar, rememberWorldModeChoice } from "../ModeBar";
import { sections } from "../../lib/sections";
import { tourStops, type TourPhase } from "../../lib/world-tour";
import type { WorldQuality } from "../../lib/world-quality";
const WorldCanvas = dynamic(() => import("./WorldCanvas"), {
  ssr: false,
  loading: () => (
    <div className="worldLoading" role="status">
      街を準備しています
      <span>「街の案内」から、先にプロフィールや作品を読めます。</span>
    </div>
  ),
});
function Fallback() {
  return (
    <div className="worldLoading worldFallback" role="status">
      <strong>この環境では3Dを表示できませんでした。</strong>
      <span>
        プロフィール・経歴・作品は、「街の案内」からそのまま読めます。
      </span>
      <Link className="fallbackLink" href="/profile" onNavigate={rememberWorldModeChoice}>
        通常表示で読む ↗
      </Link>
    </div>
  );
}
class WorldBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() { this.props.onError(); }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
export default function WorldExperience({
  panels,
  hallPanels,
  map,
  mapFailed,
}: {
  panels: Record<string, ReactNode>;
  hallPanels: Record<string, ReactNode>;
  map: WorldMapData | null;
  mapFailed: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const unavailable = failed || mapFailed;
  const [quality, setQuality] = useState<WorldQuality>("quality");
  const [selected, setSelected] = useState<string | null>(null);
  const [navigation,setNavigation]=useState<WorldNavigation|null>(null);
  const [phase, setPhase] = useState<TourPhase>('intro');
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const tourActive = useRef(false);
  const focusGeneration = useRef(0);
  const focusTarget = useRef<string | null>(null);
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const dismissWelcome = useCallback(() => {
    setPhase('exploring');
    try { sessionStorage.setItem(welcomeStorageKey, 'seen'); } catch { /* Optional storage. */ }
  }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  const entry = useRef<HTMLDivElement>(null);
  const entryExplore = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const openedHere = useRef(false);
  const syncUrl = useCallback(() => {
    ++focusGeneration.current;
    tourActive.current = false;
    navigationRef.current?.cancelFocus();
    const id = new URLSearchParams(location.search).get("detail");
    setSelected(sections.some((section) => section.id === id) ? id : null);
    setPhase('exploring');
    openedHere.current = false;
  }, []);
  useEffect(() => {
    const legacyAnchor = () => {
      if (
        ["#about", "#tech", "#career", "#social", "#products", "#top"].includes(
          location.hash,
        )
      ) {
        location.replace(`/profile${location.hash}`);
        return true;
      }
      return false;
    };
    if (legacyAnchor()) return;
    syncUrl();
    if (!new URLSearchParams(location.search).has('detail')) {
      try { setPhase(sessionStorage.getItem(welcomeStorageKey) === 'seen' ? 'exploring' : 'intro'); }
      catch { setPhase('intro'); }
    }
    setReady(true);
    window.addEventListener("popstate", syncUrl);
    window.addEventListener("hashchange", legacyAnchor);
    return () => {
      window.removeEventListener("popstate", syncUrl);
      window.removeEventListener("hashchange", legacyAnchor);
    };
  }, [syncUrl]);
  const select = useCallback((id: string) => {
    if (!sections.some((section) => section.id === id)) return;
    ++focusGeneration.current;
    tourActive.current = false;
    navigationRef.current?.cancelFocus();
    dismissWelcome();
    const active=document.activeElement as HTMLElement;
    returnFocus.current=active.closest('.worldWelcome')?document.querySelector<HTMLElement>('.worldSurface'):active;
    const url = new URL(location.href);
    url.searchParams.set("detail", id);
    history.pushState(null, "", url);
    openedHere.current = true;
    setSelected(id);
  }, [dismissWelcome]);
  const close = useCallback(() => {
    ++focusGeneration.current;
    tourActive.current = false;
    navigationRef.current?.cancelFocus();
    setSelected(null);
    dismissWelcome();
    if (openedHere.current) {
      openedHere.current = false;
      history.back();
    } else {
      const url = new URL(location.href);
      url.searchParams.delete("detail");
      url.searchParams.set("mode", "world");
      history.replaceState(null, "", url);
    }
    navigationRef.current?.explore();
  }, [dismissWelcome]);
  const goToStop = async (index: number, starting = false) => {
    const stop = tourStops[index];
    if (!stop) return;
    const generation = ++focusGeneration.current;
    navigationRef.current?.cancelFocus();
    tourActive.current = true;
    setFinishing(false);
    focusTarget.current = stop.id;
    dismissWelcome();
    setStep(index);
    setSelected(null);
    setPhase('focusing');
    returnFocus.current = document.querySelector<HTMLElement>('.worldSurface');
    const url = new URL(location.href);
    url.searchParams.set('detail', stop.id);
    if (starting) { history.pushState(null, '', url); openedHere.current = true; }
    else history.replaceState(null, '', url);
    const completed = navigationRef.current ? await navigationRef.current.focusTo(stop.id) : true;
    if (completed && generation === focusGeneration.current) {
      setSelected(stop.id);
      setPhase('reading');
    }
  };
  const finishTour = async () => {
    const generation = ++focusGeneration.current;
    navigationRef.current?.cancelFocus();
    focusTarget.current = null;
    setFinishing(true);
    setSelected(null);
    setPhase('focusing');
    const completed = navigationRef.current ? await navigationRef.current.focusTo('fork') : true;
    if (completed && generation === focusGeneration.current) {
      const url = new URL(location.href);
      url.searchParams.delete('detail');
      url.searchParams.set('mode', 'world');
      history.replaceState(null, '', url);
      setPhase('complete');
    }
  };
  const complete = phase === 'complete';
  const entryVisible = phase === 'intro' && !selected;
  useEffect(() => {
    if (entryVisible) entry.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }, [entryVisible]);
  useEffect(() => {
    if (!entryVisible && entryExplore.current && navigation) {
      entryExplore.current = false;
      navigation.explore();
    }
  }, [entryVisible, navigation]);
  const modalVisible = !!selected || complete;
  useEffect(() => {
    const modal = dialog.current;
    if (modalVisible && modal && !modal.open) {
      modal.showModal();
      modal.scrollTop = 0;
      modal.querySelector<HTMLElement>('#detail-title')?.focus({ preventScroll: true });
    }
    if (modalVisible && modal) {
      const body = modal.querySelector<HTMLElement>('.hallDialogBody');
      if (body) {
        body.scrollTop = 0;
        modal.querySelector<HTMLElement>('#detail-title')?.focus({ preventScroll: true });
      }
    }
    if (!modalVisible && modal?.open) {
      modal.close();
      returnFocus.current?.focus({ preventScroll: true });
    }
    if (modalVisible) {
      const before = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = before;
      };
    }
  }, [selected, modalVisible]);
  const error = useCallback(() => {
    setFailed(true);
    navigationRef.current?.cancelFocus();
    if (tourActive.current && focusTarget.current) {
      ++focusGeneration.current;
      setSelected(focusTarget.current);
      setPhase('reading');
    } else if (tourActive.current) {
      ++focusGeneration.current;
      setPhase('complete');
      setSelected(null);
      const url = new URL(location.href); url.searchParams.delete('detail'); url.searchParams.set('mode', 'world'); history.replaceState(null, '', url);
    } else {
      setPhase(currentPhase => currentPhase === 'intro' ? 'intro' : 'exploring');
    }
  }, []);
  useEffect(() => () => { ++focusGeneration.current; navigationRef.current?.cancelFocus(); }, []);
  const guided = tourActive.current && (phase === 'focusing' || phase === 'reading');
  const current = sections.find((section) => section.id === selected);
  const currentHall = halls.find(hall => hall.id === selected);
  const hallTheme = currentHall?.theme;
  const hallStyle = hallTheme ? {
    '--hall-accent': `#${hallTheme.primary.toString(16).padStart(6, '0')}`,
    '--hall-surface': `#${hallTheme.surface.toString(16).padStart(6, '0')}`,
    '--hall-light': `#${hallTheme.light.toString(16).padStart(6, '0')}`,
  } as CSSProperties : undefined;
  return (
    <div className="worldPage" data-tour-phase={phase}>
      <main className="worldMain" inert={entryVisible}>
        <h1 className="worldScreenReaderOnly">橋本怜苑のポートフォリオ</h1>
        <div className="worldToolbar" role="group" aria-label="表示と街の案内">
          <ModeBar mode="world" />
          <WorldAudio quality={quality} onQualityChange={setQuality} />
          <WorldGuide map={map} navigation={navigation} onSelect={select} onTour={() => void goToStop(0, true)} canTour={!!navigation || unavailable} onExplore={() => { if (tourActive.current) close(); else dismissWelcome(); }}/>
        </div>
        <div className="worldStage">
          {!map ? <div className={`worldLoading${mapFailed ? ' worldFallback' : ''}`} role={mapFailed ? 'alert' : 'status'}>
            {mapFailed ? '地図を読み込めませんでした。' : '街を準備しています'}
            <span>プロフィールや作品は「街の案内」から読めます。</span>
            <Link className="fallbackLink" href="/profile" onNavigate={rememberWorldModeChoice}>通常表示で読む ↗</Link>
          </div> : ready ? (
            <WorldBoundary onError={error}>
              {failed ? (
                <Fallback />
              ) : (
                <WorldCanvas
                  streets={map.streets}
                  quality={quality}
                  paused={!!selected || phase !== 'exploring'}
                  onSelect={select}
                  onError={error}
                  onReady={setNavigation}
                  onExplore={dismissWelcome}
                />
              )}
            </WorldBoundary>
          ) : (
            <div className="worldLoading" role="status">
              街を準備しています
            </div>
          )}
        </div>
        {phase === 'focusing' && <section className="tourTravel" aria-label="展示へ移動中">
          <p role="status">{finishing ? '案内のまとめへ · 中央広場へ移動中' : `${String(step + 1).padStart(2, '0')} / ${tourStops.length} · ${tourStops[step].title}へ`}</p>
          <Link href="/profile" onNavigate={rememberWorldModeChoice}>通常表示で読む</Link>
          <button onClick={close}>案内を離れて探索</button>
        </section>}

      </main>
      {entryVisible && <div className="worldEntry" ref={entry} role="dialog" aria-modal="true" aria-label="閲覧方法を選択" aria-describedby="welcome-summary"
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); }
          if (event.key !== 'Tab') return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
          const first = controls[0], last = controls[controls.length - 1];
          const index = controls.indexOf(document.activeElement as HTMLElement);
          if (event.shiftKey && index <= 0) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && (index < 0 || document.activeElement === last)) { event.preventDefault(); first.focus(); }
        }}>
        <section className="worldWelcome" aria-label="街の入口">
          <div className="welcomeIdentity">
            <p className="welcomeKicker">Portfolio</p>
            <h2 tabIndex={-1}>橋本怜苑</h2>
            <p className="welcomeSummary" id="welcome-summary">神戸電子専門学校<span>Web・アプリ開発</span></p>
          </div>
          <div className="welcomeActions">
            <button className="welcomeTour" disabled={!navigation && !unavailable} aria-label="案内を見る" aria-describedby="welcome-tour-help" onClick={() => void goToStop(0, true)}>
              <span><strong>案内を見る</strong><small id="welcome-tour-help">{!navigation && !unavailable ? '3Dを準備中' : '操作なし・4館'}</small></span><span aria-hidden="true">→</span>
            </button>
            <Link href="/profile" onNavigate={rememberWorldModeChoice} aria-label="通常表示で読む"><span><strong>通常表示</strong><small>文章で読む</small></span><span aria-hidden="true">↗</span></Link>
            <button aria-label="自由に探索する" onClick={() => { entryExplore.current = true; dismissWelcome(); }}><span><strong>自由に探索</strong><small>自分で操作</small></span><span aria-hidden="true">→</span></button>
          </div>
        </section>
      </div>}
      <dialog
        className={`detailDialog${currentHall ? ' hallDialog' : ''}`}
        style={hallStyle}
        ref={dialog}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
        aria-labelledby="detail-title"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
            ),
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        {currentHall && <header className="hallDialogHeader">
          <h2 id="detail-title" tabIndex={-1}>{currentHall.name}</h2>
          <Link href={currentHall.href} onNavigate={rememberWorldModeChoice} aria-label="通常表示で読む ↗">通常表示 <span aria-hidden="true">↗</span></Link>
          <button onClick={close} aria-label={guided ? '案内を離れて探索' : '詳細を閉じる'}>街へ戻る <span aria-hidden="true">×</span></button>
        </header>}
        <div className={`dialogInner${currentHall ? ' hallDialogBody' : ''}`} key={selected ?? 'complete'}>
          {!currentHall && <div className="dialogToolbar">
            {(guided || complete) && <Link className="textLink" href="/profile" onNavigate={rememberWorldModeChoice}>通常表示で読む ↗</Link>}
            {current && <Link className="textLink" href={current.href} onNavigate={rememberWorldModeChoice}>
              この詳細のURLを開く ↗
            </Link>}
            {!complete && <button onClick={close} aria-label={guided ? "案内を離れて探索" : "詳細を閉じる"}>
              {guided ? '案内を離れて探索' : '閉じる'} <span aria-hidden="true">×</span>
            </button>}
          </div>}
          {guided && !currentHall && <nav className="tourProgress" aria-label="案内の順番">
            {tourStops.map((stop, index) => <span key={stop.id} aria-current={index === step ? 'step' : undefined}>
              {String(index + 1).padStart(2, '0')}<span>{stop.title}</span>
            </span>)}
          </nav>}
          {!currentHall && <h2 id="detail-title" tabIndex={-1}>{complete ? '採用向けの案内はここまで' : guided ? tourStops[step].title : current?.title}</h2>}
          {complete ? <div className="tourComplete">
            <p className="hallLead">経歴と2つの作品をご覧いただき、ありがとうございます。</p>
            <p>ここは中央広場です。開発の記録を確認したり、北の温泉や港へ街歩きを続けたりできます。</p>
            <div className="tourCompleteLinks">{halls.filter(h => h.id === 'github' || h.id === 'zenn' || h.id === 'x').map(h => <a key={h.id} className="hallLinkDoor" href={h.external!.href} target="_blank" rel="noopener noreferrer">
              <span><strong>{h.external!.label}</strong><small>{h.tagline} · 別タブで開きます</small></span><span aria-hidden="true">↗</span>
            </a>)}</div>
            <Link className="textLink" href="/profile" onNavigate={rememberWorldModeChoice}>経歴と作品を通常表示で読む ↗</Link>
          </div> : selected && (hallPanels[selected] ?? panels[selected])}

        </div>
        {guided && <footer className="tourFooter">
          <button disabled={step === 0} onClick={() => void goToStop(step - 1)}>← 前へ</button>
          <span aria-label={`全${tourStops.length}展示中${step + 1}番目`}>{String(step + 1).padStart(2, '0')} / {String(tourStops.length).padStart(2, '0')}</span>
          {step < tourStops.length - 1
            ? <button className="tourNext" onClick={() => void goToStop(step + 1)}>次：{tourStops[step + 1].title} →</button>
            : <button className="tourNext" onClick={() => void finishTour()}>案内のまとめへ →</button>}
        </footer>}
        {complete && <footer className="tourFooter tourCompleteFooter"><span>中央広場 · 北は趣味の街</span><button className="tourNext" onClick={close}>自由に街を歩く →</button></footer>}
      </dialog>
      <noscript>
        <p className="noscriptNotice">
          3Dの探索にはJavaScriptが必要です。
          <a href="/profile">通常表示でプロフィールと作品を読む</a>
        </p>
      </noscript>
    </div>
  );
}
