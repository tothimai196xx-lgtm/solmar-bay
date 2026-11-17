// Solmar Bay — combat: pistol raycast shots, punches, health and ammo pickups,
// muzzle sparks and the screen shake that sells every hit.
import * as THREE from '../vendor/three.module.min.js';
import { CFG } from './config.js';
import { Rng } from './random.js';

export class Combat {
  constructor(scene, seed) {
    this.scene = scene;
    this.rng = new Rng(seed + 91);
    this.cooldown = 0;
    this.shake = 0;
    this.shotsFiredAt = 0;
    this.lastShotAt = -999;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = CFG.pistolRange;
    this.pickups = [];
    this.effects = [];
    this.spawnPickups();
  }
  spawnPickups() {
    const spots = [
      { x: 20, z: 70, kind: 'health' }, { x: -40, z: 20, kind: 'ammo' },
      { x: 60, z: -40, kind: 'health' }, { x: -70, z: -40, kind: 'ammo' },
      { x: 10, z: -70, kind: 'health' },
    ];
    for (const s of spots) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 0.9),
        new THREE.MeshLambertMaterial({
          color: s.kind === 'health' ? 0x53d769 : 0xffd23e,
          emissive: s.kind === 'health' ? 0x1d5a2a : 0x664400,
        })
      );
      mesh.position.set(s.x, 0.9, s.z);
      this.scene.add(mesh);
      this.pickups.push({ ...s, mesh, taken: false, respawnAt: 0 });
    }
  }
  spark(point) {
    const burst = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8 })
    );
    burst.position.copy(point);
    this.scene.add(burst);
    this.effects.push({ mesh: burst, life: 0.18 });
  }
  shoot(game) {
    if (this.cooldown > 0 || game.player.health <= 0) return;
    if (game.ammo <= 0) {
      game.hud.flash('Out of ammo — find a yellow crate.');
      game.audio.dryFire();
      this.cooldown = 0.3;
      return;
    }
    this.cooldown = CFG.pistolRate;
    game.ammo -= 1;
    this.lastShotAt = game.time;
    this.shotsFiredAt += 1;
    game.audio.gunshot();
    this.shake = Math.max(this.shake, 0.35);
    // Raycast from the camera through the screen centre.
    const cam = game.camera;
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), cam);
    const targets = [];
    for (const ped of game.people.list) {
      if (ped.health > 0) targets.push(ped.mesh);
    }
    for (const car of game.traffic.cars) targets.push(car.mesh);
    for (const car of game.police.copCars) targets.push(car.mesh);
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length > 0) {
      const hit = hits[0];
      this.spark(hit.point);
      let obj = hit.object;
      while (obj && !obj.userData.owner) obj = obj.parent;
      // Walk up to the group that owns the mesh.
      let owner = hit.object;
      while (owner.parent && owner.parent !== this.scene) owner = owner.parent;
      const ped = game.people.list.find((p) => p.mesh === owner);
      if (ped) {
        ped.health -= CFG.pistolDamage;
        if (ped.health <= 0) game.people.knockDown(ped, game);
        else ped.fleeing = 3;
        return;
      }
      const car = [...game.traffic.cars, ...game.police.copCars].find((c) => c.mesh === owner);
      if (car) {
        car.health -= CFG.pistolDamage;
        if (car.isPolice) game.addWanted(1, 'shot at police');
        if (car.health <= 0) {
          car.speed = 0;
          game.hud.flash('Car disabled!');
        }
      }
    }
  }
  punch(game) {
    if (this.cooldown > 0) return;
    this.cooldown = 0.45;
    game.audio.punch();
    for (const ped of game.people.list) {
      if (ped.health <= 0) continue;
      const d = Math.hypot(ped.x - game.player.x, ped.z - game.player.z);
      if (d < 2.2) {
        ped.health -= CFG.punchDamage;
        ped.fleeing = 3;
        if (ped.health <= 0) game.people.knockDown(ped, game);
        game.hud.flash('You threw a punch — the street noticed.');
        game.addWanted(1, 'assault');
        return;
      }
    }
  }
  damagePlayer(amount, game) {
    game.player.health = Math.max(0, game.player.health - amount);
    this.shake = Math.max(this.shake, 0.6);
    if (game.player.health <= 0) game.wasted('Rio was taken down on the streets of Solmar Bay.');
  }
  update(dt, game) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const e of [...this.effects]) {
      e.life -= dt;
      e.mesh.scale.multiplyScalar(1 + dt * 6);
      if (e.life <= 0) {
        this.scene.remove(e.mesh);
        this.effects.splice(this.effects.indexOf(e), 1);
      }
    }
    // Pickups: spin, bob, and respawn after a while.
    for (const p of this.pickups) {
      if (p.taken) {
        if (game.time > p.respawnAt) {
          p.taken = false;
          p.mesh.visible = true;
        }
        continue;
      }
      p.mesh.rotation.y += dt * 1.5;
      p.mesh.position.y = 0.9 + Math.sin(game.time * 2 + p.x) * 0.15;
      const d = Math.hypot(game.player.x - p.x, game.player.z - p.z);
      if (d < 2.2 && !game.player.inCar) {
        p.taken = true;
        p.mesh.visible = false;
        p.respawnAt = game.time + 45;
        if (p.kind === 'health') {
          game.player.health = Math.min(CFG.playerHealthMax, game.player.health + 40);
          game.hud.flash('Health +40.');
        } else {
          game.ammo = Math.min(CFG.ammoMax, game.ammo + 24);
          game.hud.flash('Ammo +24.');
        }
        game.audio.pickup();
      }
    }
  }
}
