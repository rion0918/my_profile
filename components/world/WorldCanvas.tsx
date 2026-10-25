"use client";

import { useEffect, useRef, useState } from "react";
import type { BikePhysics } from "../../lib/world-bike-physics";
import type { WorldMapData } from "../../lib/world-map-data";
import type { WorldNavigation } from "../../lib/world-map";
import { worldQualitySettings, type WorldQuality } from "../../lib/world-quality";
import { cats, nearestCat, findCatApproach } from "../../lib/world-wildlife";
import * as THREE from "three";
import { viewOffset, getViewSpan, panView, clampZoom, getTouchDirection } from "../../lib/world-view";
import { createFocusTransition } from "../../lib/world-focus";
import { positionStorageKey, positionVersion, centralPlaza } from "../../lib/world-zones";
import { tourFork, hallMarker } from "../../lib/world-tour";
import { loadCharacter } from "./load-character";
import { harbor, getHarborDeckHeight } from "../../lib/world-harbor";
import { onsen } from "../../lib/world-onsen";
import { gamingPC } from "../../lib/world-gaming-pc";
import { pastaKitchen } from "../../lib/world-pasta";
import { createBikeController, cyclingObstacles, getBikeStandingPosition } from "../../lib/world-bike";
import { createJumpController } from "../../lib/world-jump";
import { createEntryController } from "../../lib/world-entry";
import { createWorld } from "./create-world";
import { buildings, obstacles, isOnRoad } from "../../lib/world-layout";
import {
  findPath,
  prepareNavigation,
  moveCharacter,
  getMoveSpeed,
  getWalkingHeight,
  distanceToShore,
  restorePosition,
  type Point,
} from "../../lib/world-navigation";

