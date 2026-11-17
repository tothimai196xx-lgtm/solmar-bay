// Solmar Bay — pedestrians strolling the sidewalks, fleeing from gunfire and cars.
import * as THREE from '../vendor/three.module.min.js';
import { CFG } from './config.js';
import { Rng } from './random.js';

const SHIRTS = [0xe86a6a, 0x6aa8e8, 0x7fc76a, 0xf2c14e, 0xc98ae8, 0x5ad0c8, 0xf08a3c, 0xe8e8e8];
const PANTS = [0x2b3a4a, 0x4a2b2b, 0x2b4a33, 0x555555, 0x7a6a4a];

function makePedMesh(rng) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: rng.pick(SHIRTS) });
  const pants = new THREE.MeshLambertMaterial({ color: rng.pick(PANTS) });
  const skin = new THREE.MeshLambertMaterial({ color: [0xf2c9a0, 0xc98a5a, 0x8a5a3a][rng.int(0, 2)] });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.24), pants);
  legs.position.y = 0.4;
  g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.3), shirt);
  torso.position.y = 1.12;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skin);
  head.position.y = 1.65;
  g.add(head);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), shirt);
  armL.position.set(-0.36, 1.1, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.36;
  g.add(armR);
  return { group: g, armL, armR, legs };
}

export class Pedestrians {
  constructor(scene, city, seed) {
    this.scene = scene;
    this.city = city;
    this.rng = new Rng(seed + 31);
    this.list = [];
    for (let i = 0; i < CFG.pedCount; i++) this.spawn(true);
  }
  randomSidewalkSpot() {
    const s = this.rng.pick(this.city.streets);
    const along = this.rng.range(-92, 92);
    if (this.rng.chance(0.5)) return { x: s + 6.5, z: along };
    return { x: along, z: s + 6.5 };
  }
  spawn(initial = false) {
    const spot = this.randomSidewalkSpot();
    const built = makePedMesh(this.rng);
    built.group.position.set(spot.x, 0, spot.z);
    this.scene.add(built.group);
    const ped = {
      mesh: built.group,
      armL: built.armL,
      armR: built.armR,
      x: spot.x,
      z: spot.z,
      heading: this.rng.range(0, Math.PI * 2),
      speed: CFG.pedSpeed * this.rng.range(0.8, 1.3),
      health: 100,
      fleeing: 0,
      walkPhase: this.rng.range(0, 6),
      target: this.randomSidewalkSpot(),
    };
    this.list.push(ped);
    return ped;
  }
  // A ped hit by a car or a bullet: ragdoll-free fall + wanted heat for the player.
  knockDown(ped, game) {
    ped.health = 0;
    ped.mesh.rotation.x = -Math.PI / 2;
    ped.mesh.position.y = 0.3;
    game.addWanted(1, 'pedestrian down');
    game.hud.flash('Pedestrian down — the police noticed!');
  }
  update(dt, game) {
    const px = game.player.x;
    const pz = game.player.z;
    const danger = game.combat.shotsFiredAt > 0 || game.player.inCar;
    for (const ped of this.list) {
      if (ped.health <= 0) continue;
      const dPlayer = Math.hypot(ped.x - px, ped.z - pz);
      // Flee from gunfire or a speeding car nearby.
      if (game.combat.lastShotAt > game.time - 1.2 && dPlayer < 18) ped.fleeing = 2.5;
      if (game.player.inCar && game.player.car && Math.abs(game.player.car.speed) > 6 && dPlayer < 8) ped.fleeing = 2;
      if (ped.fleeing > 0) {
        ped.fleeing -= dt;
        const away = Math.atan2(ped.x - px, ped.z - pz);
        ped.heading = away;
        ped.x += Math.sin(away) * CFG.pedSpeed * 2.6 * dt;
        ped.z += Math.cos(away) * CFG.pedSpeed * 2.6 * dt;
      } else {
        const dx = ped.target.x - ped.x;
        const dz = ped.target.z - ped.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.2) {
          ped.target = this.randomSidewalkSpot();
        } else {
          ped.heading = Math.atan2(dx, dz);
          ped.x += Math.sin(ped.heading) * ped.speed * dt;
          ped.z += Math.cos(ped.heading) * ped.speed * dt;
        }
      }
      // Hit by the player's car?
      if (game.player.inCar && game.player.car && Math.abs(game.player.car.speed) > 4) {
        const car = game.player.car;
        if (Math.hypot(ped.x - car.x, ped.z - car.z) < 1.9) this.knockDown(ped, game);
      }
      ped.walkPhase += dt * (ped.fleeing > 0 ? 11 : 6);
      const swing = Math.sin(ped.walkPhase) * 0.5;
      ped.armL.rotation.x = swing;
      ped.armR.rotation.x = -swing;
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.mesh.rotation.y = ped.heading;
    }
    // Slowly replace fallen peds so the streets stay alive.
    if (this.list.filter((p) => p.health > 0).length < CFG.pedCount - 2 && this.rng.chance(0.02)) {
      const dead = this.list.find((p) => p.health <= 0);
      if (dead) {
        this.scene.remove(dead.mesh);
        this.list.splice(this.list.indexOf(dead), 1);
        this.spawn();
      }
    }
  }
}
