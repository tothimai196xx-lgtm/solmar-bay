// Solmar Bay — five story missions from fixer Mara Voss: steal, taxi, collect,
// evade, and the finale. Each has a 3D beacon, a minimap blip and a payout.
import * as THREE from '../vendor/three.module.min.js';
import { CFG } from './config.js';
import { Rng } from './random.js';

function makeBeacon(color) {
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.y = 13;
  group.add(beam);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.22, 8, 24),
    new THREE.MeshBasicMaterial({ color })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.25;
  group.add(ring);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 2.2, 8),
    new THREE.MeshBasicMaterial({ color })
  );
  cone.rotation.x = Math.PI;
  cone.position.y = 9;
  group.add(cone);
  return group;
}

export class Missions {
  constructor(scene, city, seed) {
    this.scene = scene;
    this.city = city;
    this.rng = new Rng(seed + 55);
    this.completed = new Set();
    this.current = null; // active mission runtime state
    this.beacon = null;
    this.packageMeshes = [];
    this.evadeTimer = 0;
    this.missionTimer = 0;
    this.clientPickedUp = false;
    this.briefcaseTaken = false;
    this.collected = 0;
    this.packageSpots = [];
  }
  currentDef() {
    return this.current ? CFG.missions[this.current.index] : null;
  }
  nextIndex() {
    for (let i = 0; i < CFG.missions.length; i++) {
      if (!this.completed.has(i)) return i;
    }
    return -1;
  }
  hasSave() {
    return this.completed.size > 0;
  }
  setCompleted(list) {
    this.completed = new Set(list);
  }
  clearBeacon() {
    if (this.beacon) {
      this.scene.remove(this.beacon);
      this.beacon = null;
    }
    for (const m of this.packageMeshes) this.scene.remove(m);
    this.packageMeshes = [];
  }
  placeBeacon(x, z, color = 0xffd23e) {
    this.clearBeacon();
    this.beacon = makeBeacon(color);
    this.beacon.position.set(x, 0, z);
    this.scene.add(this.beacon);
    return this.beacon;
  }
  start(index, game) {
    const def = CFG.missions[index];
    if (!def || this.current) return false;
    this.current = { index, phase: 'go', target: { ...def.target } };
    this.missionTimer = def.timeLimit || 0;
    this.evadeTimer = 0;
    this.clientPickedUp = false;
    this.briefcaseTaken = false;
    this.collected = 0;
    game.hud.showDialogue(def.briefing, def.title);
    game.audio.missionStart();
    if (def.kind === 'steal-deliver') {
      this.placeBeacon(def.target.x, def.target.z, 0xffd23e);
    } else if (def.kind === 'taxi') {
      this.placeBeacon(CFG.plaza.x, CFG.plaza.z, 0x53d769);
      this.current.target = { ...CFG.plaza };
    } else if (def.kind === 'collect') {
      this.packageSpots = [];
      const spots = [
        { x: -75, z: 75 }, { x: 75, z: -15 }, { x: -45, z: -75 },
        { x: 15, z: 45 }, { x: 75, z: 75 },
      ];
      for (const s of spots) {
        this.packageSpots.push({ ...s, taken: false });
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 1.1, 1.1),
          new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x664400 })
        );
        box.position.set(s.x, 0.8, s.z);
        this.scene.add(box);
        this.packageMeshes.push(box);
      }
      this.placeBeacon(spots[0].x, spots[0].z, 0xffd23e);
    } else if (def.kind === 'evade') {
      game.police.wanted = 3;
      game.police.lastCrimeAt = game.time;
      game.hud.flash('Wanted: 3 stars! Survive 60 seconds!');
    } else if (def.kind === 'finale') {
      this.placeBeacon(CFG.harbour.x, CFG.harbour.z, 0xff5a3c);
      this.current.target = { ...CFG.harbour };
    }
    return true;
  }
  fail(game, reason) {
    if (!this.current) return;
    const def = CFG.missions[this.current.index];
    game.hud.showDialogue(`Mara Voss: "That went sideways, Rio. ${reason} We run it back — same job, no hard feelings."`, `${def.title} — failed`);
    game.audio.missionFail();
    this.clearBeacon();
    this.current = null;
    game.police.wanted = Math.max(0, game.police.wanted - 1);
  }
  complete(game) {
    const def = CFG.missions[this.current.index];
    this.completed.add(this.current.index);
    game.money += def.reward;
    game.hud.showDialogue(`Mara Voss: "Clean work, Rio. $${def.reward} is yours${this.completed.size === CFG.missions.length ? ' — and the bay is ours. You did it.' : '.'}"`, `${def.title} — complete!`);
    game.audio.missionComplete();
    this.clearBeacon();
    this.current = null;
    if (this.completed.size === CFG.missions.length) game.win();
    game.save();
  }
  atTarget(game, radius) {
    const t = this.current.target;
    return Math.hypot(game.player.x - t.x, game.player.z - t.z) < radius;
  }
  update(dt, game) {
    if (this.beacon) {
      this.beacon.rotation.y += dt * 0.8;
      this.beacon.position.y = Math.sin(game.time * 2) * 0.15;
    }
    for (const m of this.packageMeshes) m.rotation.y += dt;
    if (!this.current) return;
    const def = CFG.missions[this.current.index];
    if (def.timeLimit) {
      this.missionTimer -= dt;
      if (this.missionTimer <= 0) {
        this.fail(game, 'Out of time.');
        return;
      }
    }
    if (def.kind === 'steal-deliver') {
      if (game.player.inCar && this.atTarget(game, def.radius)) this.complete(game);
    } else if (def.kind === 'taxi') {
      if (!this.clientPickedUp) {
        if (!game.player.inCar && this.atTarget(game, 5)) {
          this.clientPickedUp = true;
          game.hud.flash('Client aboard — get to the airport gate!');
          this.placeBeacon(CFG.airportGate.x, CFG.airportGate.z, 0x53d769);
          this.current.target = { ...CFG.airportGate };
        }
      } else if (game.player.inCar && this.atTarget(game, def.radius)) {
        this.complete(game);
      }
    } else if (def.kind === 'collect') {
      for (let i = 0; i < this.packageSpots.length; i++) {
        const s = this.packageSpots[i];
        if (!s.taken && Math.hypot(game.player.x - s.x, game.player.z - s.z) < 2.6) {
          s.taken = true;
          this.collected += 1;
          this.packageMeshes[i].visible = false;
          game.money += CFG.pickupCash;
          game.audio.pickup();
          game.hud.flash(`Package ${this.collected}/5 collected (+$${CFG.pickupCash}).`);
          const next = this.packageSpots.find((p) => !p.taken);
          if (next) this.placeBeacon(next.x, next.z, 0xffd23e);
        }
      }
      if (this.collected >= 5) this.complete(game);
    } else if (def.kind === 'evade') {
      if (game.police.wanted >= 3) {
        this.evadeTimer += dt;
        if (this.evadeTimer >= 60) this.complete(game);
      } else {
        this.fail(game, 'The heat dropped too early — the cops gave up before the clock did.');
      }
    } else if (def.kind === 'finale') {
      if (!this.briefcaseTaken) {
        if (!game.player.inCar && this.atTarget(game, 4)) {
          this.briefcaseTaken = true;
          game.addWanted(3, 'briefcase grabbed');
          game.hud.flash('Briefcase secured! Run the cordon to the safehouse!');
          this.placeBeacon(CFG.safehouse.x, CFG.safehouse.z, 0x53d769);
          this.current.target = { ...CFG.safehouse };
        }
      } else if (this.atTarget(game, def.radius)) {
        this.complete(game);
      }
    }
  }
}