type Props = {
  streets: WorldMapData["streets"];
  quality: WorldQuality;
  paused: boolean;
  onSelect: (id: string) => void;
  onError: () => void;
  onReady: (navigation: WorldNavigation|null) => void;
  onExplore: () => void;
};
export default function WorldCanvas({ streets, quality, paused, onSelect, onError, onReady, onExplore }: Props) {
  const qualityRef = useRef(quality);
  const qualityChangeRef = useRef<() => void>(() => {});
  const surface = useRef<HTMLDivElement>(null);
  const cameraTools = useRef<HTMLDivElement>(null);
  const touchPad = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLButtonElement | null)[]>([]);
  const harborLabel = useRef<HTMLButtonElement>(null);
  const harborRef = useRef<() => void>(() => {});
  const onsenLabel = useRef<HTMLButtonElement>(null);
  const onsenRef = useRef<(indoor: boolean) => void>(() => {});
  const pcRef = useRef<() => void>(() => {});
  const pastaRef = useRef<() => void>(() => {});
  const entryLabels = useRef<(HTMLButtonElement | null)[]>([]);
  const resumeRef = useRef<() => void>(() => {});
  const entryRef = useRef<(id: string) => void>(() => {});
  const pausedRef = useRef(paused);
  const stopRef = useRef<() => void>(() => {});
  const zoomRef = useRef<(factor: number) => void>(() => {});
  const recenterRef = useRef<() => void>(() => {});
  const [zoom, setZoom] = useState(1);
  const viewRef = useRef<(overview: boolean) => void>(() => {});
  const dashRef = useRef(false);
  const bikeLabel = useRef<HTMLButtonElement>(null);
  const bikeRef = useRef<() => void>(() => {});
  const petRef = useRef<(index:number)=>void>(()=>{});
  const [riding, setRiding] = useState(false);
  const [bikeUnavailable, setBikeUnavailable] = useState(false);
  const jumpRef = useRef<() => void>(() => {});
  const [dashing, setDashing] = useState(false);
  const [overview, setOverview] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [notice, setNotice] = useState(
    "地面タップで移動。スマホは1本指で移動、2本指で見渡し・拡大。",
  );
  pausedRef.current = paused;
  useEffect(() => {
    qualityRef.current = quality;
    qualityChangeRef.current();
  }, [quality]);
  useEffect(() => {
    if (paused) stopRef.current();
    else resumeRef.current();
  }, [paused]);

  useEffect(() => {
    setSceneReady(false);
    const element = surface.current!;
    const mobile = window.matchMedia("(max-width: 760px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let settings = worldQualitySettings[qualityRef.current];
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      onError();
      return;
    }
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, mobile.matches ? Math.min(1, settings.pixelRatio) : settings.pixelRatio),
    );
    renderer.shadowMap.enabled = settings.shadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.prepend(renderer.domElement);
    let disposed = false;
    const lost = (event: Event) => {
      event.preventDefault(); stopRef.current();
      if(!disposed)onError();
    };
    renderer.domElement.addEventListener("webglcontextlost",lost);
    let explored = false;
    const beginExploring=()=>{if(!explored){explored=true;onExplore();}};
    const person = new THREE.Group();
    let character: Awaited<ReturnType<typeof loadCharacter>> | undefined;
    // Start the only remote scene asset before constructing the town geometry.
    const characterReady = loadCharacter(person).then((result) => {
      if (disposed) result.dispose();
      else character = result;
    }).catch(() => { if(!disposed)onError(); });
    const build = new AbortController();
    let cleanup = () => {
      character?.dispose(); character=undefined;
      renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    };
    const initialize = async () => {
    const world = await createWorld(person,()=>render(),streets,build.signal);
    if(disposed){world.dispose();return;}
    settings = worldQualitySettings[qualityRef.current];
    world.setReflectionsEnabled(settings.reflections);
    prepareNavigation(obstacles);
    const entries = createEntryController(buildings);
    const focus = createFocusTransition();
    const jump = createJumpController();
    const bike = createBikeController();
    const cycleObstacles = cyclingObstacles(obstacles);
    const navigationObstacles = () => bike.riding ? cycleObstacles : obstacles;
    let mounting = false, cyclingDistance = 0, cyclePhase = 0;
    let petTarget:number|null=null,petUntil=0;
    let cyclingEntry: string | null = null;
    let physics: BikePhysics | undefined;
    let physicsModule: typeof import("../../lib/world-bike-physics") | undefined;
    let physicsLoading: Promise<void> | null = null;
    let physicsUnavailable = false;
    const physicsError = "自転車を読み込めませんでした。「自転車を再読み込み」で再試行できます。徒歩でも探索できます。";
    const ensurePhysics = () => physicsLoading ??= import("../../lib/world-bike-physics")
      .then(async module => {
        const result = await module.createBikePhysics(obstacles);
        if (disposed) { result.dispose(); return; }
        physics = result; physicsModule = module; start();
      }).catch(() => {
        physicsLoading = null; mounting = false;
        if (!disposed) { physicsUnavailable = true; setBikeUnavailable(true); setNotice(physicsError); }
      });
    const applyBike = () => world.bike.update(
      bike.riding ? person.position : bike.position,
      bike.riding ? person.rotation.y : bike.rotation,
      cyclePhase, cyclingDistance,
      bike.riding ? person.position.y : getWalkingHeight(bike.position) + (isOnRoad(bike.position) ? 0.08 : 0.04),
      bike.riding && physics ? { ...physics.pose, lean: reduced.matches ? 0 : physics.pose.lean,
        wheelRotations: reduced.matches ? [cyclingDistance / 0.36, cyclingDistance / 0.36] : physics.pose.wheelRotations } : undefined,
    );
    const camera = new THREE.OrthographicCamera(-12, 12, 12, -12, 0.1, 600);
    const cameraOffset = new THREE.Vector3(viewOffset.x, viewOffset.y, viewOffset.z);
    const overviewOffset = new THREE.Vector3(68, 88, 116);
    const cameraTarget = new THREE.Vector3();
    let isOverview = false;
    let viewZoom = 1;
    let manuallyPanned = false;
    let focusing = false;
    const cancelFocus = () => {
      focus.cancel();
      if (focusing) { focusing = false; manuallyPanned = false; save(); }
    };
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(positionStorageKey);
    } catch {
      /* Optional storage. */
    }
    const initial = restorePosition(raw, obstacles);
    world.person.position.set(
      initial.x,
      getWalkingHeight(initial) + (isOnRoad(initial) ? 0.08 : 0.04),
      initial.z,
    );
    const followTarget = () => {
      const ahead = getViewSpan(element.clientWidth || 1, element.clientHeight || 1, false, viewZoom) * .35;
      const length = Math.hypot(cameraOffset.x, cameraOffset.z);
      return new THREE.Vector3(person.position.x - cameraOffset.x / length * ahead, .8, person.position.z - cameraOffset.z / length * ahead);
    };
    cameraTarget.copy(followTarget());
    try {
      const view = JSON.parse(raw ?? "null")?.view;
      if (
        view &&
        Number.isFinite(view.x) &&
        Number.isFinite(view.z) &&
        Math.abs(view.x) <= 48 &&
        view.z >= -51 && view.z <= 43 &&
        typeof view.overview === "boolean" &&
        typeof view.panned === "boolean"
      ) {
        cameraTarget.set(view.x, view.overview ? .4 : .8, view.z);
        if (Number.isFinite(view.zoom)) { viewZoom = clampZoom(view.zoom); setZoom(viewZoom); }
        isOverview = view.overview;
        manuallyPanned = view.panned;
        setOverview(isOverview);
      }
    } catch {
      /* Old or invalid camera state uses the character's position. */
    }
    const positionCamera = () => {
      camera.position
        .copy(cameraTarget)
        .add(isOverview ? overviewOffset : cameraOffset);
      camera.lookAt(cameraTarget);
      if (world.scene.fog instanceof THREE.FogExp2)
        world.scene.fog.density = 0.007 / (isOverview ? 4 : 1);
    };
    positionCamera();
    const keys = new Set<string>();
    let shiftHeld = false;
    const directions: Record<string, [number, number]> = {
      w: [-0.5145, -0.8575],
      arrowup: [-0.5145, -0.8575],
      s: [0.5145, 0.8575],
      arrowdown: [0.5145, 0.8575],
      a: [-0.8575, 0.5145],
      arrowleft: [-0.8575, 0.5145],
      d: [0.8575, -0.5145],
      arrowright: [0.8575, -0.5145],
    };
    let compiled = false;
    let path: Point[] = [];
    let frame = 0, drawFrame = 0,
      previous = 0;
    let touchMove: Point | null = null;
    const save = () => {
      const savedPosition =
        buildings.find(
          (b) =>
            Math.abs(world.person.position.x - b.x) < b.entry.width / 2 &&
            world.person.position.z < b.entry.z &&
            world.person.position.z > b.entry.z - 1.2,
        )?.entry.outside ?? world.person.position;
      try {
        sessionStorage.setItem(
          positionStorageKey,
          JSON.stringify({
            version: positionVersion,
            x: savedPosition.x,
            z: savedPosition.z,
            view: {
              x: cameraTarget.x,
              z: cameraTarget.z,
              overview: isOverview,
              panned: manuallyPanned,
              zoom: viewZoom,
            },
          }),
        );
      } catch {
        /* Exploration still works without storage. */
      }
    };
    let lastTimeSync = -Infinity;
    const draw = () => {
      if (disposed || document.hidden || !compiled) return;
      const viewportWidth=element.clientWidth,viewportHeight=element.clientHeight;
      world.updateVisibility();
      const now = Date.now();
      if (Math.abs(now - lastTimeSync) >= 30_000) {
        const lighting = world.updateTime(new Date(now));
        element.dataset.night = String(lighting.lamps > 0.75);
        lastTimeSync = now;
      }
      world.reflectWater(renderer, camera);
      renderer.render(world.scene, camera);
      const cameraBounds=cameraTools.current?.getBoundingClientRect(), surfaceBounds=element.getBoundingClientRect();
      const coveredByCamera=(x:number,y:number,halfWidth:number,centered=false)=>{
        if(!cameraBounds)return false;
        const left=cameraBounds.left-surfaceBounds.left-4,right=cameraBounds.right-surfaceBounds.left+4;
        const top=cameraBounds.top-surfaceBounds.top-4,bottom=cameraBounds.bottom-surfaceBounds.top+4;
        return x+halfWidth>left&&x-halfWidth<right&&y+(centered?22:0)>top&&y-(centered?22:48)<bottom;
      };
      const cycleLabel = bikeLabel.current;
      if (cycleLabel) {
        const target = bike.riding ? person.position : bike.position;
        const p = new THREE.Vector3(target.x, 1.8, target.z).project(camera);
        const x = (p.x + 1) * viewportWidth / 2, y = (1 - p.y) * viewportHeight / 2;
        cycleLabel.hidden = coveredByCamera(x,y,85) || x < 70 || x > viewportWidth - 70 || y < 112 || y > viewportHeight - 135;
        cycleLabel.style.transform = `translate(-50%,-100%) translate(${x}px,${y}px)`;
      }
      const portLabel = harborLabel.current;
      if (portLabel) {
        const p = new THREE.Vector3(harbor.entry.x, 3.15, harbor.entry.z).project(camera);
        const x = (p.x + 1) * viewportWidth / 2, y = (1 - p.y) * viewportHeight / 2;
        portLabel.hidden = coveredByCamera(x,y,100) || x < 85 || x > viewportWidth - 85 || y < 112 || y > viewportHeight - 130;
        portLabel.style.transform = `translate(-50%,-100%) translate(${x}px,${y}px)`;
      }
      const bathLabel = onsenLabel.current;
      if (bathLabel) {
        const p = new THREE.Vector3(onsen.entry.x, 3.8, onsen.entry.z).project(camera);
        const x = (p.x + 1) * viewportWidth / 2, y = (1 - p.y) * viewportHeight / 2;
        bathLabel.hidden = coveredByCamera(x,y,100) || x < 90 || x > viewportWidth - 90 || y < 112 || y > viewportHeight - 130;
        bathLabel.style.transform = `translate(-50%,-100%) translate(${x}px,${y}px)`;
      }
      buildings.forEach((building, index) => {
        const entryLabel = entryLabels.current[index];
        if (entryLabel) {
          const p = new THREE.Vector3(
            building.x,
            0.9,
            building.entry.z + 0.4,
          ).project(camera);
          const x = ((p.x + 1) * viewportWidth) / 2,
            y = ((1 - p.y) * viewportHeight) / 2;
          entryLabel.hidden =
            isOverview || coveredByCamera(x,y,40,true) ||
            x < 28 ||
            x > viewportWidth - 28 ||
            y < 88 ||
            y > viewportHeight - 120;
          entryLabel.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)`;
        }

        const point = new THREE.Vector3(
          building.x,
          building.height + 0.3,
          building.z + building.depth / 2,
        ).project(camera);
        const label = labels.current[index];
        if (label) {
          const x = ((point.x + 1) * viewportWidth) / 2;
          const y = ((1 - point.y) * viewportHeight) / 2;
          label.hidden =
            coveredByCamera(x,y,100) || x < 90 ||
            x > viewportWidth - 90 ||
            y < 112 ||
            y > viewportHeight - 90;
          label.style.transform = `translate(-50%, -100%) translate(${((point.x + 1) * viewportWidth) / 2}px,${((1 - point.y) * viewportHeight) / 2}px)`;
        }
      });
    };
    const render = () => {
      if(disposed||document.hidden||!compiled||frame||drawFrame)return;
      drawFrame=requestAnimationFrame(()=>{drawFrame=0;if(!frame)draw();});
    };
    const stop = () => {
      touchMove = null;
      if (touchPad.current) touchPad.current.hidden = true;
      keys.clear();
      shiftHeld = false;
      path = [];
      mounting = false;
      cyclingEntry = null;
      petTarget = null;
      world.destination.visible = false;
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      physics?.halt();
      person.rotation.z = 0;
      character?.stop();
      if (bike.riding) character?.update(1 / 60, 0, reduced.matches, 0, cyclePhase, physics?.pose.steering);
      applyBike();
      save();
      render();
    };
    const greetCat=(index:number)=>{
      const cat=cats[index];
      person.rotation.y=Math.atan2(cat.x-person.position.x,cat.z-person.position.z);
      const target=world.wildlife.pet(index);
      if(!reduced.matches)character?.greet(target);
      petUntil=performance.now()+1600;
      setNotice('猫にごあいさつ。気持ちよさそうに目を細めています。');
      save();
    };
    petRef.current=index=>{
      if(pausedRef.current||!compiled)return;
      if(bike.riding){setNotice('自転車を降りると、猫をなでられます。');return;}
      beginExploring();stop();
      const cat=cats[index];
      const side=(person.position.x-cat.x)*.8575-(person.position.z-cat.z)*.5145;
      if(Math.hypot(person.position.x-cat.x,person.position.z-cat.z)<=1.05&&Math.abs(side)>.6&&!jump.airborne)greetCat(index);
      else {
        const approach=findCatApproach(person.position,index,obstacles);
        if(!approach){setNotice('猫の近くの空いている場所へ歩いてみてください。');return;}
        petTarget=index;path=approach.path;world.destination.position.set(approach.point.x,getWalkingHeight(approach.point)+.08,approach.point.z);
        setNotice('猫のそばへ歩いています。');start();
      }
      element.focus({preventScroll:true});
      start();
    };
    const dismount = () => {
      const outside = bike.dismount(person.position, person.rotation.y, obstacles);
      if (!outside) { setNotice("少し開けた場所で降りてください。"); return false; }
      person.position.set(outside.x, getWalkingHeight(outside) + (isOnRoad(outside) ? 0.08 : 0.04), outside.z);
      setRiding(false);
      physics?.halt(); person.rotation.z = 0;
      character?.stop(); applyBike();
      setNotice("自転車を停めました。近くでEキー、または自転車をタップするとまた乗れます。");
      return true;
    };
    const mount = () => {
      if (!physics) { void ensurePhysics(); setNotice("自転車を準備しています。"); return false; }
      if (!bike.mount(person.position, !jump.airborne)) return false;
      person.position.set(bike.position.x, getWalkingHeight(bike.position) + 0.08, bike.position.z);
      person.rotation.y = bike.rotation;
      physics.reset(bike.position, bike.rotation);
      setRiding(true); mounting = false; applyBike();
      setNotice("Wで前進 · Sでブレーキ／後退 · A/Dでハンドル · 地面タップでも走れます");
      return true;
    };
    bikeRef.current = () => {
      beginExploring();
      if (pausedRef.current || !compiled) return;
      if (physicsUnavailable) { setNotice(physicsError); return; }
      stop();
      if (!bike.riding) void ensurePhysics();
      if (bike.riding) dismount();
      else if (!mount()) {
        if (jump.airborne) { setNotice("着地してから自転車に乗れます。"); start(); return; }
        path = findPath(person.position, bike.position, obstacles);
        if (!path.length) { setNotice("自転車への道を選び直してください。"); return; }
        mounting = true;
        isOverview = false; setOverview(false); manuallyPanned = false; resize();
        world.destination.position.set(bike.position.x, getWalkingHeight(bike.position) + 0.09, bike.position.z);
        setNotice("自転車まで歩いています。到着すると乗車します。");
      }
      element.focus({ preventScroll: true });
      save(); start(); render();
    };
    resumeRef.current = () => {
      let outside = entries.close();
      if (outside && !bike.riding && Math.hypot(outside.x - bike.position.x, outside.z - bike.position.z) < 0.9)
        outside = getBikeStandingPosition(bike.position, bike.rotation, obstacles) ?? outside;
      if (outside) {
        jump.reset();
        world.updateJump(0);
        world.person.position.set(outside.x, 0.08, outside.z);
        world.person.rotation.y = 0;
        cameraTarget.copy(followTarget());
        positionCamera();
        save();
      }
      start();
      render();
    };
    const tick = (now: number) => {
      frame = 0;
      if (pausedRef.current || document.hidden || disposed) {
        stop();
        return;
      }
      const delta = Math.min((now - (previous || now - 16)) / 1000, 0.04);
      previous = now;
      if(petUntil&&now>=petUntil){
        petUntil=0;
        if(!path.length&&!bike.riding)setNotice('地面で移動 · 看板で読む · 気になる場所へ、寄り道を。');
      }
      let dx = 0,
        dz = 0;
      keys.forEach((key) => {
        const direction = directions[key];
        if (direction) {
          dx += direction[0];
          dz += direction[1];
        }
      });
      if (!keys.size && touchMove) { dx = touchMove.x; dz = touchMove.z; }
      const manualInput = keys.size > 0 || touchMove !== null;
      if (manualInput) { path = []; mounting = false; cyclingEntry = null; petTarget=null; }
      const before = world.person.position.clone();
      if (bike.riding && physics && physicsModule) {
        const held = (a: string, b: string) => keys.has(a) || keys.has(b) ? 1 : 0;
        const ridePath = touchMove && !keys.size && (dx || dz)
          ? [{ x: person.position.x + dx * 3, z: person.position.z + dz * 3 }] : path;
        const next = ridePath.length && !keys.size ? physicsModule.followBikePath(physics, ridePath, delta) : physics.update(delta, {
          throttle: held("w", "arrowup") - held("s", "arrowdown"),
          steer: held("a", "arrowleft") - held("d", "arrowright"),
          brake: touchMove !== null && !keys.size,
        });
        person.position.set(next.x, next.y, next.z);
        person.rotation.set(0, next.heading, reduced.matches ? 0 : next.lean);
        if (manualInput || Math.abs(next.speed) > 0.05 || path.length) manuallyPanned = false;
        if (!reduced.matches) {
          cyclingDistance = next.wheelRotations[0] * 0.36;
          cyclePhase = cyclingDistance / 1.4;
        }
      } else {
        let speed =
          getMoveSpeed(
            shiftHeld || dashRef.current,
            distanceToShore(world.person.position),
            getHarborDeckHeight(world.person.position) !== null,
          ) * delta;
        if (path.length && !manualInput) {
          const target = path[0];
          dx = target.x - world.person.position.x;
          dz = target.z - world.person.position.z;
          const distance = Math.hypot(dx, dz);
          speed = Math.min(speed, distance);
          if (distance < 0.04) {
            path.shift();
            dx = 0;
            dz = 0;
          }
        }
        const length = Math.hypot(dx, dz);
        if (length > 0) {
          manuallyPanned = false;
          dx = (dx / length) * speed;
          dz = (dz / length) * speed;
          const moved = moveCharacter(
            world.person.position,
            { x: dx, z: dz },
            obstacles,
          );
          world.person.position.x = moved.x;
          world.person.position.z = moved.z;
          if (
            distanceToShore(moved) > 1.6 && getHarborDeckHeight(moved) === null &&
            Math.hypot(moved.x - before.x, moved.z - before.z) < speed * 0.3
          )
            setNotice("ここから先は深い海です。岸沿いを進めます。");
          const angle = Math.atan2(dx, dz);
          world.person.rotation.y += reduced.matches
            ? Math.atan2(
                Math.sin(angle - world.person.rotation.y),
                Math.cos(angle - world.person.rotation.y),
              )
            : Math.atan2(
                Math.sin(angle - world.person.rotation.y),
                Math.cos(angle - world.person.rotation.y),
              ) * Math.min(1, delta * 12);
        }
      }
      const actualSpeed =
        delta > 0 ? Math.hypot(person.position.x - before.x, person.position.z - before.z) / delta : 0;
      jump.update(delta);
      if(petTarget!==null&&!path.length&&!jump.airborne){
        const index=petTarget;petTarget=null;
        if(Math.hypot(person.position.x-cats[index].x,person.position.z-cats[index].z)<1.1)greetCat(index);
      }
      if (mounting && !path.length) mount();
      if (cyclingEntry && !path.length) {
        const b = buildings.find(b => b.id === cyclingEntry)!;
        cyclingEntry = null;
        if (dismount()) {
          path = findPath(person.position, b.entry.inside, obstacles);
          world.destination.position.set(b.entry.inside.x, 0.55, b.entry.inside.z);
          setNotice(`${b.name}の入口で降りました。そのまま入館します。`);
        }
      }
      character?.update(delta, actualSpeed, reduced.matches, jump.height, bike.riding ? cyclePhase : undefined, physics?.pose.steering);
      world.updateEnvironment(
        now / 1000,
        world.person.position,
        actualSpeed,
        reduced.matches || settings.reducedEnvironment,
      );
      const nearby = buildings.find(
        (b) =>
          Math.abs(b.x - world.person.position.x) < 0.95 &&
          Math.abs(b.entry.z - world.person.position.z) < 2,
      );
      if (!bike.riding) world.person.position.y =
        getWalkingHeight(world.person.position) +
        (isOnRoad(world.person.position) ? 0.08 : 0.04) +
        jump.height +
        (nearby
          ? THREE.MathUtils.clamp(
              (nearby.entry.z + 1.4 - world.person.position.z) / 2.05,
              0,
              1,
            ) * 0.48
          : 0);
      world.updateJump(jump.height);
      applyBike();
      if (bike.riding && !cyclingEntry && nearby && person.position.z < nearby.entry.z + 1.3) {
        if (dismount()) path = path.length ? findPath(person.position, path[path.length - 1], obstacles) : [];
        else path = [];
      }
      for (const door of world.doors) {
        const b = buildings.find((b) => b.id === door.id)!;
        const near =
          Math.hypot(
            b.entry.x - world.person.position.x,
            b.entry.z - world.person.position.z,
          ) < 2.5;
        door.pivot.rotation.y = THREE.MathUtils.damp(
          door.pivot.rotation.y,
          near ? -Math.PI * 0.58 : 0,
          9,
          delta,
        );
      }
      const entered = entries.update(world.person.position, !jump.airborne);
      if (entered) {
        stop();
        pausedRef.current = true;
        onSelect(entered);
        return;
      }
      let cameraSettling = false;
      if (!isOverview && !manuallyPanned) {
        const target = followTarget();
        cameraTarget.lerp(
          target,
          reduced.matches ? 1 : 1 - Math.exp(-delta * 5),
        );
        cameraSettling = cameraTarget.distanceToSquared(target) > 0.0001;
        positionCamera();
      }
      world.destination.visible = path.length > 0;
      draw();
      if (keys.size || touchMove !== null || path.length || mounting || jump.airborne || cameraSettling || now<petUntil || (bike.riding && Math.abs(physics?.pose.speed ?? 0) > 0.01) || (!reduced.matches && !settings.reducedEnvironment))
        frame = requestAnimationFrame(tick);
      else stop();
    };
    const start = () => {
      if (compiled && !frame && !pausedRef.current && !document.hidden) {
        previous = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    jumpRef.current = () => {
      if (pausedRef.current || !compiled || bike.riding) return;
      beginExploring();
      jump.start();
      start();
    };
    const resize = () => {
      const width = element.clientWidth,
        height = element.clientHeight;
      if (!width || !height) return;
      const aspect = width / height;
      const span = getViewSpan(width, height, isOverview, viewZoom);
      camera.left = -span * aspect;
      camera.right = span * aspect;
      camera.top = span;
      camera.bottom = -span;
      camera.updateProjectionMatrix();
      if (!manuallyPanned && !isOverview) {
        cameraTarget.copy(followTarget());
        positionCamera();
      }
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, mobile.matches ? Math.min(1, settings.pixelRatio) : settings.pixelRatio),
      );
      if (renderer.shadowMap.enabled !== settings.shadows) {
        renderer.shadowMap.enabled = settings.shadows;
        world.scene.traverse(object => {
          if (object instanceof THREE.Mesh) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(material => { material.needsUpdate = true; });
          }
        });
      }
      renderer.setSize(width, height);
      render();
    };
    qualityChangeRef.current = () => {
      settings = worldQualitySettings[qualityRef.current];
      world.setReflectionsEnabled(settings.reflections);
      world.updateEnvironment(performance.now() / 1000, person.position, 0, reduced.matches || settings.reducedEnvironment);
      resize();
      start();
    };
    viewRef.current = (value) => {
      beginExploring();
      stop();
      isOverview = value;
      setOverview(value);
      viewZoom = 1; setZoom(1);
      manuallyPanned = false;
      cameraTarget.copy(value ? new THREE.Vector3(0, 0.4, 0) : followTarget());
      positionCamera();
      resize();
      save();
      if (jump.airborne) start();
    };
    recenterRef.current = () => {
      viewRef.current(false);
      setNotice("人物に戻りました。地面を選ぶと移動できます。");
    };
    entryRef.current = (id) => {
      if (pausedRef.current) return;
      beginExploring();
      const b = buildings.find((b) => b.id === id);
      if (!b) return;
      stop();
      isOverview = false;
      setOverview(false);
      manuallyPanned = false;
      resize();
      const target = bike.riding ? b.entry.cycling : b.entry.inside;
      cyclingEntry = bike.riding ? id : null;
      path = findPath(world.person.position, target, navigationObstacles());
      if (!path.length) {
        setNotice("入口への道を選び直してください。");
        return;
      }
      setNotice(bike.riding ? `${b.name}へ向かっています。入口前で自転車を降りて入館します。` : `${b.name}へ歩いています。入口を越えると案内が開きます。`);
      world.destination.position.set(b.entry.inside.x, 0.55, b.entry.inside.z);
      start();
    };
    harborRef.current = () => {
      if (pausedRef.current) return;
      beginExploring();
      stop();
      isOverview = false;
      setOverview(false);
      manuallyPanned = false;
      cameraTarget.copy(followTarget());
      positionCamera();
      resize();
      path = findPath(world.person.position, harbor.destination, navigationObstacles());
      if (!path.length) { setNotice("港への道を選び直してください。"); return; }
      setNotice(bike.riding ? "自転車で港の桟橋へ向かっています。" : "港の桟橋へ歩いています。Shift／ダッシュで速く進めます。");
      world.destination.position.set(harbor.destination.x, 0.51, harbor.destination.z);
      element.focus({ preventScroll: true });
      start();
    };
    pcRef.current = () => {
      if (pausedRef.current || !compiled) return;
      beginExploring(); stop();
      isOverview = false; setOverview(false); manuallyPanned = false;
      viewZoom = clampZoom(Math.min(.9, element.clientHeight / element.clientWidth * 1.2)); setZoom(viewZoom);
      cameraTarget.copy(followTarget()); positionCamera(); resize();
      const navigation = navigationObstacles();
      if (bike.riding && person.position.z > centralPlaza.z) {
        const first = findPath(person.position, centralPlaza, navigation), last = findPath(centralPlaza, gamingPC.approach, navigation);
        path = first.length && last.length ? [...first, ...last] : [];
      } else path = findPath(person.position, gamingPC.approach, navigation);
      if (!path.length) { setNotice("PCオブジェへの道を選び直してください。"); return; }
      world.destination.position.set(gamingPC.approach.x, .08, gamingPC.approach.z);
      setNotice("白いゲーミングPCへ。ガラス越しに、水冷やGPUの細部を見渡せます。");
      element.focus({ preventScroll: true }); start();
    };
    pastaRef.current = () => {
      if (pausedRef.current || !compiled) return;
      beginExploring(); stop();
      isOverview = false; setOverview(false); manuallyPanned = false;
      viewZoom = clampZoom(Math.min(.96, element.clientHeight / element.clientWidth * 1.3)); setZoom(viewZoom);
      cameraTarget.copy(followTarget()); positionCamera(); resize();
      const navigation = navigationObstacles();
      if (bike.riding && person.position.z > centralPlaza.z) {
        const first = findPath(person.position, centralPlaza, navigation), last = findPath(centralPlaza, pastaKitchen.approach, navigation);
        path = first.length && last.length ? [...first, ...last] : [];
      } else path = findPath(person.position, pastaKitchen.approach, navigation);
      if (!path.length) { setNotice("パスタキッチンへの道を選び直してください。"); return; }
      world.destination.position.set(pastaKitchen.approach.x, .08, pastaKitchen.approach.z);
      setNotice("パスタキッチンへ。よく作るカルボナーラを、大きな一皿と調理道具で紹介しています。");
      element.focus({ preventScroll: true }); start();
    };
    onsenRef.current = (indoor) => {
      if (pausedRef.current || !compiled) return;
      beginExploring();
      stop();
      if (bike.riding && !dismount()) return;
      isOverview = false; setOverview(false); manuallyPanned = false;
      cameraTarget.copy(followTarget()); positionCamera(); resize();
      const target = indoor ? onsen.indoor : onsen.outdoor;
      path = findPath(person.position, target, obstacles);
      if (!path.length) { setNotice("温泉への道を選び直してください。"); return; }
      world.destination.position.set(target.x, .08, target.z);
      setNotice(indoor ? "木もれびの湯の内湯へ。中に入ると屋根が外れ、室内を見渡せます。" : "街の奥、木もれびの湯の露天風呂へ歩いています。");
      element.focus({ preventScroll: true }); start();
    };
    // Keep real time in sync even while reduced motion or a detail panel stops rAF.
    const timeTimer = window.setInterval(render, 30_000);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ray = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
        ),
        camera,
      );
      const hit = raycaster.intersectObjects(world.selectable, true)[0];
      let object: THREE.Object3D | null = hit?.object ?? null;
      while (object && !object.userData.detail && !object.userData.entry && !object.userData.bike && object.userData.cat===undefined)
        object = object.parent;
      return object
        ? {
            bike: object.userData.bike as boolean | undefined,
            detail: object.userData.detail as string | undefined,
            entry: object.userData.entry as string | undefined,
            cat: object.userData.cat as number | undefined,
          }
        : null;
    };
    let pointer: {
      x: number; y: number; id: number; dragged: boolean; touch: boolean; target: THREE.Vector3;
    } | null = null;
    const touches = new Map<number, {x:number;y:number}>();
    let pinch: {distance:number;x:number;y:number;zoom:number} | null = null;
    const pinchMetrics = () => {
      const [a,b] = [...touches.values()];
      return {distance: Math.hypot(a.x-b.x,a.y-b.y), x:(a.x+b.x)/2, y:(a.y+b.y)/2};
    };
    const pan = (target: THREE.Vector3, dx: number, dy: number) => {
      const next = panView(target, dx, dy, (camera.right-camera.left)/element.clientWidth, isOverview ? overviewOffset : cameraOffset);
      cameraTarget.set(next.x, target.y, next.z);
      manuallyPanned = true; positionCamera();
    };
    const zoomAt = (next: number, anchor?: {x:number;y:number}) => {
      if (pausedRef.current || !compiled) return;
      beginExploring(); stop();
      const bounds = element.getBoundingClientRect();
      const point = new THREE.Vector2(anchor ? (anchor.x-bounds.left)/bounds.width*2-1 : 0, anchor ? 1-(anchor.y-bounds.top)/bounds.height*2 : 0);
      const ground = new THREE.Plane(new THREE.Vector3(0,1,0),0);
      raycaster.setFromCamera(point,camera);
      const before = raycaster.ray.intersectPlane(ground,new THREE.Vector3());
      viewZoom=clampZoom(next);setZoom(viewZoom);manuallyPanned=true;
      resize();
      raycaster.setFromCamera(point,camera);
      const after=raycaster.ray.intersectPlane(ground,new THREE.Vector3());
      if(before&&after){cameraTarget.x=THREE.MathUtils.clamp(cameraTarget.x+before.x-after.x,-45,45);cameraTarget.z=THREE.MathUtils.clamp(cameraTarget.z+before.z-after.z,-51,40);}
      positionCamera();save();render();start();
    };
    zoomRef.current = factor => zoomAt(viewZoom * factor);
    const down = (event: PointerEvent) => {
      if (event.target !== renderer.domElement || event.button !== 0 || pausedRef.current || !compiled) return;
      if(event.pointerType==='touch')touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      renderer.domElement.setPointerCapture(event.pointerId);
      if(touches.size>=2){stop();pinch={...pinchMetrics(),zoom:viewZoom};pointer=null;return;}
      pointer={x:event.clientX,y:event.clientY,id:event.pointerId,dragged:false,touch:event.pointerType==='touch',target:cameraTarget.clone()};
      if (pointer.touch) {
        beginExploring(); stop(); element.focus({preventScroll:true});
        touchMove = { x: 0, z: 0 };
        const pad = touchPad.current, bounds = element.getBoundingClientRect();
        if (pad) {
          pad.style.transform = `translate(${event.clientX-bounds.left}px,${event.clientY-bounds.top}px)`;
          (pad.firstElementChild as HTMLElement).style.transform = 'translate(0px,0px)';
          pad.hidden = false;
        }
        start();
      }
    };
    const up = (event: PointerEvent) => {
      touches.delete(event.pointerId);
      if(pinch){
        pinch=null;pointer=null;
        if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);
        save();start();return;
      }
      const downAt = pointer;
      pointer = null;
      if (downAt?.touch) { touchMove = null; if (touchPad.current) touchPad.current.hidden = true; }
      if (renderer.domElement.hasPointerCapture(event.pointerId))
        renderer.domElement.releasePointerCapture(event.pointerId);
      if (downAt?.dragged) {
        if (downAt.touch) stop();
        save();
        start();
        return;
      }
      if (
        !downAt ||
        downAt.id !== event.pointerId ||
        pausedRef.current ||
        Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > (downAt.touch ? 10 : 7)
      )
        return;
      element.focus({ preventScroll: true });
      const hit = ray(event);
      beginExploring();
      if(hit?.cat!==undefined){petRef.current(hit.cat);return;}
      if (hit?.bike) { bikeRef.current(); return; }
      if (hit?.entry) {
        entryRef.current(hit.entry);
        return;
      }
      if (hit?.detail) {
        stop();
        onSelect(hit.detail);
        return;
      }
      const point = raycaster.intersectObjects(world.walkSurfaces, false)[0]?.point ??
        raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (!point) return;
      const target = { x: point.x, z: point.z };
      stop();
      path = findPath(world.person.position, target, navigationObstacles());
      if (!path.length) {
        setNotice(
          distanceToShore(target) > 1.8 && getHarborDeckHeight(target) === null
            ? "ここから先は深い海です。浅瀬まで歩けます。"
            : "そこへは歩けません。道や広場を選んでください。",
        );
        return;
      }
      setNotice("移動中。別の地面を選ぶと行き先を変えられます。");
      world.destination.position.set(target.x, (getHarborDeckHeight(target) ?? 0) + 0.09, target.z);
      start();
    };
    const move = (event: PointerEvent) => {
      if(touches.has(event.pointerId))touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(pinch&&touches.size>=2&&!pausedRef.current){
        const next=pinchMetrics();
        pan(cameraTarget.clone(),next.x-pinch.x,next.y-pinch.y);
        zoomAt(pinch.zoom*next.distance/Math.max(1,pinch.distance),next);
        pinch.x=next.x;pinch.y=next.y;return;
      }
      if (pointer && pointer.id === event.pointerId && !pausedRef.current) {
        const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
        if (pointer.touch && (pointer.dragged || Math.hypot(dx,dy)>10)) {
          if (!pointer.dragged) stop();
          pointer.dragged = true;
          touchMove = getTouchDirection(dx,dy,isOverview ? overviewOffset : cameraOffset);
          const pad = touchPad.current, length = Math.hypot(dx,dy), scale = Math.min(1,26/Math.max(1,length));
          if (pad) {
            (pad.firstElementChild as HTMLElement).style.transform = `translate(${dx*scale}px,${dy*scale}px)`;
            pad.hidden = false;
          }
          start(); return;
        }
        if (pointer.touch) return;
        if(pointer.dragged||Math.hypot(dx,dy)>7){
          if(!pointer.dragged)stop();
          pointer.dragged=true;
          pan(pointer.target,dx,dy);
          renderer.domElement.style.cursor="grabbing";render();return;
        }
      }
      if(event.pointerType==='mouse'&&event.target===renderer.domElement)
        renderer.domElement.style.cursor=ray(event)?"pointer":"grab";
    };
    const cancel = () => {
      const captured = [...touches.keys()];
      pointer=null;pinch=null;touches.clear();stop();
      captured.forEach(id=>{if(renderer.domElement.hasPointerCapture(id))renderer.domElement.releasePointerCapture(id);});
      start();
    };
    stopRef.current = cancel;
    const lostCapture = (event: PointerEvent) => {
      if (pointer?.id === event.pointerId || touches.has(event.pointerId)) cancel();
    };
    const wheel = (event: WheelEvent) => {
      if(event.target!==renderer.domElement||pausedRef.current||!compiled)return;
      event.preventDefault();
      const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?element.clientHeight:1);
      zoomAt(viewZoom*Math.exp(-THREE.MathUtils.clamp(pixels,-200,200)*.002),{x:event.clientX,y:event.clientY});
    };
    const keydown = (event: KeyboardEvent) => {
      if (
        event.target !== element ||
        pausedRef.current ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey
      )
        return;
      if (["+", "=", "-", "0"].includes(event.key)) {
        event.preventDefault();
        if(event.key === '0')recenterRef.current();
        else zoomRef.current(event.key === '-' ? 1/1.2 : 1.2);
        return;
      }
      if (event.key === "Escape") {
        cancel();
        if (jump.airborne) start();
        return;
      }
      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        if (!event.repeat) bikeRef.current();
        return;
      }
      if(event.key.toLowerCase()==='f'){
        event.preventDefault();const cat=nearestCat(person.position);
        if(!event.repeat&&cat!==null)petRef.current(cat);
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (!event.repeat) jumpRef.current();
        return;
      }
      if (event.key === "Shift") {
        event.preventDefault();
        shiftHeld = true;
        start();
        return;
      }
      const key = event.key.toLowerCase();
      if (directions[key]) {
        beginExploring();
        event.preventDefault();
        keys.add(key);
        start();
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.key === "Shift") shiftHeld = false;
      keys.delete(event.key.toLowerCase());
      if (!keys.size) save();
    };
    const visibility = () => {
      if (document.hidden) cancel();
      else {
        start();
        render();
      }
    };
    const motionPreferenceChanged = () => {
      cancel();
    };
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointercancel", cancel);
    element.addEventListener("lostpointercapture", lostCapture);
    element.addEventListener("wheel", wheel, {passive:false});
    element.addEventListener("keydown", keydown);
    element.addEventListener("keyup", keyup);
    element.addEventListener("blur", cancel);
    element.addEventListener("focus", start);
    window.addEventListener("blur", cancel);
    window.addEventListener("focus", start);
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", motionPreferenceChanged);
    resize();
    characterReady
      .then(() => {
        if (!disposed) return renderer.compileAsync(world.scene, camera);
      })
      .then(() => {
        if (!disposed) return world.prepareReflections(renderer, camera);
      })
      .then(() => {
        if (disposed) return;
        compiled = true;
        draw();
        setSceneReady(true);
        onReady({
          walkTo(id){
            if(id==='harbor')harborRef.current();
            else if(id==='gaming-pc')pcRef.current();
            else if(id==='pasta-kitchen')pastaRef.current();
            else if(id==='onsen-outdoor'||id==='onsen-indoor')onsenRef.current(id==='onsen-indoor');
            else entryRef.current(id);
            element.focus({preventScroll:true});
          },
          async focusTo(id) {
            const target = id === 'fork' ? tourFork : buildings.find(b => b.id === id)?.entry.outside;
            if (!target) return false;
            cancelFocus();
            stop();
            if (bike.riding) {
              bike.park(person.position, person.rotation.y);
              physics?.halt(); setRiding(false); character?.stop(); applyBike();
            }
            entries.close();
            pausedRef.current = true;
            jump.reset(); world.updateJump(0);
            person.position.set(target.x, getWalkingHeight(target) + 0.08, target.z);
            person.rotation.set(0, Math.PI, 0);
            isOverview = false; setOverview(false);
            viewZoom = 1; setZoom(1);
            focusing = true;
            manuallyPanned = true;
            resize();
            const from = cameraTarget.clone(), to = followTarget();
            const completed = await focus.move(progress => {
              cameraTarget.lerpVectors(from, to, progress);
              positionCamera(); render();
            }, reduced.matches);
            if (completed) { focusing = false; manuallyPanned = false; save(); }
            return completed;
          },
          cancelFocus,
          explore(){cancelFocus();pausedRef.current=false;beginExploring();element.focus({preventScroll:true});start();},
          position:person.position,
        });
        start();
      })
      .catch(() => {
        if (!disposed) onError();
      });
    cleanup = () => {
      focus.cancel();
      cancelAnimationFrame(drawFrame); drawFrame=0;
      stop();
      disposed = true;
      onReady(null);
      window.clearInterval(timeTimer);
      observer.disconnect();
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointercancel", cancel);
      element.removeEventListener("lostpointercapture", lostCapture);
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("keydown", keydown);
      element.removeEventListener("keyup", keyup);
      element.removeEventListener("blur", cancel);
      element.removeEventListener("focus", start);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("focus", start);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", motionPreferenceChanged);
      character?.dispose(); character=undefined;
      physics?.dispose();
      world.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      stopRef.current = () => {};
      viewRef.current = () => {};
      zoomRef.current = () => {};
      recenterRef.current = () => {};
      resumeRef.current = () => {};
      entryRef.current = () => {};
      harborRef.current = () => {};
      onsenRef.current = () => {};
      pcRef.current = () => {};
      pastaRef.current = () => {};
      jumpRef.current = () => {};
      bikeRef.current = () => {};
      petRef.current=()=>{};
      qualityChangeRef.current = () => {};
    };
    };
    void initialize().catch(() => { if(!disposed)onError(); });
    return () => {disposed=true;build.abort();renderer.domElement.removeEventListener("webglcontextlost",lost);cleanup();};
  }, [onSelect, onError, onReady, onExplore, streets]);

  return (
    <>
      <div
        className="worldSurface"
        ref={surface}
        tabIndex={0}
        role="region"
        aria-label="街を探索。スマホは1本指でフリックして移動、指を離すと停止。2本指で見渡し・拡大。徒歩はWASDまたは矢印キーで移動。自転車はWで前進、Sでブレーキと後退、A/Dでハンドル。Eで乗り降り、Fで近くの猫をなでる、Escapeで停止"
        aria-busy={!sceneReady}
        aria-describedby="world-instructions"
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight W A S D E F Escape + - 0"
      >
        {!sceneReady && (
          <div className="worldLoading" role="status">
            街の明かりを準備しています
            <span>読み込み中も「街の案内」や「通常表示」から内容を読めます。</span>
          </div>
        )}
        <div className="worldTouchPad" ref={touchPad} hidden aria-hidden="true"><span /></div>
        <div
          className="buildingLabels"
          style={{ visibility: sceneReady ? "visible" : "hidden" }}
        >
          <button ref={bikeLabel} className="buildingLabel bikeLabel" aria-label={bikeUnavailable ? "自転車を再読み込み" : riding ? "自転車を降りる" : "自転車に乗る"} onClick={() => bikeUnavailable ? window.location.reload() : bikeRef.current()}>
            {bikeUnavailable ? "自転車を再読み込み" : riding ? "自転車を降りる" : "自転車に乗る"}<span aria-hidden="true">↗</span>
          </button>
          <button ref={harborLabel} className="buildingLabel" aria-label="港の桟橋へ歩く" onClick={() => harborRef.current()}>
            港の桟橋へ歩く<span aria-hidden="true">↥</span>
          </button>
          <button ref={onsenLabel} className="buildingLabel onsenLabel" aria-label="木もれびの湯の露天風呂へ歩く" onClick={() => onsenRef.current(false)}>
            <span aria-hidden="true">♨</span> 木もれびの湯<span aria-hidden="true">↥</span>
          </button>
          {buildings.map((b, i) => (
            <button
              key={`entry-${b.id}`}
              ref={(e) => {
                entryLabels.current[i] = e;
              }}
              className="entryLabel"
              aria-label={`${b.name}に入る（入口へ歩く）`}
              onClick={() => entryRef.current(b.id)}
            >
              ↥<span>入る</span>
            </button>
          ))}
          {buildings.map((building, index) => (
            <button
              key={building.id}
              ref={(element) => {
                labels.current[index] = element;
              }}
              className="buildingLabel"
              onClick={() => onSelect(building.id)}
            >
              <span>{hallMarker(building.id)}{(building.id === "github" || building.id === "zenn") && " 寄り道"}</span>
              {building.name}
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      </div>
      <div className="worldControls">
        <div className="worldControlButtons" role="group" aria-label="移動と視点">
          <button className="sprintButton" disabled={!sceneReady} aria-label={`常ダッシュ ${dashing ? "ON" : "OFF"}`} aria-pressed={dashing}
            onPointerDown={event=>event.preventDefault()}
            onClick={()=>{
              const next=!dashRef.current;dashRef.current=next;setDashing(next);
              surface.current?.focus({preventScroll:true});
            }}>
            常ダッシュ <span>{dashing ? "ON" : "OFF"}</span>
          </button>
          <button disabled={!sceneReady} aria-pressed={overview} onClick={()=>viewRef.current(!overview)}>
            {overview ? "人物に戻る" : "街全体を見る"}
          </button>
        </div>
        <div className="worldCameraControls" ref={cameraTools} role="group" aria-label="カメラ操作">
          <button disabled={!sceneReady || zoom>=1.6} aria-label="景色を拡大" title="景色を拡大（+）" onClick={()=>zoomRef.current(1.2)}>＋</button>
          <button disabled={!sceneReady || zoom<=.65} aria-label="景色を縮小" title="景色を縮小（−）" onClick={()=>zoomRef.current(1/1.2)}>−</button>
        </div>
        <p className="worldScreenReaderOnly" id="world-instructions">スマホは1本指でフリックして移動、指を離すと停止。2本指で見渡し・拡大。マウスは地面を選んで移動、ドラッグで見渡せます。WASD・矢印キーで徒歩移動、Shiftでダッシュ、Spaceでジャンプ、Escapeで停止、0で人物に戻ります。</p>
        <p className="worldScreenReaderOnly" role="status">{notice}</p>
      </div>
    </>
  );
}
