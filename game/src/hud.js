// Solmar Bay — the HUD: money, health, wanted stars, ammo, mission panel,
// a live 2D minimap, and the start / pause / busted / wasted / win screens.
import { CFG, CONTROLS_TEXT } from './config.js';

export class Hud {
  constructor() {
    this.el = {};
    for (const id of ['money', 'health', 'healthbar', 'ammo', 'stars', 'speed', 'clock', 'mission-title', 'mission-objective', 'mission-timer', 'flash', 'dialogue', 'dialogue-title', 'dialogue-text', 'menu', 'menu-title', 'menu-text', 'menu-sub', 'hint', 'title-card']) {
      this.el[id] = document.getElementById(id);
    }
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.flashTimer = 0;
    this.dialogueTimer = 0;
    this.el.hint.textContent = CONTROLS_TEXT;
  }
  flash(text) {
    this.el.flash.textContent = text;
    this.el.flash.style.opacity = '1';
    this.flashTimer = 3;
  }
  showDialogue(text, title = 'Mara Voss') {
    this.el['dialogue-title'].textContent = title;
    this.el['dialogue-text'].textContent = text;
    this.el.dialogue.style.display = 'block';
    this.dialogueTimer = 7;
  }
  hideDialogue() {
    this.el.dialogue.style.display = 'none';
  }
  showMenu(title, text, sub = '') {
    this.el['menu-title'].textContent = title;
    this.el['menu-text'].textContent = text;
    this.el['menu-sub'].textContent = sub;
    this.el.menu.style.display = 'flex';
  }
  hideMenu() {
    this.el.menu.style.display = 'none';
  }
  showTitleCard() {
    this.el['title-card'].style.display = 'block';
    this.el['title-card'].innerHTML = `<b>SOLMAR BAY</b><span>An open-world crime story · Rio Calder · fixer Mara Voss</span>`;
  }
  hideTitleCard() {
    this.el['title-card'].style.display = 'none';
  }
  update(dt, game) {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.el.flash.style.opacity = '0';
    }
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.hideDialogue();
    }
    this.el.money.textContent = `$${game.money.toLocaleString('en-US')}`;
    this.el.health.textContent = `HP ${Math.max(0, Math.round(game.player.health))}`;
    this.el.healthbar.style.width = `${Math.max(0, game.player.health)}%`;
    this.el.healthbar.style.background = game.player.health > 50 ? '#53d769' : game.player.health > 25 ? '#f2c14e' : '#e84040';
    this.el.ammo.textContent = `Ammo ${game.ammo}`;
    const stars = '★'.repeat(game.police.wanted) + '☆'.repeat(5 - game.police.wanted);
    this.el.stars.textContent = stars;
    this.el.stars.style.color = game.police.wanted > 0 ? '#ffd23e' : '#ffffff88';
    const kmh = game.player.inCar && game.player.car ? Math.round(Math.abs(game.player.car.speed) * 3.6) : 0;
    this.el.speed.textContent = game.player.inCar ? `${kmh} km/h` : '';
    const mins = Math.floor(game.time / 60) % 24;
    const secs = Math.floor(game.time) % 60;
    this.el.clock.textContent = `${String(8 + mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const def = game.missions.currentDef();
    if (def) {
      this.el['mission-title'].textContent = `Mission ${def.id}: ${def.title}`;
      let obj = def.objective;
      if (def.kind === 'collect') obj += ` — ${game.missions.collected}/5`;
      if (def.kind === 'evade') obj += ` — ${Math.max(0, Math.ceil(60 - game.missions.evadeTimer))}s left`;
      this.el['mission-objective'].textContent = obj;
      this.el['mission-timer'].textContent = def.timeLimit ? `⏱ ${Math.max(0, Math.ceil(game.missions.missionTimer))}s` : '';
    } else {
      const next = game.missions.nextIndex();
      this.el['mission-title'].textContent = next >= 0 ? 'Free roam — press Enter for the next job' : 'All missions complete — free roam!';
      this.el['mission-objective'].textContent = next >= 0 ? CFG.missions[next].title : 'Solmar Bay is yours, Rio.';
      this.el['mission-timer'].textContent = '';
    }
    this.drawMinimap(game);
  }
  drawMinimap(game) {
    const ctx = this.mapCtx;
    const S = 180;
    const half = CFG.worldHalf + 12;
    const toMap = (x, z) => [((x + half) / (half * 2)) * S, ((z + half) / (half * 2)) * S];
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(10, 26, 40, 0.82)';
    ctx.fillRect(0, 0, S, S);
    // Sea and sand at the south edge.
    ctx.fillStyle = '#1e7fa8';
    ctx.fillRect(0, S - 14, S, 14);
    ctx.fillStyle = '#e8cf9e';
    ctx.fillRect(0, S - 20, S, 6);
    // Streets.
    ctx.strokeStyle = '#8a9298';
    ctx.lineWidth = 2;
    for (const s of game.city.streets) {
      const [x1] = toMap(s, 0);
      ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, S); ctx.stroke();
      const [, z1] = toMap(0, s);
      ctx.beginPath(); ctx.moveTo(0, z1); ctx.lineTo(S, z1); ctx.stroke();
    }
    // Mission target blip.
    const def = game.missions.currentDef();
    if (def && game.missions.current) {
      const t = game.missions.current.target;
      const [bx, by] = toMap(t.x, t.z);
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.stroke();
    }
    // Police blips.
    ctx.fillStyle = '#4a90ff';
    for (const car of game.police.copCars) {
      const [cx, cy] = toMap(car.x, car.z);
      ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Traffic dots.
    ctx.fillStyle = '#ffffffaa';
    for (const car of game.traffic.cars) {
      if (car.driver !== 'npc') continue;
      const [cx, cy] = toMap(car.x, car.z);
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
    }
    // Player arrow.
    const [px, py] = toMap(game.player.x, game.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(Math.sin(game.player.heading), Math.cos(game.player.heading)) + Math.PI);
    ctx.fillStyle = '#53d769';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#ffffff55';
    ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
  }
}
