// Solmar Bay — the wanted system: 0–5 stars, Bay Police cruisers that chase
// and ram, foot officers at high heat, busted / wasted, and cooling off.
import { CFG } from './config.js';
import { Car } from './vehicles.js';

export class Police {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.wanted = 0;
    this.heat = 0; // 0..1 within the current star level
    this.lastCrimeAt = -999;
    this.copCars = [];
    this.footCops = [];
    this.bustedTimer = 0;
    this.spawnTimer = 0;
  }
  addWanted(stars, reason) {
    this.wanted = Math.min(CFG.wantedMax, this.wanted + stars);
    this.lastCrimeAt = this.game.time;
    this.spawnTimer = 0;
  }
  wantedStars() {
    return this.wanted;
  }
  nearestCopCar(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const c of this.copCars) {
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }
  spawnCopCar(game) {
    const px = game.player.x;
    const pz = game.player.z;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.max(-95, Math.min(95, px + Math.sin(angle) * 42));
    const z = Math.max(-95, Math.min(95, pz + Math.cos(angle) * 42));
    const car = new Car(this.scene, x, z, Math.atan2(px - x, pz - z), 0x1a1a1c, true);
    car.driver = 'cop';
    this.copCars.push(car);
    return car;
  }
  removeCopCar(car) {
    car.dispose(this.scene);
    this.copCars.splice(this.copCars.indexOf(car), 1);
  }
  update(dt, game) {
    this.game = game;
    // Wanted decays once the player has stayed out of sight for a while.
    const seen = this.copCars.some((c) => Math.hypot(c.x - game.player.x, c.z - game.player.z) < 30);
    if (this.wanted > 0 && game.time - this.lastCrimeAt > CFG.wantedDecayDelay && !seen) {
      this.heat += CFG.wantedDecayRate * dt;
      if (this.heat >= 1) {
        this.heat = 0;
        this.wanted -= 1;
        game.hud.flash(this.wanted === 0 ? 'You lost the cops. Heat is off.' : `Wanted level down to ${this.wanted} star${this.wanted > 1 ? 's' : ''}.`);
      }
    }
    // Keep enough cruisers on the street for the current wanted level.
    const wantCars = this.wanted === 0 ? 0 : Math.min(4, this.wanted);
    this.spawnTimer -= dt;
    if (this.copCars.length < wantCars && this.spawnTimer <= 0) {
      this.spawnCopCar(game);
      this.spawnTimer = 2.5;
      if (this.wanted >= 2) game.audio.siren(true);
    }
    if (this.wanted === 0) game.audio.siren(false);
    // Chase: steer toward the player, ram on contact, flash the light bar.
    for (const car of [...this.copCars]) {
      const dx = game.player.x - car.x;
      const dz = game.player.z - car.z;
      const dist = Math.hypot(dx, dz) || 1;
      const targetHeading = Math.atan2(dx, dz);
      let diff = targetHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 1.4));
      const playerSpeed = game.player.inCar && game.player.car ? Math.abs(game.player.car.speed) : 0;
      const top = Math.min(CFG.copCarTopSpeed, 20 + playerSpeed * 1.05 + this.wanted * 2);
      car.speed += (top - car.speed) * Math.min(1, 1.2 * dt);
      car.heading += steer * 1.6 * dt * Math.min(1, Math.abs(car.speed) / 10 + 0.3);
      const nx = car.x + Math.sin(car.heading) * car.speed * dt;
      const nz = car.z + Math.cos(car.heading) * car.speed * dt;
      const solved = this.city.collideCircle(nx, nz, 1.4);
      car.x = solved.x;
      car.z = solved.z;
      if (solved.hit) car.speed *= 0.6;
      car.syncMesh();
      car.flashBeacons(game.time);
      // Ram the player's car: damage it and slow the player down.
      if (game.player.inCar && game.player.car && dist < 3.2) {
        game.player.car.speed *= 0.82;
        game.player.car.health -= 14 * dt;
        game.combat.shake = Math.max(game.combat.shake, 0.5);
        if (game.player.car.health <= 0) {
          game.wasted('Your car was wrecked by the Bay Police.');
        }
      }
      // Busted: a cruiser sits on the player while on foot, or pins the car.
      const pinned = game.player.inCar
        ? game.player.car && Math.abs(game.player.car.speed) < 1.5 && dist < 3.4
        : dist < 2.2;
      if (pinned && this.wanted > 0) {
        this.bustedTimer += dt;
        if (this.bustedTimer > CFG.bustedHoldSeconds) {
          game.busted();
          this.bustedTimer = 0;
          return;
        }
      } else {
        this.bustedTimer = Math.max(0, this.bustedTimer - dt * 2);
      }
      // Despawn cruisers that fell far behind when the heat is off.
      if (this.wanted === 0 && dist > 80) this.removeCopCar(car);
    }
    // Too many cruisers is a cap, not a pile-up.
    while (this.copCars.length > 4) this.removeCopCar(this.copCars[0]);
  }
  // On arrest / death: clear the heat and respawn the player at the safehouse.
  resetAfterArrest() {
    for (const car of [...this.copCars]) this.removeCopCar(car);
    this.wanted = 0;
    this.heat = 0;
    this.bustedTimer = 0;
  }
}
