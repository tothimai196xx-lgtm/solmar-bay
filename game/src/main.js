// Solmar Bay — boot, fixed-step 60 Hz loop, screen state machine, save/load.
// Rio Calder's open-world crime story in a sun-soaked coastal city.
import * as THREE from '../vendor/three.module.min.js';
import { CFG } from  './config.js';
import { buildCity } from  './city.js';
import { Traffic } from  './vehicles.js';
import { Pedestrians } from  './people.js';
import { Player } from  './player.js';
import { Police } from  './police.js';
import { Missions } from  './missions.js';
import { Combat } from  './combat.js';
import { AudioSys } from  './audio.js';
import { Hud } from  './hud.js';
import { setupShot, autopilotInput } from  './shots.js';

const params = new URLSearchParams(location.search);
const seed = parseInt(params.get('seed') || '20261118', 10) || 20261118;
const isShot = params.has('shot');

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const city = buildCity(scene, seed);
const hud = new Hud();
const audio = new AudioSys();
const player = new Player(scene);
const traffic = new Traffic(scene, city, seed);
const people = new Pedestrians(scene, city, seed);
const police = new Police(scene, city);
const missions = new Missions(scene, city, seed);
const combat = new Combat(scene, seed);

const game = {
  scene, camera, renderer, city, hud, audio, player, traffic, people, police, missions, combat,
  seed, time: 0, state: 'menu', money: CFG.moneyStart, ammo: CFG.ammoStart,
  shot: null, shotPolicy: null, input: { keys: {} },
  addWanted(stars, reason) { police.addWanted(stars, reason); },
  save() { saveGame(); },
  busted() { arrestGame('BUSTED', 'The Bay Police caught up with Rio. $200 bail, back to the safehouse.'); },
  wasted() { arrestGame('WASTED', 'Rio went down on the streets of Solmar Bay. The hospital patched him up — for $200.'); },
  win() {
    game.state = 'win';
    hud.showMenu('SOLMAR BAY IS YOURS', 'All five jobs for Mara Voss are done. Rio Calder owns the bay — keep roaming, the city never sleeps.', 'Press Enter to keep playing.');
  },
};

police.game = game;

// Debug handle for automated playtests (harmless in normal play).
window.__solmar = game;

function arrestGame(title, text) {
  police.resetAfterArrest();
  game.money = Math.max(0, game.money - 200);
  player.health = CFG.playerHealthMax;
  if (player.inCar && player.car) {
    player.car.driver = null;
    player.inCar = false;
    player.car = null;
    player.mesh.visible = true;
  }
  player.x = CFG.safehouse.x;
  player.z = CFG.safehouse.z;
  player.y = 0;
  player.heading = 0;
  player.camHeading = 0;
  player.syncMesh();
  missions.clearBeacon();
  missions.current = null;
  game.state = title === 'BUSTED' ? 'busted' : 'wasted';
  hud.showMenu(title, text, 'Press Enter to get back out there.');
  saveGame();
}

function saveGame() {
  try {
    localStorage.setItem(CFG.saveKey, JSON.stringify({
      money: game.money,
      ammo: game.ammo,
      health: player.health,
      completed: [...missions.completed],
      x: player.x, z: player.z,
      seed,
    }));
  } catch (e) { /* private mode: play on without saving */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(CFG.saveKey);
    if (!raw) return false;
    const s = JSON.parse(raw);
    game.money = s.money ?? CFG.moneyStart;
    game.ammo = s.ammo ?? CFG.ammoStart;
    player.health = s.health ?? CFG.playerHealthMax;
    missions.setCompleted(s.completed || []);
    if (typeof s.x === 'number') { player.x = s.x; player.z = s.z; player.syncMesh(); }
    return true;
  } catch (e) { return false; }
}

// Input: keyboard + mouse. F fires, click fires too, Enter advances menus.
const keys = {};
window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  audio.ensure();
  if (e.code === 'KeyM') audio.setMuted(!audio.muted);
  if (e.code === 'KeyR') player.cameraMode = (player.cameraMode + 1) % 3;
  if (e.code === 'KeyP') togglePause();
  if (e.code === 'KeyE' && game.state === 'playing') player.tryEnterExitCar(game);
  if (e.code === 'KeyF' && game.state === 'playing') combat.shoot(game);
  if (e.code === 'Enter') onEnter();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('mousedown', () => {
  audio.ensure();
  if (game.state === 'playing') combat.shoot(game);
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function onEnter() {
  if (game.state === 'menu') {
    game.state = 'playing';
    hud.hideMenu();
    hud.hideTitleCard();
    audio.ensure();
    return;
  }
  if (game.state === 'paused') { togglePause(); return; }
  if (game.state === 'busted' || game.state === 'wasted' || game.state === 'win') {
    game.state = 'playing';
    hud.hideMenu();
    saveGame();
    return;
  }
  if (game.state === 'playing' && !missions.current) {
    const next = missions.nextIndex();
    if (next >= 0) missions.start(next, game);
  }
}

function togglePause() {
  if (game.state === 'playing') {
    game.state = 'paused';
    hud.showMenu('PAUSED', 'Solmar Bay waits for no one — except right now.', 'P or Enter to resume · M mute · R camera');
  } else if (game.state === 'paused') {
    game.state = 'playing';
    hud.hideMenu();
  }
}

function step(dt) {
  game.time += dt;
  const input = { keys: { ...keys } };
  if (game.shotPolicy) autopilotInput(game, game.shotPolicy, input);
  if (game.state !== 'playing') {
    // Keep the world breathing behind menus, but freeze the action.
    player.updateCamera(dt, camera, game);
    renderer.render(scene, camera);
    return;
  }
  player.update(dt, input, game);
  traffic.update(dt, player.inCar ? player.car : null);
  people.update(dt, game);
  police.update(dt, game);
  missions.update(dt, game);
  combat.update(dt, game);
  audio.update(dt);
  player.updateCamera(dt, camera, game);
  hud.update(dt, game);
  renderer.render(scene, camera);
}

// Boot.
const hadSave = !isShot && loadGame();
if (isShot) {
  game.shotPolicy = setupShot(game, params);
} else {
  hud.showTitleCard();
  hud.showMenu(
    'SOLMAR BAY',
    hadSave
      ? `Welcome back, Rio. Mara Voss has work — press Enter to pick up where you left off. $${game.money.toLocaleString('en-US')} in your pocket, ${missions.completed.size}/5 jobs done.`
      : 'A sun-soaked coastal city, a fast car, and a fixer named Mara Voss with five jobs for Rio Calder. Steal, drive, run — and stay out of the Bay Police\'s way.',
    'Enter start · WASD move/drive · E steal car · F shoot · P pause'
  );
}

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  let elapsed = (now - last) / 1000;
  last = now;
  if (elapsed > 0.25) elapsed = 0.25;
  acc += elapsed;
  while (acc >= STEP) {
    step(STEP);
    acc -= STEP;
  }
}
requestAnimationFrame(frame);
