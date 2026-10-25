import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { distanceToShore, seaLevel } from "../../lib/world-navigation.ts";
import { getHarborDeckHeight } from "../../lib/world-harbor.ts";
import type { getWorldTime } from "../../lib/world-time.ts";

type Pond = { x: number; z: number; width: number; depth: number };

export function createWater(scene: THREE.Scene, ponds: Pond[]) {
  const group = new THREE.Group();
  scene.add(group);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const beds: THREE.Mesh[] = [];
  const time = { value: 0 },
    actor = { value: new THREE.Vector2() },
    motion = { value: 0 },
    viewDirection = { value: new THREE.Vector3() };
  const skyTint = { value: new THREE.Color() },
    sunDirection = { value: new THREE.Vector3() },
    sunColor = { value: new THREE.Color() },
    waterLight = { value: 1 };
  const reflectionsEnabled = { value: true };

  // Tileable wave slopes and caustic ridges, shared by both moving ripple layers.
  const size = 128,
    pixels = new Uint8Array(size * size * 4);
  const waves = [
    [2, 3, 0.65],
    [5, -4, 0.32],
    [-7, 9, 0.16],
    [13, 7, 0.08],
    [-19, -11, 0.035],
  ];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let h = 0,
        dx = 0,
        dz = 0,
        curvature = 0;
      waves.forEach(([kx, kz, amplitude], index) => {
        const phase = ((x * kx + y * kz) / size) * Math.PI * 2 + index * 2.37;
        h += Math.sin(phase) * amplitude;
        dx += Math.cos(phase) * kx * amplitude;
        dz += Math.cos(phase) * kz * amplitude;
        curvature -= Math.sin(phase) * (kx * kx + kz * kz) * amplitude;
      });
      const normal = new THREE.Vector3(-dx * 0.055, 1, -dz * 0.055).normalize();
      const i = (y * size + x) * 4;
      pixels[i] = (normal.x * 0.5 + 0.5) * 255;
      pixels[i + 1] = (normal.z * 0.5 + 0.5) * 255;
      pixels[i + 2] = (h * 0.35 + 0.5) * 255;
      pixels[i + 3] =
        Math.pow(Math.max(0, 1 - Math.abs(curvature) / 25), 5) * 255;
    }
  const ripples = new THREE.DataTexture(pixels, size, size);
  ripples.wrapS = ripples.wrapT = THREE.RepeatWrapping;
  ripples.magFilter = THREE.LinearFilter;
  ripples.minFilter = THREE.LinearMipmapLinearFilter;
  ripples.generateMipmaps = true;
  ripples.needsUpdate = true;

  const mirrorGeometry = new THREE.PlaneGeometry(1, 1);
  const captures = [seaLevel, 0.022].map((height) => {
    const mirror = new Reflector(mirrorGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      multisample: 0,
      // A perspective-sized bias moves an orthographic clip plane several meters.
      clipBias: 0,
    });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = height;
    mirror.updateMatrixWorld(true);
    return {
      mirror,
      projection: new THREE.Matrix4(),
      inverse: mirror.matrixWorld.clone().invert(),
      lastUpdate: -Infinity,
    };
  });

  const vertexShader = `
    uniform float time; uniform float ocean;
    varying vec3 waterWorld; varying vec4 reflected;
    uniform mat4 reflectionProjection;
    #include <fog_pars_vertex>
    void main(){
      vec4 world=modelMatrix*vec4(position,1.);
      world.y+=ocean*sin(world.x*.34+world.z*.21-time*.65)*.018;
      waterWorld=world.xyz;reflected=reflectionProjection*world;
      vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
    }`;
  const fragmentShader = `
    uniform float time; uniform float ocean; uniform float motion;
    uniform vec2 actor; uniform vec3 viewDirection; uniform vec4 basin;
    uniform vec3 captureSkyColor;
    uniform bool reflectionsEnabled;
    uniform vec3 skyTint; uniform vec3 sunDirection; uniform vec3 sunColor; uniform float waterLight;
    uniform sampler2D rippleMap; uniform sampler2D reflectionMap;
    varying vec3 waterWorld; varying vec4 reflected;
    #include <fog_pars_fragment>
    float shoreDistance(vec2 p){
      float a=atan(p.y,p.x);vec2 d=vec2(cos(a),sin(a));
      float r=pow(pow(abs(d.x)/43.,4.)+pow(abs(d.y)/38.,4.),-.25)*(1.+.018*sin(a*5.)+.012*cos(a*3.)+.008*sin(a*9.));
      return length(p)-r;
    }
    void main(){
      vec2 p=waterWorld.xz;
      vec4 a=texture2D(rippleMap,p*.065+vec2(time*.006,-time*.004));
      vec4 b=texture2D(rippleMap,p*.137+vec2(-time*.004,time*.007));
      float shore=shoreDistance(p),depth;
      if(ocean>.5){
        float ground=shore<0.?-.25*smoothstep(-3.,0.,shore):-.25-shore*.24-max(0.,shore-2.2)*.22;
        depth=max(0.,waterWorld.y-ground);
        if(depth<.002)discard;
      }else{
        vec2 q=(p-basin.xy)/basin.zw;float angle=atan(-q.y,q.x);
        float r=1.+.035*sin(angle*5.)+.03*cos(angle*3.);
        float edge=max(0.,1.-length(q)/r);
        depth=.025+1.8*smoothstep(0.,.7,edge);
        shore=-edge*3.;
      }
      vec2 slope=(a.rg+b.rg-1.)*mix(.48,.85,ocean);
      float radius=length(p-actor);
      float wake=sin(radius*22.-time*7.)*exp(-radius*2.2)*motion*ocean;
      slope+=normalize(p-actor+vec2(.001))*wake*.10;
      vec3 normal=normalize(vec3(slope.x,1.,slope.y));
      float facing=clamp(dot(normal,viewDirection),0.,1.);
      float fresnel=.025+.975*pow(1.-facing,5.);
      vec3 reflectedView=reflect(-viewDirection,normal);
      vec3 sky=mix(skyTint*.4,skyTint*1.2,clamp(reflectedView.y,0.,1.));
      vec3 reflection=sky;
      if(reflectionsEnabled){
        vec2 uv=reflected.xy/reflected.w+slope*.018;
        reflection=texture2D(reflectionMap,uv).rgb*.6;
        reflection+=texture2D(reflectionMap,uv+vec2(.0015,.0008)).rgb*.2;
        reflection+=texture2D(reflectionMap,uv-vec2(.0015,.0008)).rgb*.2;
        float inside=smoothstep(0.,.025,min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y)));
        float capturedSky=1.-smoothstep(.025,.15,length(reflection-captureSkyColor));
        reflection=mix(reflection,sky,capturedSky*.85);
        reflection=mix(sky,reflection,inside);
      }
      vec3 body=mix(vec3(.025,.31,.245),vec3(.006,.055,.095),1.-exp(-depth*.65));
      float caustic=pow(clamp(a.a+b.a,.0,1.),2.)*exp(-depth*1.4);
      body+=vec3(.15,.20,.095)*caustic*.5;
      body*=waterLight;
      vec3 color=mix(body,reflection,.085+fresnel*.78);
      vec3 sun=normalize(sunDirection);
      vec3 halfway=normalize(sun+viewDirection);
      float spec=pow(max(0.,dot(normal,halfway)),70.)*3.;
      color+=sunColor*spec;
      float foam=1.-smoothstep(.035,.15,abs(shore+.65+sin(time*.8+a.b*3.)*.22+(b.b-.5)*.22));
      foam*=smoothstep(.2,.65,a.b)*ocean*(1.-smoothstep(.3,.9,depth));
      color=mix(color,vec3(.82,.94,.89)*waterLight,foam*.65);
      color+=vec3(.08,.14,.12)*max(0.,wake)*waterLight;
      gl_FragColor=vec4(color,mix(.42,.98,smoothstep(0.,1.15,depth)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`;

  const surfaces: THREE.Mesh[] = [];
  const addSurface = (geometry: THREE.BufferGeometry, pond?: Pond) => {
    const capture = captures[pond ? 1 : 0];
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        time,
        actor,
        motion,
        viewDirection,
        skyTint, sunDirection, sunColor, waterLight,
        reflectionsEnabled,
        ocean: { value: pond ? 0 : 1 },
        basin: {
          value: new THREE.Vector4(
            pond?.x ?? 0,
            pond?.z ?? 0,
            (pond?.width ?? 2) / 2,
            (pond?.depth ?? 2) / 2,
          ),
        },
        rippleMap: { value: ripples },
        reflectionMap: { value: capture.mirror.getRenderTarget().texture },
        reflectionProjection: { value: capture.projection },
        captureSkyColor: { value: scene.background },
      },
      vertexShader,
      fragmentShader,
    });
    const surface = new THREE.Mesh(geometry, material);
    surface.rotation.x = -Math.PI / 2;
    surface.position.set(pond?.x ?? 0, pond ? 0.022 : seaLevel, pond?.z ?? 0);
    surface.renderOrder = 3;
    group.add(surface);
    geometries.push(geometry);
    materials.push(material);
    surfaces.push(surface);
  };
  addSurface(new THREE.PlaneGeometry(500, 500, 128, 128));
  const bedMaterial = new THREE.MeshStandardMaterial({
    color: 0xc3c4a0,
    roughness: 0.95,
  });
  materials.push(bedMaterial);
  ponds.forEach((pond) => {
    const shape = new THREE.Shape();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2,
        r = 1 + 0.035 * Math.sin(a * 5) + 0.03 * Math.cos(a * 3),
        x = ((Math.cos(a) * pond.width) / 2) * r,
        z = ((-Math.sin(a) * pond.depth) / 2) * r;
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    const bed = new THREE.Mesh(geometry, bedMaterial);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(pond.x, 0.005, pond.z);
    bed.scale.set(1.08, 1.08, 1);
    bed.receiveShadow = true;
    scene.add(bed);
    beds.push(bed);
    geometries.push(geometry);
    addSurface(new THREE.ShapeGeometry(shape), pond);
  });

  const frustum = new THREE.Frustum(),
    matrix = new THREE.Matrix4();
  const ray = new THREE.Ray(),
    ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -seaLevel);
  const corner = new THREE.Vector3(),
    hit = new THREE.Vector3(),
    viewport = new THREE.Vector2();
  return {
    prepare(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
      const target = renderer.getRenderTarget();
      renderer.setRenderTarget(captures[0].mirror.getRenderTarget());
      try {
        // Reflection targets use a different output shader from the screen.
        return renderer.compileAsync(scene, camera);
      } finally {
        renderer.setRenderTarget(target);
      }
    },
    setReflectionsEnabled(enabled: boolean) {
      reflectionsEnabled.value = enabled;
      captures.forEach(capture => { capture.lastUpdate = -Infinity; });
    },
    updateTime(lighting: ReturnType<typeof getWorldTime>) {
      skyTint.value.setHex(lighting.sky);
      sunDirection.value.set(lighting.sunX, lighting.sunY, lighting.sunZ).normalize();
      sunColor.value.setHex(lighting.sunColor).multiplyScalar(lighting.sunIntensity / 3 * lighting.waterLight);
      waterLight.value = lighting.waterLight;
      captures.forEach(capture => { capture.lastUpdate = -Infinity; });
    },
    update(
      elapsed: number,
      position: THREE.Vector3,
      speed: number,
      reduced: boolean,
    ) {
      time.value = reduced ? 0 : elapsed;
      actor.value.set(position.x, position.z);
      motion.value =
        !reduced && distanceToShore(position) > -0.5 && getHarborDeckHeight(position) === null ? Math.min(1, speed) : 0;
    },
    reflect(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
      camera.updateMatrixWorld();
      camera.getWorldDirection(viewDirection.value).negate();
      if (!reflectionsEnabled.value) return;
      frustum.setFromProjectionMatrix(
        matrix.multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse,
        ),
      );
      let oceanVisible = false;
      for (const x of [-1, 1])
        for (const y of [-1, 1]) {
          ray.origin.set(x, y, -1).unproject(camera);
          corner.set(x, y, 1).unproject(camera);
          ray.direction.subVectors(corner, ray.origin).normalize();
          if (ray.intersectPlane(ground, hit) && distanceToShore(hit) > -1.5)
            oceanVisible = true;
        }
      group.updateMatrixWorld(true);
      const visible = [
        oceanVisible,
        surfaces.slice(1).some((surface) => frustum.intersectsObject(surface)),
      ];
      const mobile = renderer.getSize(viewport).x <= 760,
        resolution = mobile ? 256 : 512;
      const now = performance.now();
      group.visible = false;
      try {
        captures.forEach((capture, index) => {
          if (!visible[index] || now - capture.lastUpdate < (mobile ? 65 : 32))
            return;
          const { mirror } = capture,
            target = mirror.getRenderTarget();
          if (target.width !== resolution)
            target.setSize(resolution, resolution);
          mirror.onBeforeRender(
            renderer,
            scene,
            camera,
            mirrorGeometry,
            mirror.material as THREE.Material,
            group,
          );
          capture.projection
            .copy(
              (mirror.material as THREE.ShaderMaterial).uniforms.textureMatrix
                .value,
            )
            .multiply(capture.inverse);
          capture.lastUpdate = now;
        });
      } finally {
        group.visible = true;
      }
    },
    dispose() {
      group.removeFromParent();
      beds.forEach((bed) => bed.removeFromParent());
      captures.forEach(({ mirror }) => mirror.dispose());
      mirrorGeometry.dispose();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      ripples.dispose();
    },
  };
}
