// Solmar Bay — cars: boxy arcade models, player driving physics and NPC traffic.
import * as THREE from '../vendor/three.module.min.js';
import { CFG } from './config.js';
import { Rng } from './random.js';

const CAR_COLORS = [0xd84040, 0x3f7fd0, 0xf2c14e, 0x7fc76a, 0xe8e8e8, 0x8a5fc0, 0x2b2b2e, 0xf08a3c];

// Build a low-poly car from boxes and cylinders. Returns { group, wheels }.
export function makeCarMesh(color, isPolice = false) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: isPolice ? 0x1a1a1c : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.3), bodyMat);
  body.position.y = 0.62;
  group.add(body);
  const cabinMat = new THREE.MeshLambertMaterial({ color: isPolice ? 0xf2f2f2 : 0x222831 });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), cabinMat);
  cabin.position.set(0, 1.18, -0.25);
  group.add(cabin);
  if (isPolice) {
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 1.0), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
    hood.position.set(0, 0.95, 1.5);
    group.add(hood);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.38, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  // Headlights and tail lights.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const wx of [-0.65, 0.65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.08), headMat);
    h.position.set(wx, 0.62, 2.16);
    group.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const wx of [-0.65, 0.65]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.08), tailMat);
    t.position.set(wx, 0.62, -2.16);
    group.add(t);
  }
  let lightBar = null;
  let beaconL = null;
  let beaconR = null;
  if (isPolice) {
    lightBar = new THREE.Group();
    beaconL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    beaconL.position.set(-0.4, 1.55, -0.25);
    beaconR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0x2040ff }));
    beaconR.position.set(0.4, 1.55, -0.25);
    lightBar.add(beaconL, beaconR);
    group.add(lightBar);
  }
  group.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return { group, wheels, beaconL, beaconR };
}

// One drivable car: arcade physics (accelerate / brake / steer / drift).
export class Car {
  constructor(scene, x, z, heading, color, isPolice = false) {
    const built = makeCarMesh(color, isPolice);
    this.mesh = built.group;
    this.wheels = built.wheels;
    this.beaconL = built.beaconL;
    this.beaconR = built.beaconR;
    this.isPolice = isPolice;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.health = 100;
    this.stolen = false;
    this.driver = null; // 'player' | 'npc' | null
    scene.add(this.mesh);
    this.syncMesh();
  }
  syncMesh() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    for (const w of this.wheels) w.rotation.x += this.speed * 0.016;
  }
  // input: { throttle: -1..1, steer: -1..1, handbrake: bool }
  drive(dt, input, city) {
    const grip = input.handbrake ? CFG.handbrakeGrip : CFG.carGrip;
    this.speed += input.throttle * CFG.carAccel * dt;
    if (input.throttle === 0) this.speed *= Math.pow(0.4, dt);
    if (input.throttle < 0 && this.speed > 0.5) this.speed -= CFG.carBrake * dt;
    this.speed = Math.max(-CFG.carReverseMax, Math.min(CFG.carTopSpeed, this.speed));
    const steerTarget = input.steer * CFG.carSteer * Math.min(1, Math.abs(this.speed) / 8 + 0.25);
    this.steer += (steerTarget - this.steer) * Math.min(1, grip * dt);
    this.heading += this.steer * dt * Math.sign(this.speed || 1) * Math.min(1, Math.abs(this.speed) / 6);
    const nx = this.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.z + Math.cos(this.heading) * this.speed * dt;
    const solved = city.collideCircle(nx, nz, 1.4);
    if (solved.hit) this.speed *= 0.55;
    this.x = Math.max(-CFG.worldHalf - 6, Math.min(CFG.worldHalf + 6, solved.x));
    this.z = Math.max(-CFG.worldHalf - 6, Math.min(CFG.worldHalf + 6, solved.z));
    // Tilt the body a touch when steering hard.
    this.mesh.rotation.z = -this.steer * 0.06 * Math.sign(this.speed || 1);
    this.syncMesh();
  }
  flashBeacons(t) {
    if (!this.beaconL) return;
    const on = Math.floor(t * 6) % 2 === 0;
    this.beaconL.material.color.setHex(on ? 0xff2020 : 0x551111);
    this.beaconR.material.color.setHex(on ? 0x111155 : 0x2040ff);
  }
  dispose(scene) {
    scene.remove(this.mesh);
  }
}

// NPC traffic: cars looping along the street grid, slowing for the car ahead.
export class Traffic {
  constructor(scene, city, seed) {
    this.scene = scene;
    this.city = city;
    this.rng = new Rng(seed + 77);
    this.cars = [];
    for (let i = 0; i < CFG.trafficCount; i++) this.spawnCar(true);
  }
  randomRoadSpot() {
    const s = this.rng.pick(this.city.streets);
    const along = this.rng.range(-95, 95);
    if (this.rng.chance(0.5)) return { x: s, z: along, heading: this.rng.chance(0.5) ? 0 : Math.PI };
    return { x: along, z: s, heading: this.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2 };
  }
  spawnCar(initial = false) {
    const spot = this.randomRoadSpot();
    const car = new Car(this.scene, spot.x, spot.z, spot.heading, this.rng.pick(CAR_COLORS));
    car.driver = 'npc';
    car.speed = CFG.trafficSpeed * this.rng.range(0.8, 1.15);
    car.npcLane = this.rng.pick([-1.6, 1.6]);
    this.cars.push(car);
    return car;
  }
  // Nearest NPC car to a point, for stealing and for the minimap.
  nearest(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const c of this.cars) {
      if (c.driver !== 'npc') continue;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }
  update(dt, playerCar) {
    for (const car of this.cars) {
      if (car.driver !== 'npc') continue;
      // Slow down if another car is close ahead.
      let ahead = Infinity;
      for (const other of this.cars) {
        if (other === car) continue;
        const dx = other.x - car.x;
        const dz = other.z - car.z;
        const forward = Math.sin(car.heading) * dx + Math.cos(car.heading) * dz;
        const side = Math.abs(Math.cos(car.heading) * dx - Math.sin(car.heading) * dz);
        if (forward > 0 && forward < 9 && side < 2.4) ahead = Math.min(ahead, forward);
      }
      if (playerCar) {
        const dx = playerCar.x - car.x;
        const dz = playerCar.z - car.z;
        const forward = Math.sin(car.heading) * dx + Math.cos(car.heading) * dz;
        const side = Math.abs(Math.cos(car.heading) * dx - Math.sin(car.heading) * dz);
        if (forward > 0 && forward < 9 && side < 2.4) ahead = Math.min(ahead, forward);
      }
      const target = ahead < 9 ? 0 : CFG.trafficSpeed;
      car.speed += (target - car.speed) * Math.min(1, 1.5 * dt);
      // Stay glued to the current street line; at the edge, turn onto a cross street.
      const road = this.city.nearestRoadPoint(car.x, car.z);
      const nx = car.x + Math.sin(car.heading) * car.speed * dt;
      const nz = car.z + Math.cos(car.heading) * car.speed * dt;
      if (Math.abs(nx) > 96 || Math.abs(nz) > 96) {
        car.heading += Math.PI / 2;
        car.x = Math.max(-95, Math.min(95, car.x));
        car.z = Math.max(-95, Math.min(95, car.z));
      } else {
        car.x = nx;
        car.z = nz;
      }
      // Gentle pull back onto the street centre line.
      if (road.along === 'z') car.x += (road.x - car.x) * Math.min(1, 0.8 * dt);
      else car.z += (road.z - car.z) * Math.min(1, 0.8 * dt);
      car.syncMesh();
    }
  }
}
