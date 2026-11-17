// Solmar Bay — Rio Calder on foot: third-person movement, jumping, stealing
// cars, and the smooth chase camera that follows him everywhere.
import * as THREE from '../vendor/three.module.min.js';
import { CFG, CAMERA_MODES } from './config.js';

function makeHeroMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x2e6f8e });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2b2b2e });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.85, 0.26), pants);
  legs.position.y = 0.42;
  g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.34), jacket);
  torso.position.y = 1.2;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), skin);
  head.position.y = 1.78;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 10), new THREE.MeshLambertMaterial({ color: 0xf2c14e }));
  cap.position.y = 1.96;
  g.add(cap);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.62, 0.15), jacket);
  armL.position.set(-0.4, 1.18, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.4;
  g.add(armR);
  return { group: g, armL, armR, legs };
}

export class Player {
  constructor(scene) {
    const built = makeHeroMesh();
    this.mesh = built.group;
    this.armL = built.armL;
    this.armR = built.armR;
    this.legs = built.legs;
    this.x = CFG.spawn.x;
    this.z = CFG.spawn.z;
    this.y = 0;
    this.vy = 0;
    this.heading = CFG.spawn.heading;
    this.camHeading = CFG.spawn.heading;
    this.speed = 0;
    this.inCar = false;
    this.car = null;
    this.health = CFG.playerHealthMax;
    this.walkPhase = 0;
    this.cameraMode = 0;
    this.cameraPos = new THREE.Vector3(this.x, 4, this.z + 9);
    scene.add(this.mesh);
    this.syncMesh();
  }
  syncMesh() {
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.heading;
  }
  // Enter the nearest NPC car (stealing it) or exit the current car.
  tryEnterExitCar(game) {
    if (this.inCar) {
      const car = this.car;
      car.driver = null;
      car.speed *= 0.4;
      this.inCar = false;
      this.car = null;
      this.x = car.x - Math.sin(car.heading + Math.PI / 2) * 2.2;
      this.z = car.z - Math.cos(car.heading + Math.PI / 2) * 2.2;
      this.heading = car.heading;
      this.syncMesh();
      game.hud.flash('You left the car.');
      return;
    }
    const car = game.traffic.nearest(this.x, this.z, 4.2) || game.police.nearestCopCar(this.x, this.z, 4.2);
    if (!car) {
      game.hud.flash('No car close enough — walk up to one and press E.');
      return;
    }
    const wasNpc = car.driver === 'npc';
    car.driver = 'player';
    this.inCar = true;
    this.car = car;
    this.mesh.visible = false;
    if (wasNpc && !car.stolen) {
      car.stolen = true;
      game.addWanted(1, 'car stolen');
      game.hud.flash('Car stolen! Wanted level up.');
      game.audio.sirenBlip();
    } else if (car.isPolice) {
      game.addWanted(2, 'police car stolen');
      game.hud.flash('You stole a police cruiser!');
    }
    game.audio.engineStart();
  }
  update(dt, input, game) {
    if (this.inCar && this.car) {
      const throttle = (input.keys['KeyW'] || input.keys['ArrowUp'] ? 1 : 0) + (input.keys['KeyS'] || input.keys['ArrowDown'] ? -1 : 0);
      const steer = (input.keys['KeyA'] || input.keys['ArrowLeft'] ? -1 : 0) + (input.keys['KeyD'] || input.keys['ArrowRight'] ? 1 : 0);
      const handbrake = !!input.keys['Space'];
      this.car.drive(dt, { throttle, steer, handbrake }, game.city);
      this.x = this.car.x;
      this.z = this.car.z;
      this.heading = this.car.heading;
      this.speed = Math.abs(this.car.speed);
      game.audio.engine(this.car.speed);
      return;
    }
    // On foot: WASD moves relative to the camera heading.
    const run = input.keys['ShiftLeft'] || input.keys['ShiftRight'];
    const speed = run ? CFG.runSpeed : CFG.walkSpeed;
    let mx = 0;
    let mz = 0;
    if (input.keys['KeyW'] || input.keys['ArrowUp']) mz += 1;
    if (input.keys['KeyS'] || input.keys['ArrowDown']) mz -= 1;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) mx -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) mx += 1;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len;
      mz /= len;
      const sin = Math.sin(this.camHeading);
      const cos = Math.cos(this.camHeading);
      const wx = mx * cos + mz * sin;
      const wz = -mx * sin + mz * cos;
      this.heading = Math.atan2(wx, wz);
      const nx = this.x + wx * speed * dt;
      const nz = this.z + wz * speed * dt;
      const solved = game.city.collideCircle(nx, nz, CFG.playerRadius);
      this.x = Math.max(-CFG.worldHalf - 6, Math.min(CFG.worldHalf + 6, solved.x));
      this.z = Math.max(-CFG.worldHalf - 6, Math.min(CFG.worldHalf + 6, solved.z));
      this.speed = speed;
      this.walkPhase += dt * speed * 1.6;
    } else {
      this.speed = 0;
    }
    // Jump with Space.
    if (input.keys['Space'] && this.y === 0) this.vy = 6.5;
    if (this.y > 0 || this.vy !== 0) {
      this.vy -= 18 * dt;
      this.y = Math.max(0, this.y + this.vy * dt);
      if (this.y === 0) this.vy = 0;
    }
    const swing = Math.sin(this.walkPhase) * (this.speed > 0 ? 0.55 : 0);
    this.armL.rotation.x = swing;
    this.armR.rotation.x = -swing;
    this.legs.rotation.x = swing * 0.6;
    this.syncMesh();
  }
  // Smooth chase camera: eases behind the player or the car.
  updateCamera(dt, camera, game) {
    const mode = CAMERA_MODES[this.cameraMode];
    const focusX = this.x;
    const focusZ = this.z;
    const focusY = this.inCar ? 1.2 : 1.6;
    // Camera heading eases toward the player's heading while driving.
    const targetHeading = this.inCar ? this.heading : this.camHeading;
    let diff = targetHeading - this.camHeading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.camHeading += diff * Math.min(1, (this.inCar ? 3.2 : 1.2) * dt);
    const cx = focusX - Math.sin(this.camHeading) * mode.dist;
    const cz = focusZ - Math.cos(this.camHeading) * mode.dist;
    const cy = focusY + mode.height;
    const k = 1 - Math.pow(0.0001, dt);
    this.cameraPos.x += (cx - this.cameraPos.x) * k;
    this.cameraPos.y += (cy - this.cameraPos.y) * k;
    this.cameraPos.z += (cz - this.cameraPos.z) * k;
    camera.position.copy(this.cameraPos);
    camera.lookAt(focusX + Math.sin(this.camHeading) * mode.look, focusY, focusZ + Math.cos(this.camHeading) * mode.look);
    if (game.combat.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * game.combat.shake * 0.35;
      camera.position.y += (Math.random() - 0.5) * game.combat.shake * 0.35;
      game.combat.shake = Math.max(0, game.combat.shake - dt * 2.2);
    }
  }
}
