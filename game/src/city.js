// Solmar Bay — the procedural coastal city: street grid, pastel towers,
// palm-lined promenade, beach and sea, all built from one seeded RNG.
import * as THREE from '../vendor/three.module.min.js';
import { CFG } from './config.js';
import { Rng } from './random.js';

// Canvas texture with lit windows, so towers glow at golden hour.
function makeWindowTexture(baseColor, litRatio, rng) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = baseColor;
  g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 6; x < 58; x += 10) {
      g.fillStyle = rng.chance(litRatio) ? '#ffe9a8' : '#2c3542';
      g.fillRect(x, y, 6, 8);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePalm(rng) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: CFG.palette.palmTrunk });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 3.4, 6), trunkMat);
  trunk.position.y = 1.7;
  trunk.rotation.z = rng.range(-0.08, 0.08);
  palm.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: CFG.palette.palmLeaf });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.4, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.9, 3.5, Math.sin(a) * 0.9);
    leaf.rotation.z = Math.cos(a) * 1.1;
    leaf.rotation.x = -Math.sin(a) * 1.1;
    palm.add(leaf);
  }
  return palm;
}

export function buildCity(scene, seed) {
  const rng = new Rng(seed);
  const P = CFG.palette;
  const group = new THREE.Group();
  group.name = 'SolmarBayCity';
  scene.add(group);

  const half = CFG.worldHalf;
  const streets = [];
  for (let v = -90; v <= 90; v += CFG.streetSpacing) streets.push(v);

  // Ground: grass base, sand beach strip, sea plane.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 60, half * 2 + 60),
    new THREE.MeshLambertMaterial({ color: P.grass })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 60, 26),
    new THREE.MeshLambertMaterial({ color: P.sand })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, CFG.beachZ + 8);
  group.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 120, 90),
    new THREE.MeshLambertMaterial({ color: P.sea })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.05, CFG.seaZ + 45);
  group.add(sea);

  // Roads: dark strips along every grid line, with pale centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: P.road });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8d8c8 });
  const lineLen = half * 2 + 8;
  for (const s of streets) {
    const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(CFG.streetWidth, lineLen), roadMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(s, 0.03, 0);
    group.add(vRoad);
    const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(lineLen, CFG.streetWidth), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.03, s);
    group.add(hRoad);
    for (let d = -half; d < half; d += 8) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 2.2), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(s, 0.05, d);
      group.add(dash);
    }
  }

  // Sidewalk slabs at the four corners of every intersection.
  const walkMat = new THREE.MeshLambertMaterial({ color: P.sidewalk });
  for (const sx of streets) {
    for (const sz of streets) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(7, 0.18, 7), walkMat);
      slab.position.set(sx + 8, 0.09, sz + 8);
      group.add(slab);
    }
  }

  // Buildings: one or two pastel towers per block, with lit windows.
  const colliders = [];
  const buildings = [];
  const blockCentres = [];
  for (let i = 0; i < streets.length - 1; i++) {
    for (let j = 0; j < streets.length - 1; j++) {
      const cx = (streets[i] + streets[i + 1]) / 2;
      const cz = (streets[j] + streets[j + 1]) / 2;
      if (cz > 88) continue; // beach blocks stay open
      blockCentres.push({ x: cx, z: cz });
    }
  }
  for (const b of blockCentres) {
    const count = rng.chance(0.55) ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const w = rng.range(7, 13);
      const d = rng.range(7, 13);
      const h = rng.range(6, 30);
      const ox = count === 1 ? 0 : (k === 0 ? -6 : 6);
      const oz = count === 1 ? 0 : (k === 0 ? -5 : 5);
      const color = rng.pick(P.buildingPastel);
      const tex = makeWindowTexture('#' + new THREE.Color(color).getHexString(), 0.45, rng);
      const mat = new THREE.MeshLambertMaterial({ map: tex, color: 0xffffff });
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      tower.position.set(b.x + ox, h / 2, b.z + oz);
      group.add(tower);
      // Flat roof cap in a darker shade.
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4),
        new THREE.MeshLambertMaterial({ color: 0x5a5f66 })
      );
      roof.position.set(b.x + ox, h + 0.25, b.z + oz);
      group.add(roof);
      colliders.push({ x: b.x + ox, z: b.z + oz, hw: w / 2 + 0.3, hd: d / 2 + 0.3 });
      buildings.push(tower);
    }
  }

  // District landmarks: a tall harbour tower north-west, a marina dome south-east.
  const landmark = new THREE.Mesh(
    new THREE.BoxGeometry(14, 44, 14),
    new THREE.MeshLambertMaterial({ map: makeWindowTexture('#8fd0e8', 0.6, rng) })
  );
  landmark.position.set(-60, 22, -60);
  group.add(landmark);
  colliders.push({ x: -60, z: -60, hw: 7.3, hd: 7.3 });

  // Palm trees along the promenade and random street corners.
  for (let x = -90; x <= 90; x += 15) {
    const palm = makePalm(rng);
    palm.position.set(x + rng.range(-2, 2), 0, CFG.beachZ - 2);
    group.add(palm);
  }
  for (const sx of streets) {
    for (const sz of streets) {
      if (rng.chance(0.3)) {
        const palm = makePalm(rng);
        palm.position.set(sx + 8, 0, sz - 8);
        group.add(palm);
      }
    }
  }

  // Street lamps with warm glowing heads.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x333a40 });
  const glowMat = new THREE.MeshBasicMaterial({ color: P.lamp });
  for (const sx of streets) {
    for (let z = -90; z <= 90; z += 30) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.4, 6), lampMat);
      pole.position.set(sx + 5.2, 2.2, z);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), glowMat);
      head.position.set(sx + 5.2, 4.5, z);
      group.add(head);
    }
  }

  // Golden-hour sky: gradient dome + low sun disc + haze.
  const skyGeo = new THREE.SphereGeometry(420, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(P.skyTop) },
      bottom: { value: new THREE.Color(P.skyBottom) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 bottom; void main(){ float h = normalize(vP).y * 0.5 + 0.5; gl_FragColor = vec4(mix(bottom, top, pow(h, 0.8)), 1.0); }',
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(16, 24),
    new THREE.MeshBasicMaterial({ color: P.sun, fog: false })
  );
  sun.position.set(-180, 90, -300);
  sun.lookAt(0, 0, 0);
  scene.add(sun);

  scene.fog = new THREE.Fog(0xf2c98f, 120, 380);

  // Lighting: warm sun + soft sky fill.
  const sunLight = new THREE.DirectionalLight(0xffe0b0, 2.4);
  sunLight.position.set(-120, 140, -80);
  scene.add(sunLight);
  scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 1.1));

  return {
    group,
    streets,
    colliders,
    buildings,
    half,
    // Nearest point on the street grid (used by traffic and the autopilot).
    nearestRoadPoint(x, z) {
      let best = null;
      let bestD = Infinity;
      for (const s of streets) {
        const dV = Math.abs(x - s);
        if (dV < bestD) { bestD = dV; best = { x: s, z, along: 'z' }; }
        const dH = Math.abs(z - s);
        if (dH < bestD) { bestD = dH; best = { x, z: s, along: 'x' }; }
      }
      return best;
    },
    // Push a circle out of every building AABB it overlaps. Returns true on hit.
    collideCircle(x, z, radius) {
      let hit = false;
      for (const c of colliders) {
        const dx = x - c.x;
        const dz = z - c.z;
        const px = c.hw + radius - Math.abs(dx);
        const pz = c.hd + radius - Math.abs(dz);
        if (px > 0 && pz > 0) {
          hit = true;
          if (px < pz) x = c.x + Math.sign(dx || 1) * (c.hw + radius);
          else z = c.z + Math.sign(dz || 1) * (c.hd + radius);
        }
      }
      return { x, z, hit };
    },
  };
}
