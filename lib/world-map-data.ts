import { zoneBoundary, southEntrance, centralPlaza } from "./world-zones.ts";
import { hallMarker } from "./world-tour.ts";
import { buildings, ponds, roads, roadCurves, plaza, entrancePlaza } from './world-layout.ts';
import { coastPoint } from './world-navigation.ts';
import { harborDecks } from './world-harbor.ts';
import { mapPoint } from './world-map.ts';
import { buildStreetNetwork } from "./street-network.ts";
import { onsen } from './world-onsen.ts';
import { gamingPC } from './world-gaming-pc.ts';
import { pastaKitchen } from './world-pasta.ts';

// Built on the server so the HTML guide does not eagerly load Three.js.
export function createWorldMapData() {
  const path = (points: {x:number;z:number}[]) => points.map((p,i)=>{
    const {x,y}=mapPoint(p);return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  return {
    streets: buildStreetNetwork(roads.map((r,i)=>({curve:roadCurves[i],width:r.width})),plaza,[entrancePlaza]),
    plazas: [plaza,entrancePlaza].map(p=>({...mapPoint(p),radius:p.radius/96*100})),
    boundary: mapPoint({x:0,z:zoneBoundary}).y,
    entrance: mapPoint(southEntrance),
    plaza: mapPoint(centralPlaza),
    onsen: { ...mapPoint(onsen), width: onsen.width / 96 * 100, height: onsen.depth / 94 * 100 },
    gamingPC: { ...mapPoint(gamingPC), width: gamingPC.width / 96 * 100, height: gamingPC.depth / 94 * 100 },
    pastaKitchen: { ...mapPoint(pastaKitchen), width: pastaKitchen.width / 96 * 100, height: pastaKitchen.depth / 94 * 100 },
    coast: path(Array.from({length:97},(_,i)=>coastPoint(i/96*Math.PI*2)))+' Z',
    roads: roadCurves.map((curve,i)=>({path:path(curve.getPoints(120)),width:roads[i].width/96*100})),
    buildings: buildings.map(b=>({...mapPoint(b),id:b.id,name:b.name,marker:hallMarker(b.id),width:b.width/96*100,height:b.depth/94*100})),
    ponds: ponds.map(p=>({...mapPoint(p),width:p.width/96*100,height:p.depth/94*100})),
    decks: harborDecks.map(d=>({...mapPoint(d),width:d.width/96*100,height:d.depth/94*100})),
  };
}
export type WorldMapData = ReturnType<typeof createWorldMapData>;
