// Solmar Bay — the four screenshot scenes. Each one runs the real game from a
// fixed seed with an autopilot driving it, so the shot is a true render.
import { CFG } from './config.js';

// Greedy road follower: drive along the current street toward the target,
// turning at intersections when the cross street gets closer to the goal.
export function roadFollowHeading(game, tx, tz) {
  const car = game.player.car;
  const road = game.city.nearestRoadPoint(car.x, car.z);
  const dx = tx - car.x;
  const dz = tz - car.z;
  let want;
  if (road.along === 'z') {
    // On a vertical street: keep going along z unless the target is far
    // sideways and we are near a cross street.
    const nearCross = game.city.streets.some((s) => Math.abs(car.z - s) < 3);
    if (nearCross && Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dz)) {
      want = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      want = dz >= 0 ? 0 : Math.PI;
    }
  } else {
    const nearCross = game.city.streets.some((s) => Math.abs(car.x - s) < 3);
    if (nearCross && Math.abs(dz) > 18 && Math.abs(dz) > Math.abs(dx)) {
      want = dz > 0 ? 0 : Math.PI;
    } else {
      want = dx >= 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }
  return want;
}

function putPlayerInCar(game, x, z, heading) {
  const car = game.traffic.spawnCar();
  car.x = x;
  car.z = z;
  car.heading = heading;
  car.driver = 'player';
  car.speed = 12;
  game.player.inCar = true;
  game.player.car = car;
  game.player.x = x;
  game.player.z = z;
  game.player.heading = heading;
  game.player.mesh.visible = false;
  game.player.camHeading = heading;
  game.player.cameraPos.set(x - Math.sin(heading) * 9, 4.5, z - Math.cos(heading) * 9);
  return car;
}

// Configure one scene. Returns the autopilot policy used every fixed step.
export function setupShot(game, params) {
  const shot = params.get('shot') || 'start';
  game.shot = shot;
  game.state = 'playing';
  game.hud.hideMenu();
  game.hud.showTitleCard();
  const P = game.player;

  if (shot === 'start') {
    // Rio on foot on the palm promenade, towers and sea behind the camera's view.
    P.x = 4; P.z = 78; P.heading = Math.PI; P.camHeading = Math.PI;
    P.cameraPos.set(4, 4.2, 90);
    game.hud.flash('Welcome to Solmar Bay — press Enter for your first job.');
    return { mode: 'walk', tx: 4, tz: 40 };
  }

  if (shot === 'drive') {
    // Rio driving down Coral Avenue with traffic around him.
    putPlayerInCar(game, 0, 60, Math.PI);
    game.traffic.cars[0].x = 1.8; game.traffic.cars[0].z = 30; game.traffic.cars[0].heading = 0;
    game.traffic.cars[1].x = -1.8; game.traffic.cars[1].z = -10; game.traffic.cars[1].heading = Math.PI;
    game.hud.hideTitleCard();
    return { mode: 'drive', tx: 0, tz: -90 };
  }

  if (shot === 'wanted') {
    // Three stars, two cruisers on Rio's tail, sirens wailing.
    putPlayerInCar(game, 30, 60, Math.PI);
    game.police.wanted = 3;
    game.police.lastCrimeAt = game.time;
    game.police.spawnCopCar(game);
    game.police.spawnCopCar(game);
    // Cruisers ahead of Rio on the same avenue, slower than him: he catches
    // them, they swing around to chase, and the camera sees the whole thing.
    game.police.copCars[0].x = 28.5; game.police.copCars[0].z = 25;
    game.police.copCars[0].heading = Math.PI; game.police.copCars[0].speed = 12;
    game.police.copCars[1].x = 32; game.police.copCars[1].z = 5;
    game.police.copCars[1].heading = Math.PI; game.police.copCars[1].speed = 12;
    game.audio.siren(true);
    game.hud.hideTitleCard();
    game.hud.flash('WANTED ★★★ — the Bay Police are on you!');
    return { mode: 'drive', tx: 30, tz: -90 };
  }

  // mission: mid-way through mission 1, beacon burning at the marina lockup.
  // Rio starts on the promenade avenue heading straight for the beacon.
  putPlayerInCar(game, 0, 88, Math.PI / 2);
  game.missions.start(0, game);
  game.missions.current.target = { ...CFG.marina };
  game.hud.hideTitleCard();
  return { mode: 'drive', tx: CFG.marina.x, tz: CFG.marina.z };
}

// One autopilot step: fill the synthetic input for this fixed step.
export function autopilotInput(game, policy, input) {
  if (!policy) return;
  if (policy.mode === 'walk') {
    input.keys['KeyW'] = true;
    return;
  }
  if (policy.mode === 'drive' && game.player.inCar && game.player.car) {
    const car = game.player.car;
    const want = roadFollowHeading(game, policy.tx, policy.tz);
    let diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    input.keys['KeyW'] = true;
    if (diff > 0.12) input.keys['KeyD'] = true;
    else if (diff < -0.12) input.keys['KeyA'] = true;
    if (Math.abs(diff) > 1.2) input.keys['KeyS'] = true;
  }
}
