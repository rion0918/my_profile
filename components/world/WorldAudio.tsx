"use client";

import { useEffect, useRef, useState } from "react";
import { createWorldAudio, type AudioState } from "../../lib/world-audio";
import type { WorldQuality } from "../../lib/world-quality";
import { useWorldToolDismissal } from './useWorldToolDismissal';

export default function WorldAudio({ quality, onQualityChange }: {
  quality: WorldQuality;
  onQualityChange: (quality: WorldQuality) => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const settings = useRef<HTMLDetailsElement>(null);
  useWorldToolDismissal(settings);
  const controller = useRef<ReturnType<typeof createWorldAudio> | null>(null);
  const [state, setState] = useState<AudioState>("waiting");
  const [ready, setReady] = useState(false);
  const [volume, setVolume] = useState(50);
  const [volumeSupported, setVolumeSupported] = useState(true);
  const enabled = state === "playing" || state === "loading" || state === "paused" || state === "waiting";
  useEffect(() => {
    const media = audio.current!;
    const playback = createWorldAudio(media, setState);
    controller.current = playback;
    setVolumeSupported(media.volume === 0.5);
    const visibility = () => { void playback.setVisible(!document.hidden); };
    const hide = () => { void playback.setVisible(false); };
    const unlock = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('.bgmToggle')) return;
      void playback.unlock();
    };
    media.addEventListener("error", playback.fail);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", visibility);
    window.addEventListener("blur", hide);
    window.addEventListener("focus", visibility);
    window.addEventListener("click", unlock);
    window.addEventListener("pointerup", unlock);
    window.addEventListener("keydown", unlock);
    visibility();
    void playback.enable();
    setReady(true);
    return () => {
      media.removeEventListener("error", playback.fail);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", visibility);
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", visibility);
      window.removeEventListener("click", unlock);
      window.removeEventListener("pointerup", unlock);
      window.removeEventListener("keydown", unlock);
      playback.dispose();
      controller.current = null;
    };
  }, []);
  return (
    <div className="worldAudio">
      <audio ref={audio} preload="none" loop />
      <button
        className="bgmToggle"
        type="button"
        disabled={!ready}
        aria-pressed={enabled}
        aria-label={`BGM ${state === "loading" ? "…" : enabled ? "ON" : "OFF"}：${enabled ? "停止する" : state === "error" ? "再生を再試行" : "再生する"}`}
        aria-busy={state === "loading"}
        onPointerDown={event => event.preventDefault()}
        onClick={() => {
          if (enabled) controller.current?.disable();
          else void controller.current?.enable();
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4z" strokeLinejoin="round" />
          {enabled ? <><path d="M16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14" /></> : <path d="m17 9 5 6m0-6-5 6" />}
        </svg>
        BGM <span>{state === "loading" ? "…" : enabled ? "ON" : "OFF"}</span>
      </button>
      <details className="bgmSettings" ref={settings} name="world-tools" onKeyDown={event => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}>
        <summary aria-label={`画質 ${quality === "quality" ? "高" : "低"}：画質・BGM設定`} title="画質・BGM設定">
          画質 <span className="qualityValue">{quality === "quality" ? "高" : "低"}</span>
        </summary>
        <div className="bgmPanel">
          <label htmlFor="world-quality">画質モード</label>
          <select id="world-quality" value={quality} onChange={event => onQualityChange(event.currentTarget.value as WorldQuality)} aria-describedby="world-quality-description">
            <option value="quality">クオリティモード</option>
            <option value="low">低設定モード</option>
          </select>
          <p id="world-quality-description" className="qualityDescription">{quality === "quality" ? "影・水面の反射・動物の動きを楽しめます。" : "影・水面の反射を省き、動物の動きと描画負荷を抑えます。"}マップや移動できる場所は変わりません。</p>
          <p className="bgmEyebrow">街のBGM</p>
          {state === "waiting" && <p className="bgmDeviceVolume">画面を操作するとBGMが流れます。</p>}
          {state === "error" && <p className="bgmPanelError">再生できませんでした。BGMボタンで再試行できます。</p>}
          {volumeSupported ? <>
          <label htmlFor="world-bgm-volume">音量 <output>{volume}%</output></label>
          <input id="world-bgm-volume" type="range" min="0" max="100" step="1" value={volume}
            onChange={event => {
              const next = event.currentTarget.valueAsNumber;
              setVolume(next); controller.current?.setVolume(next / 100);
            }} />
          </> : <p className="bgmDeviceVolume">音量は端末の音量ボタンで調整できます。</p>}
          <p className="bgmCredit">
            <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700069" target="_blank" rel="noopener noreferrer">Bossa Antigua ↗</a><br />
            Kevin MacLeod (<a href="https://incompetech.com/" target="_blank" rel="noopener noreferrer">incompetech.com</a>)<br />
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · 音量調整・圧縮、ループ再生
          </p>
        </div>
      </details>
      <span className="bgmStatus" role="status">{state === "error" ? "BGMを再生できませんでした。再試行できます。" : state === "loading" ? "BGMを読み込んでいます" : state === "waiting" ? "BGMはオンです。画面を操作すると再生します。" : state === "paused" ? "BGMは一時停止中です" : ""}</span>
      {state === "error" && <p className="bgmError">読み込めませんでした。BGMボタンで再試行できます。</p>}
    </div>
  );
}
