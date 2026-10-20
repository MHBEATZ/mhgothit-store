// MH BEATS — cinematic WebGL scene
// chrome extruded logo -> fly-through tunnel -> 3D cover-flow vault with vinyl
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import LOGO from './logo-shapes.json';
import { audioState } from './player.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

const CAROUSEL_Z = -44;       // where the vault lives along the tunnel
const COVER_H = 3;            // world height of a cover

export function initScene(canvas, { onSelect, onPick, onHover } = {}) {
  const isMobile = matchMedia('(max-width:800px)').matches || /Mobi|Android/i.test(navigator.userAgent);
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  if (!renderer.capabilities.isWebGL2 && !renderer.getContext()) return null;

  let pr = Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 1.75);
  renderer.setPixelRatio(pr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0c10, 0.011);
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 160);
  camera.position.set(0, 0, 14);

  /* ---------- environment (studio softboxes for the chrome) ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  (function makeEnv() {
    const e = new THREE.Scene();
    e.add(new THREE.Mesh(new THREE.BoxGeometry(40, 22, 40), new THREE.MeshBasicMaterial({ color: 0x050608, side: THREE.BackSide })));
    const box = (w, h, x, y, z, col, k, ry = 0, rx = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.rotation.set(rx, ry, 0); e.add(m);
    };
    box(16, 5, 0, 10.5, 0, 0xffffff, 7, 0, Math.PI / 2);          // big top softbox
    box(3, 16, -12, 1, 3, 0xcfe0ff, 11, Math.PI / 2);             // cool left strip
    box(3, 16, 12, 1, 2, 0xfff0e0, 8, -Math.PI / 2);              // warm right strip
    box(22, 2.4, 0, 2, -16, 0xdfe8ff, 5);                         // back bar
    box(14, 1.2, 0, -9, 4, 0x8aa0c8, 2.2, 0, Math.PI / 2);        // floor kicker
    box(2, 9, -6, 0, 16, 0xffffff, 6, Math.PI);                   // front fill
    scene.environment = pmrem.fromScene(e, 0.015).texture;
  })();

  /* ---------- backdrop (gradient + accent haze that follows the camera) ---------- */
  const backMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uAccent: { value: new THREE.Color(0x7d8ea8) }, uGlow: { value: 1 }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform vec3 uAccent;uniform float uGlow,uTime;varying vec3 vP;
      void main(){vec3 d=normalize(vP);float up=d.y*.5+.5;
        vec3 c=mix(vec3(.006,.007,.01),vec3(.034,.04,.052),pow(up,1.8));
        float f=pow(max(dot(d,vec3(0.,.06,-1.)),0.),5.);
        c+=uAccent*uGlow*(.075*f+.018*pow(f,.4));
        c+=vec3(.9,.95,1.)*.006*pow(max(d.y,0.),6.);
        gl_FragColor=vec4(c,1.);}`
  });
  const backdrop = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), backMat);
  backdrop.renderOrder = -10; scene.add(backdrop);

  /* ---------- lights ---------- */
  const key = new THREE.PointLight(0xdfe8ff, 22, 30, 2); key.position.set(4, 4, 7); scene.add(key);
  const rim = new THREE.PointLight(0x7aa2ff, 16, 30, 2); rim.position.set(-6, -2, -4); scene.add(rim);

  /* ---------- the chrome logo (real 3D from the logo silhouette) ---------- */
  const logoGroup = new THREE.Group(); scene.add(logoGroup);
  const logoSpin = new THREE.Group(); logoGroup.add(logoSpin);
  let logoReady = false;
  const readyPromise = new Promise(res => {
    new THREE.TextureLoader().load('assets/logo.webp', tex => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const shapes = LOGO.shapes.map(s => {
        const sh = new THREE.Shape(s.o.map(p => new THREE.Vector2(p[0], p[1])));
        s.h.forEach(h => sh.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0], p[1])))));
        return sh;
      });
      const geo = new THREE.ExtrudeGeometry(shapes, { depth: 46, bevelEnabled: true, bevelThickness: 9, bevelSize: 5, bevelOffset: -2, bevelSegments: 5, curveSegments: 1, steps: 1 });
      // map the painted chrome onto the front/back faces
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / LOGO.w + 0.5, pos.getY(i) / LOGO.h + 0.5);
      geo.translate(0, 0, -23);
      const k = 0.0072; geo.scale(k, k, k);
      const cap = new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: tex, bumpScale: 3.2, metalness: 0.92, roughness: 0.2, envMapIntensity: 1.0, clearcoat: 0.5, clearcoatRoughness: 0.12, color: 0xffffff });
      const side = new THREE.MeshPhysicalMaterial({ color: 0xc9d2e2, metalness: 1, roughness: 0.16, envMapIntensity: 1.25 });
      const mesh = new THREE.Mesh(geo, [cap, side]);
      logoSpin.add(mesh);
      logoReady = true; res(true);
    }, undefined, () => res(false));
  });
  setTimeout(() => readyPromise.then(() => { }), 0);

  // orbit rings echoing the logo's ellipse
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
  const rings = [];
  [[5.2, 0.012], [6.1, 0.008], [7.0, 0.006]].forEach(([r, t], i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, 220), ringMat.clone());
    m.rotation.set(1.25 - i * 0.07, 0.1, -0.32 + i * 0.05); m.material.opacity = 0.2 - i * 0.05;
    logoSpin.add(m); rings.push(m);
  });

  // anamorphic light streak
  const streakMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uI: { value: 0.5 }, uC: { value: new THREE.Color(0x9fb8ff) } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uI;uniform vec3 uC;varying vec2 vUv;void main(){float x=abs(vUv.x-.5)*2.,y=abs(vUv.y-.5)*2.;float a=exp(-y*y*60.)*pow(1.-x,2.2);gl_FragColor=vec4(uC*a*uI,a*uI);}'
  });
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(30, 3), streakMat);
  streak.position.set(0, 0.2, -2.2); logoGroup.add(streak);

  /* ---------- particles, speed lines, chrome shards ---------- */
  const sprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(.25, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  function dust(n, size, op, spread, zA, zB, col) {
    const g = new THREE.BufferGeometry(), a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = (Math.random() - .5) * spread; a[i * 3 + 1] = (Math.random() - .5) * spread * .6; a[i * 3 + 2] = lerp(zA, zB, Math.random()); }
    g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ map: sprite, size, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    p.frustumCulled = false; scene.add(p); return p;
  }
  const dustA = dust(isMobile ? 700 : 1800, 0.07, 0.75, 34, 14, CAROUSEL_Z - 10, 0xdfe8ff);
  const dustB = dust(isMobile ? 18 : 46, 0.9, 0.1, 30, 10, CAROUSEL_Z - 6, 0x8fb0ff);

  const SL = isMobile ? 120 : 260, slPos = new Float32Array(SL * 6), slSide = new Float32Array(SL * 2);
  for (let i = 0; i < SL; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.2 + Math.random() * 11, z = lerp(8, CAROUSEL_Z + 2, Math.random());
    const x = Math.cos(a) * r, y = Math.sin(a) * r * .6;
    slPos.set([x, y, z, x, y, z], i * 6); slSide[i * 2] = 0; slSide[i * 2 + 1] = 1;
  }
  const slGeo = new THREE.BufferGeometry();
  slGeo.setAttribute('position', new THREE.BufferAttribute(slPos, 3)); slGeo.setAttribute('side', new THREE.BufferAttribute(slSide, 1));
  const slMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uS: { value: 0 }, uO: { value: 0 } },
    vertexShader: 'attribute float side;uniform float uS;void main(){vec3 p=position;p.z+=side*uS;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader: 'uniform float uO;void main(){gl_FragColor=vec4(.75,.85,1.,uO);}'
  });
  const speed = new THREE.LineSegments(slGeo, slMat); speed.frustumCulled = false; scene.add(speed);

  const SH = isMobile ? 18 : 40, shardMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.3, 0),
    new THREE.MeshPhysicalMaterial({ color: 0xd8e0ee, metalness: 1, roughness: 0.12, envMapIntensity: .9, flatShading: true }), SH);
  const shards = [];
  for (let i = 0; i < SH; i++) {
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 9;
    shards.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * .55, z: lerp(-2, CAROUSEL_Z + 6, Math.random()), s: .4 + Math.random() * 1.1, rx: Math.random() * 6, ry: Math.random() * 6, v: (Math.random() - .5) * .6, sy: .5 + Math.random() * 1.4 });
  }
  shardMesh.frustumCulled = false; scene.add(shardMesh);
  const dummy = new THREE.Object3D();

  /* ---------- 3D cover-flow vault ---------- */
  const vaultGroup = new THREE.Group(); vaultGroup.position.set(0, 0.35, CAROUSEL_Z); scene.add(vaultGroup);
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x70788a, metalness: 1, roughness: 0.42, envMapIntensity: 0.45 });
  const backCoverMat = new THREE.MeshStandardMaterial({ color: 0x121317, metalness: .6, roughness: .5 });
  const texLoader = new THREE.TextureLoader(); texLoader.setCrossOrigin('anonymous');
  const boxGeo = new THREE.BoxGeometry(1, 1, 0.07), planeGeo = new THREE.PlaneGeometry(1, 1);

  const glowMat = () => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uC: { value: new THREE.Color(0x667799) }, uI: { value: 0.0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 uC;uniform float uI;varying vec2 vUv;void main(){vec2 p=abs(vUv-.5)*2.;float d=pow(max(p.x,p.y),2.4);float a=smoothstep(1.,.45,max(p.x,p.y))*.9*(1.-d*.4);gl_FragColor=vec4(uC*a*uI,a*uI);}'
  });
  const reflMat = () => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    uniforms: { map: { value: null }, uA: { value: 0.32 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform sampler2D map;uniform float uA;varying vec2 vUv;void main(){vec4 c=texture2D(map,vUv);float a=pow(vUv.y,2.6)*uA;gl_FragColor=vec4(c.rgb*.9,a);}'
  });

  let covers = [], beats = [], selTarget = 0, pos = 0, playingIdx = -1;
  const pickables = [];

  function makeCover(b, i) {
    const g = new THREE.Group();
    const front = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.42, metalness: 0.05, envMapIntensity: 0.55, emissive: 0xffffff, emissiveIntensity: 0.0 });
    const body = new THREE.Mesh(boxGeo, [edgeMat, edgeMat, edgeMat, edgeMat, front, backCoverMat]);
    body.scale.set(COVER_H * 2 / 3, COVER_H, 1); body.userData.idx = i; g.add(body); pickables.push(body);
    const refl = new THREE.Mesh(planeGeo, reflMat()); refl.scale.set(COVER_H * 2 / 3, -COVER_H, 1); refl.position.y = -COVER_H - 0.1; g.add(refl);
    const glow = new THREE.Mesh(planeGeo, glowMat()); glow.scale.set(COVER_H * 2 / 3 * 1.9, COVER_H * 1.7, 1); glow.position.z = -0.25; g.add(glow);
    vaultGroup.add(g);
    return { g, body, front, refl, glow, aspect: 2 / 3, loaded: false, loading: false, color: new THREE.Color(0x667799), i };
  }
  function ensureTex(c) {
    if (c.loaded || c.loading || !beats[c.i]) return; c.loading = true;
    texLoader.load(beats[c.i].art, tex => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const im = tex.image; const asp = clamp(im.width / im.height, .5, 1.6);
      c.aspect = asp; const w = COVER_H * asp;
      c.body.scale.x = w; c.refl.scale.x = w; c.glow.scale.x = w * 1.9;
      c.front.map = tex; c.front.emissiveMap = tex; c.front.color.set(0xffffff); c.front.emissiveIntensity = 0.22; c.front.needsUpdate = true;
      c.refl.material.uniforms.map.value = tex;
      try { // dominant colour for glow / UI accent
        const cv = document.createElement('canvas'); cv.width = cv.height = 12; const x = cv.getContext('2d'); x.drawImage(im, 0, 0, 12, 12);
        const d = x.getImageData(0, 0, 12, 12).data; let r = 0, g = 0, b = 0, wsum = 0;
        for (let k = 0; k < d.length; k += 4) { const mx = Math.max(d[k], d[k + 1], d[k + 2]), mn = Math.min(d[k], d[k + 1], d[k + 2]); const w = (mx - mn) / 255 + .05; r += d[k] * w; g += d[k + 1] * w; b += d[k + 2] * w; wsum += w; }
        const col = new THREE.Color(r / wsum / 255, g / wsum / 255, b / wsum / 255); const hsl = {}; col.getHSL(hsl); col.setHSL(hsl.h, clamp(hsl.s * 1.25, .35, 1), clamp(hsl.l, .45, .62));
        c.color.copy(col); c.glow.material.uniforms.uC.value.copy(col);
        beats[c.i]._accent = '#' + col.getHexString();
        if (Math.round(selTarget) === c.i) onSelect && onSelect(c.i, beats[c.i]);
      } catch (e) { }
      c.loaded = true; c.loading = false;
      if (vinylIdx === c.i) paintVinyl(c.i);
    }, undefined, () => { c.loading = false; c.loaded = true; });
  }

  // vinyl that slides out from behind the active cover
  const vinylCanvas = document.createElement('canvas'); vinylCanvas.width = vinylCanvas.height = 1024;
  const vinylTex = new THREE.CanvasTexture(vinylCanvas); vinylTex.colorSpace = THREE.SRGBColorSpace; vinylTex.anisotropy = 8;
  let vinylIdx = -2;
  function paintVinyl(i) {
    vinylIdx = i;
    const x = vinylCanvas.getContext('2d'), S = 1024, C = S / 2;
    x.clearRect(0, 0, S, S); x.fillStyle = '#07080b'; x.beginPath(); x.arc(C, C, C, 0, 7); x.fill();
    for (let r = 120; r < C - 6; r += 3.1) { x.strokeStyle = `rgba(${150 + (r % 9) * 8},${160 + (r % 7) * 6},${190},${.035 + (r % 5) * .012})`; x.lineWidth = 1; x.beginPath(); x.arc(C, C, r, 0, 7); x.stroke(); }
    if (x.createConicGradient) {
      const cg = x.createConicGradient(0.6, C, C); cg.addColorStop(0, 'rgba(255,255,255,.16)'); cg.addColorStop(.12, 'rgba(255,255,255,0)'); cg.addColorStop(.5, 'rgba(255,255,255,.16)'); cg.addColorStop(.62, 'rgba(255,255,255,0)'); cg.addColorStop(1, 'rgba(255,255,255,.16)');
      x.fillStyle = cg; x.beginPath(); x.arc(C, C, C - 4, 0, 7); x.arc(C, C, 118, 0, 7, true); x.fill('evenodd');
    }
    const cv = covers[i];
    x.save(); x.beginPath(); x.arc(C, C, 150, 0, 7); x.clip();
    if (cv && cv.front.map && cv.front.map.image) { const im = cv.front.map.image, s = Math.min(im.width, im.height); x.drawImage(im, (im.width - s) / 2, (im.height - s) / 3, s, s, C - 150, C - 150, 300, 300); }
    else { x.fillStyle = '#9aa4b6'; x.fillRect(C - 150, C - 150, 300, 300); }
    x.restore(); x.fillStyle = '#0a0b0e'; x.beginPath(); x.arc(C, C, 14, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 3; x.beginPath(); x.arc(C, C, 150, 0, 7); x.stroke();
    vinylTex.needsUpdate = true;
  }
  const vinylMat = new THREE.MeshStandardMaterial({ map: vinylTex, metalness: 0.55, roughness: 0.32, envMapIntensity: 1.3, transparent: true });
  const vinylSide = new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: .6 });
  const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.035, 96), [vinylSide, vinylMat, vinylMat]);
  vinyl.rotation.x = Math.PI / 2; const vinylHolder = new THREE.Group(); vinylHolder.add(vinyl); vaultGroup.add(vinylHolder);
  let vinylOut = 0;

  function layout(d) { // cover-flow transform for signed distance d from the selected slot
    const ad = Math.abs(d), s = Math.sign(d), near = Math.min(ad, 1);
    return {
      x: s * (near * 2.15 + Math.max(ad - 1, 0) * 1.05),
      z: (1 - near) * 1.4 - Math.min(ad, 6) * 0.55,
      ry: -clamp(d, -1, 1) * 0.92,
      sc: 1 + (1 - near) * 0.26, ad
    };
  }

  /* ---------- composer ---------- */
  const rt = new THREE.WebGLRenderTarget(innerWidth * pr, innerHeight * pr, { type: THREE.HalfFloatType, samples: isMobile ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const fx = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uCA: { value: 0.0007 }, uGrain: { value: 0.045 }, uVig: { value: 0.85 }, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D tDiffuse;uniform float uTime,uCA,uGrain,uVig;uniform vec2 uRes;varying vec2 vUv;
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){vec2 c=vUv-.5;float d=dot(c,c);vec2 o=c*uCA*(.35+d*3.);
        vec3 col=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b);
        float n=h(floor(vUv*uRes*.5)+floor(uTime*24.)*7.13);col+=(n-.5)*uGrain*(1.1-dot(col,vec3(.33)));
        col*=1.-smoothstep(.12,.62,d)*uVig;
        gl_FragColor=vec4(col,1.);}`
  });
  composer.addPass(fx);

  /* ---------- state + input ---------- */
  const heroEl = document.getElementById('hero'), vaultEl = document.getElementById('store');
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; }, { passive: true });
  let vaultTopAbs = 1, vaultH = innerHeight;
  function measure() { const r = vaultEl.getBoundingClientRect(); vaultTopAbs = r.top + scrollY; vaultH = r.height; }

  function size() {
    const w = innerWidth, h = innerHeight; renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    composer.setPixelRatio(pr); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    fx.uniforms.uRes.value.set(w * pr, h * pr); measure();
  }
  addEventListener('resize', size); size();
  new ResizeObserver(measure).observe(document.body);

  // drag / click on the vault
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let dragging = false, dx0 = 0, selAtDown = 0, moved = 0, lastClickIdx = -1;
  const slotPx = () => Math.min(innerWidth, 1100) * 0.2;
  function hit(e) {
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(pickables.filter(p => p.parent.visible), false)[0]; return h ? h.object.userData.idx : -1;
  }
  vaultEl.addEventListener('pointerdown', e => { if (e.target.closest('button,select,a,.vault-ui')) return; dragging = true; dx0 = e.clientX; selAtDown = selTarget; moved = 0; });
  addEventListener('pointermove', e => {
    if (dragging) { const dx = e.clientX - dx0; moved = Math.max(moved, Math.abs(dx)); if (moved > 8) selTarget = clamp(selAtDown - dx / slotPx(), 0, Math.max(0, beats.length - 1)); }
    else if (vaultEl.matches(':hover')) { const i = hit(e); onHover && onHover(i >= 0); }
  }, { passive: true });
  addEventListener('pointerup', e => {
    if (!dragging) return; dragging = false;
    if (moved <= 8) { const i = hit(e); if (i >= 0) { if (i === Math.round(selTarget)) onPick && onPick(i); else api.select(i); } }
    else api.select(Math.round(selTarget));
  });
  addEventListener('keydown', e => { if (e.key === 'ArrowRight') api.step(1); if (e.key === 'ArrowLeft') api.step(-1); });

  /* ---------- main loop ---------- */
  const api = {
    ready: readyPromise,
    setBeats(list) {
      beats = list; pickables.length = 0; covers.forEach(c => vaultGroup.remove(c.g)); covers = list.map(makeCover);
      selTarget = clamp(selTarget, 0, Math.max(0, list.length - 1)); pos = selTarget; vinylIdx = -2; measure();
      covers.forEach(c => { if (Math.abs(c.i - selTarget) <= 5) ensureTex(c); });
      onSelect && list.length && onSelect(Math.round(selTarget), list[Math.round(selTarget)]);
    },
    select(i) { const n = clamp(i, 0, Math.max(0, beats.length - 1)); selTarget = n; onSelect && onSelect(n, beats[n]); },
    step(d) { if (vaultEl.getBoundingClientRect().top < innerHeight * .8) api.select(Math.round(selTarget) + d); },
    setPlaying(i) { playingIdx = i; },
    get index() { return Math.round(selTarget); },
    started: 0
  };

  let last = performance.now(), u = 0, prevU = 0, vel = 0, slow = 0, qDown = false, introT = 0, lastSel = -1, shakeT = 0;
  const camTarget = new THREE.Vector3(), bassS = { v: 0 };
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000); last = t; const T = t / 1000;
    const sy = scrollY, vr = vaultEl.getBoundingClientRect();
    // sleep when the vault is far above the viewport (content below is opaque)
    if (vr.bottom < -innerHeight * 0.3) { canvas.style.visibility = 'hidden'; return; } canvas.style.visibility = '';
    if (api.started) introT += dt;

    // adaptive quality
    slow = dt > 0.03 ? slow + 1 : Math.max(0, slow - 2);
    if (slow > 80 && !qDown) { qDown = true; pr = 1; bloom.enabled = false; size(); }

    // audio
    const A = audioState, bass = A.bass, mid = A.mid, hi = A.hi;
    bassS.v += (bass - bassS.v) * .35;

    // scroll -> camera path
    const uT = clamp(sy / Math.max(1, vaultTopAbs));
    prevU = u; u += (uT - u) * (1 - Math.exp(-dt * (reduce ? 20 : 5.5))); vel = (u - prevU) / Math.max(dt, .001);
    const asp = camera.aspect, fovT = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(11.5, 6.4 / (2 * fovT * asp));   // vault viewing distance (wider on phones)
    const finalZ = CAROUSEL_Z + dist;
    const intro = reduce ? 1 : smooth(0, 3.2, introT);                  // opening dolly
    const z0 = lerp(17, 9.5, intro);
    const camZ = lerp(z0, finalZ, Math.pow(u, 1.0));
    const shift = clamp(-vr.top / innerHeight, 0, 2);                 // vault scrolls away with the page
    const visH = 2 * dist * fovT;
    mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 3)); mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 3));
    const par = 1 - u * .65;
    camera.position.set(mouse.sx * 1.3 * par, -mouse.sy * 0.8 * par + shift * visH, camZ);
    shakeT += dt * 40; const sh = bassS.v * 0.012 * (1 - u);
    camera.position.x += Math.sin(shakeT) * sh; camera.position.y += Math.cos(shakeT * 1.3) * sh;
    camTarget.set(mouse.sx * 0.5 * par, -mouse.sy * 0.3 * par + shift * visH, camZ - 10); camera.lookAt(camTarget);
    camera.rotateZ(Math.sin(T * .3) * .004 + vel * 0.02);
    backdrop.position.copy(camera.position);

    // logo: float, react, then whoosh past the camera as you scroll
    const e = smooth(0, 0.3, u);
    const fit = Math.min(1, (2 * (camZ - logoGroup.position.z) * fovT * asp * 0.8) / 7.2);
    const sc = Math.max(.3, Math.min(fit, 1) * (isMobile ? 1 : .98));
    logoGroup.position.set(-9 * e, 0.62 + 1.2 * e + Math.sin(T * .7) * .06, 12.5 * e);
    logoGroup.scale.setScalar(sc * (1 + bassS.v * .03));
    logoSpin.rotation.y = Math.sin(T * .35) * 0.28 + mouse.sx * 0.5 - e * 1.4 + (reduce ? 0 : Math.sin(T * 1.1) * .02);
    logoSpin.rotation.x = Math.sin(T * .27) * .06 - mouse.sy * 0.25;
    logoGroup.visible = e < 0.99;
    rings.forEach((r, i) => { r.rotation.z += dt * (.05 + i * .02) * (1 + bassS.v * 3); r.material.opacity = (.2 - i * .05) * (1 + bassS.v * 2); });
    streakMat.uniforms.uI.value = 0.2 + bassS.v * .8 + Math.sin(T * 1.3) * .03; streak.scale.x = 1 + bassS.v * .5;
    key.position.set(4 + Math.sin(T * .6) * 3, 3.5 + Math.cos(T * .5) * 1.2, 7); key.intensity = 20 + bassS.v * 50;
    rim.position.set(-6 + Math.cos(T * .4) * 2, -2, -4 + Math.sin(T * .3) * 2);
    renderer.toneMappingExposure = .9 + bassS.v * .18;

    // tunnel life
    dustA.rotation.z = T * .01; dustB.rotation.z = -T * .015;
    dustA.material.opacity = .6 + hi * .5;
    const sv = Math.abs(vel); slMat.uniforms.uS.value = clamp(sv * 20, 0, 8) + (playingIdx >= 0 ? 0.5 + bassS.v * 3 : 0.4); slMat.uniforms.uO.value = clamp(.05 + sv * 2.2, 0, .4) * (1 - smooth(.88, 1, u));
    for (let i = 0; i < SH; i++) {
      const s = shards[i]; s.rx += dt * s.v; s.ry += dt * s.v * .7;
      dummy.position.set(s.x, s.y + Math.sin(T * .4 + i) * .25, s.z); dummy.rotation.set(s.rx, s.ry, 0);
      dummy.scale.set(s.s * (1 + mid * .4), s.s * s.sy, s.s); dummy.updateMatrix(); shardMesh.setMatrixAt(i, dummy.matrix);
    }
    shardMesh.instanceMatrix.needsUpdate = true;

    // vault carousel
    const selI = Math.round(selTarget);
    pos += (selTarget - pos) * (1 - Math.exp(-dt * 7));
    vaultGroup.position.y = .3;
    let accent = covers[selI] ? covers[selI].color : null;
    covers.forEach(c => {
      const d = c.i - pos, L = layout(d);
      const vis = L.ad < 6.5 && u > 0.35; c.g.visible = vis; if (!vis) return;
      if (L.ad < 6) ensureTex(c);
      c.g.position.set(L.x, Math.sin(T * .8 + c.i) * .03 * (1 - Math.min(L.ad, 1)), L.z); c.g.rotation.y = L.ry; c.g.scale.setScalar(L.sc);
      const dim = 1 - Math.min(L.ad, 5) * .1; c.front.color.setScalar(c.loaded ? dim : .11);
      const isSel = c.i === selI, isPlay = c.i === playingIdx;
      c.front.emissiveIntensity = c.loaded ? .18 + (isSel ? .1 : 0) + (isPlay ? bassS.v * .5 : 0) : 0;
      c.glow.material.uniforms.uI.value = (isSel ? .42 : .09) * (1 + (isPlay ? bassS.v * 1.7 : 0)) * (1 - Math.min(L.ad, 3) * .25);
      c.refl.material.uniforms.uA.value = .34 * dim;
    });
    // vinyl
    if (covers[selI]) {
      if (vinylIdx !== selI && covers[selI].loaded) paintVinyl(selI);
      const L = layout(selI - pos), want = playingIdx === selI ? 1 : 0; vinylOut += (want - vinylOut) * (1 - Math.exp(-dt * 2.6));
      const cw = covers[selI].aspect * COVER_H * L.sc;
      vinylHolder.visible = L.ad < .6 && (vinylOut > .004 || playingIdx === selI);
      vinylHolder.position.set(L.x + vinylOut * (cw * .5 + .8), Math.sin(T * .8 + selI) * .03, L.z - .14);
      vinylHolder.scale.setScalar(L.sc * (.97 + bassS.v * .05)); vinyl.rotation.y -= dt * (playingIdx === selI ? 3.4 : 0);
    } else vinylHolder.visible = false;

    // backdrop accent follows the selected art once we arrive
    if (accent) backMat.uniforms.uAccent.value.lerp(u > .6 ? accent : new THREE.Color(0x8fa6cc), .05);
    backMat.uniforms.uGlow.value = 1 + bassS.v * 1.4 + (u > .6 ? .6 : 0);
    fx.uniforms.uTime.value = T; fx.uniforms.uCA.value = .0006 + clamp(sv * .015, 0, .005) + bassS.v * .001;
    bloom.strength = .28 + bassS.v * .5 + clamp(sv * 1.2, 0, .2);
    if (selI !== lastSel) { lastSel = selI; for (let k = -4; k <= 4; k++) covers[selI + k] && ensureTex(covers[selI + k]); }

    composer.render();
  }
  requestAnimationFrame(frame);
  api.three = { scene, camera, renderer };
  return api;
}
