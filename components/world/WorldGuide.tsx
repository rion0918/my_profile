"use client";

import { useEffect, useRef, useState } from 'react';
import { tourStops, hallMarker } from '../../lib/world-tour';
import { sections } from '../../lib/sections';
import { halls } from '../../lib/world-halls';
import { mapPoint, type WorldNavigation } from '../../lib/world-map';
import type { WorldMapData } from '../../lib/world-map-data';
import { gamingPCSpecs } from '../../lib/world-gaming-pc';
import { useWorldToolDismissal } from './useWorldToolDismissal';

export default function WorldGuide({map,navigation,onSelect,onTour,canTour,onExplore}:{map:WorldMapData|null;navigation:WorldNavigation|null;onSelect:(id:string)=>void;onTour:()=>void;canTour:boolean;onExplore:()=>void}) {
  const details=useRef<HTMLDetailsElement>(null),marker=useRef<SVGCircleElement>(null);
  useWorldToolDismissal(details);
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    if(!open||!navigation)return;
    const update=()=>{
      const p=mapPoint(navigation.position);
      marker.current?.setAttribute('cx',String(p.x));marker.current?.setAttribute('cy',String(p.y));
    };
    update();const timer=window.setInterval(update,200);return()=>window.clearInterval(timer);
  },[open,navigation]);
  const walk=(id:string)=>{
    if(!navigation)return;
    if(details.current)details.current.open=false;
    onExplore();
    navigation.explore();
    navigation.walkTo(id);
  };
  return <details name="world-tools" className="worldGuide" ref={details} onToggle={e=>setOpen(e.currentTarget.open)} onKeyDown={e=>{
    if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}
  }}>
    <summary>街の案内 <span aria-hidden="true">＋</span></summary>
    <div className="worldGuidePanel">
      <button className="guideTour" disabled={!canTour} onClick={() => { if (details.current) details.current.open = false; onTour(); }}>案内に沿って見る <span>{tourStops[0].title}から、4つの館へ →</span></button>
      <div className="guideMapHeader"><span>りおまるの街</span><span>地図から、次の寄り道へ。</span></div>
      <p className="guideTouchHint">スマホは1本指で移動、離すと停止。2本指で見渡し・拡大できます。</p>
      {map && <svg className="guideMap" viewBox="0 0 100 100" role="img" aria-label="街の地図。南が入口。南：経歴・作品。01Background、02経験館、03Yoin館、04ふわっと。館。脇道のGはGitHub館、ZはZenn館、XはX館。北：趣味の街。北に港、北西に温泉、北東にゲーミングPC。中央通りの西にパスタキッチン。青緑の点が現在地です。">
        <rect width="100" height="100" rx="5" fill="#b8d9d7" />
        <path d={map.coast} fill="#e4d8b6" stroke="#f0e4c4" strokeWidth="2" />
        {map.roads.map((r,i)=><path key={i} d={r.path} fill="none" stroke="#faf0d8" strokeWidth={r.width} strokeLinecap="round" strokeLinejoin="round"/>)}
        {map.plazas.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={p.radius} fill="#f5dfbc" stroke="#e5b998" strokeWidth=".35"/>)}
        {map.ponds.map((p,i)=><ellipse key={i} cx={p.x} cy={p.y} rx={p.width/2} ry={p.height/2} fill="#84bdb6" />)}
        {map.decks.map((d,i)=><rect key={i} x={d.x-d.width/2} y={d.y-d.height/2} width={d.width} height={d.height} fill="#dfb38b"/>)}
        <g>
          <path d={map.onsen.outline} fill="#9caa87" stroke="#ece0c1" strokeWidth=".5"/>
          <text x={map.onsen.x} y={map.onsen.y+1.5} textAnchor="middle" fontSize="5" fill="#614f3d">♨</text>
        </g>
        <g>
          <rect x={map.gamingPC.x-map.gamingPC.width/2} y={map.gamingPC.y-map.gamingPC.height/2} width={map.gamingPC.width} height={map.gamingPC.height} rx=".8" fill="#eef4f1" stroke="#8bbcb8" strokeWidth=".5"/>
          <text x={map.gamingPC.x} y={map.gamingPC.y+1.2} textAnchor="middle" fontSize="3.1" fill="#3b6569">PC</text>
        </g>
        <g>
          <rect x={map.pastaKitchen.x-map.pastaKitchen.width/2} y={map.pastaKitchen.y-map.pastaKitchen.height/2} width={map.pastaKitchen.width} height={map.pastaKitchen.height} rx=".8" fill="#e9d5b5" stroke="#b38b5c" strokeWidth=".5"/>
          <text x={map.pastaKitchen.x} y={map.pastaKitchen.y+1.1} textAnchor="middle" fontSize="2.3" fill="#755c3e">PASTA</text>
        </g>
        {map.buildings.map(b=><g key={b.id}>
          <rect x={b.x-b.width/2} y={b.y-b.height/2} width={b.width} height={b.height} rx="1" fill={b.marker==='G'||b.marker==='Z'||b.marker==='X'?'#649b98':'#d79580'} />
          <circle cx={b.x} cy={b.y} r="3.4" fill="#fff8e8" stroke="#c2a68b" strokeWidth=".3"/>
          <text x={b.x} y={b.y+1.1} textAnchor="middle" fontSize="3.2" fill="#4c4d45" fontWeight="700">{b.marker}</text>
        </g>)}
        <text x="50" y={map.boundary-5} textAnchor="middle" fontSize="3" fill="#465d5d">北：趣味の街</text>
        <text x="50" y={map.boundary+4} textAnchor="middle" fontSize="3" fill="#465d5d">中央広場</text>
        <text x="50" y={map.entrance.y+7} textAnchor="middle" fontSize="3" fill="#465d5d">南：経歴・作品</text>
        <text x="50" y="3" textAnchor="middle" fontSize="3" fill="#465d5d">港</text>
        <text x="94" y="9" textAnchor="middle" fontSize="3" fill="#465d5d">N</text>
        {navigation&&<circle ref={marker} className="guideCurrentPosition" cx={mapPoint(navigation.position).x} cy={mapPoint(navigation.position).y} r="1.65" fill="#287d79" stroke="#fff8e8" strokeWidth=".75"/>}
      </svg>}
      <nav className="worldDirectory" aria-label="探索せずに情報を読む">
        <p>そのまま読む。気になったら、歩いてみる。</p>
        {[...tourStops.map(stop=>sections.find(s=>s.id===stop.id)!), ...sections.filter(s=>s.id==='github'||s.id==='zenn'||s.id==='x'), ...sections.filter(s=>s.id==='about'||s.id==='tech'||s.id==='social')].map(section=>{
          const index=halls.findIndex(hall=>hall.id===section.id);
          return <div className="guideDestination" key={section.id}>
            <a href={section.href} onClick={e=>{
              if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
              e.preventDefault();onSelect(section.id);
            }}>
              <span className="guideDestinationNumber" aria-hidden="true">{index>=0?hallMarker(section.id):'·'}</span>
              <span>{section.label}{(section.id==='github'||section.id==='zenn'||section.id==='x') && ' · 寄り道'}<small>{section.tagline}</small></span>
              <span aria-hidden="true">↗</span>
            </a>
            {index>=0&&<button disabled={!navigation} aria-label={`${section.label}へ歩く`} onClick={()=>walk(section.id)}>歩く ↥</button>}
          </div>;
        })}
      </nav>
      <div className="guideOnsen">
        <p><span aria-hidden="true">♨</span> 木もれびの湯<small>岩滝を望む露天風呂と、竹の庭の壺湯。奥の暖簾から内湯へ。</small></p>
        <div>
          <button disabled={!navigation} onClick={()=>walk('onsen-outdoor')}>露天風呂へ歩く ↗</button>
          <button disabled={!navigation} onClick={()=>walk('onsen-indoor')}>内湯へ歩く ↗</button>
          <button disabled={!navigation} onClick={()=>walk('onsen-pots')}>壺湯の庭へ歩く ↗</button>
        </div>
      </div>
      <button className="guideHarbor" disabled={!navigation} onClick={()=>walk('harbor')}>海風を感じる寄り道 <span>港の桟橋へ歩く ↗</span></button>
      <button className="guidePasta" disabled={!navigation} onClick={()=>walk('pasta-kitchen')}>パスタ作りが趣味。よく作るのはカルボナーラ。<span>パスタキッチンへ歩く ↗</span></button>
      <dl className="guidePCSpecs" aria-label="PCのスペック">
        {gamingPCSpecs.map(spec=><div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}
      </dl>
      <button className="guideGamingPC" disabled={!navigation} onClick={()=>walk('gaming-pc')}>ガラス越しに、白いPCの中へ <span>ゲーミングPCを見に行く ↗</span></button>
    </div>
  </details>;
}
