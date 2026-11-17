// Solmar Bay — every tuning number, colour and story name for the game.
// One place to balance the whole open world: movement, cars, police, missions.
export const CFG = {
  cityName: 'Solmar Bay',
  heroName: 'Rio Calder',
  fixerName: 'Mara Voss',
  saveKey: 'solmar-bay-save-v1',

  // World layout (metres). Streets form a grid; the beach and sea sit south.
  worldHalf: 110,
  streetSpacing: 30,
  streetWidth: 9,
  beachZ: 96,
  seaZ: 118,

  // On-foot movement.
  walkSpeed: 6.5,
  runSpeed: 11,
  playerRadius: 0.55,
  playerHealthMax: 100,

  // Driving (arcade).
  carAccel: 26,
  carBrake: 42,
  carReverseMax: 12,
  carTopSpeed: 42,
  carSteer: 1.9,
  carGrip: 3.2,
  handbrakeGrip: 0.6,

  // Traffic and pedestrians.
  trafficCount: 11,
  trafficSpeed: 9,
  pedCount: 16,
  pedSpeed: 1.6,

  // Wanted system (0-5 stars).
  wantedMax: 5,
  wantedDecayDelay: 9,
  wantedDecayRate: 0.35,
  copCarTopSpeed: 46,
  bustedHoldSeconds: 2.2,

  // Combat.
  pistolDamage: 34,
  pistolRange: 55,
  pistolRate: 0.28,
  ammoStart: 24,
  ammoMax: 120,
  punchDamage: 12,

  // Economy and rewards.
  moneyStart: 250,
  missionReward: [600, 900, 1200, 1500, 3000],
  pickupCash: 40,

  // Palette — a sun-soaked coastal city at golden hour.
  palette: {
    skyTop: 0x2e6fb0,
    skyBottom: 0xffd9a0,
    sun: 0xffe3b0,
    sea: 0x1e7fa8,
    sand: 0xe8cf9e,
    grass: 0x7fae62,
    road: 0x3a3f46,
    sidewalk: 0x9aa0a3,
    buildingPastel: [0xf2b8c6, 0xf7d774, 0x9fd8c9, 0xf5a65b, 0xa8c8e8, 0xe8a0bf, 0xc9e39a, 0xf2e3c9],
    windowLit: 0xffe9a8,
    palmTrunk: 0x7a5230,
    palmLeaf: 0x3f8f4f,
    lamp: 0xffe9a8,
  },

  // The five story missions. Each: a fixer briefing, an objective, a target.
  missions: [
    {
      id: 1, title: 'Hot Wheels', kind: 'steal-deliver',
      briefing: 'Mara Voss: "Rio, I need a clean ride. Boost any car off Coral Avenue and bring it to the marina lockup. Quick and quiet."',
      objective: 'Steal a car and deliver it to the marina lockup',
      reward: 600, target: { x: 52, z: 88 }, radius: 6,
    },
    {
      id: 2, title: 'The Fare', kind: 'taxi',
      briefing: 'Mara Voss: "A client is waiting at Palm Plaza. Pick them up and get them to the airport gate before the clock runs out. No scratches."',
      objective: 'Pick up the client, then reach the airport gate in time',
      reward: 900, target: { x: -52, z: -88 }, radius: 6, timeLimit: 75,
    },
    {
      id: 3, title: 'Five Packages', kind: 'collect',
      briefing: 'Mara Voss: "Five parcels stashed around the bay. Grab them all on foot or by car — your call. The buyers pay on delivery."',
      objective: 'Collect 5 packages scattered across Solmar Bay',
      reward: 1200, target: { x: 0, z: 0 }, radius: 6,
    },
    {
      id: 4, title: 'Sixty Seconds', kind: 'evade',
      briefing: 'Mara Voss: "The Bay Police are onto you, Rio. Three stars and counting. Stay out of their hands for sixty seconds and the heat dies."',
      objective: 'Evade the police for 60 seconds at 3 stars',
      reward: 1500, target: { x: 0, z: 0 }, radius: 6,
    },
    {
      id: 5, title: 'The Last Case', kind: 'finale',
      briefing: 'Mara Voss: "One briefcase at the harbour warehouse, then run the cordon back to the safehouse. Do this and we own the bay, Rio."',
      objective: 'Take the briefcase, then escape the cordon to the safehouse',
      reward: 3000, target: { x: -45, z: 45 }, radius: 6,
    },
  ],

  // Fixed spawn points.
  spawn: { x: 4, z: 78, heading: Math.PI },
  safehouse: { x: -45, z: 45 },
  marina: { x: 52, z: 88 },
  plaza: { x: -15, z: -15 },
  airportGate: { x: -52, z: -88 },
  harbour: { x: 45, z: -60 },
};

// Camera presets.
export const CAMERA_MODES = [
  { dist: 8.5, height: 3.4, look: 5 },
  { dist: 13, height: 5.5, look: 7 },
  { dist: 5.5, height: 2.2, look: 4 },
];

export const CONTROLS_TEXT =
  'WASD move / drive  ·  Shift run  ·  E enter / exit car  ·  F shoot  ·  Space jump / handbrake  ·  R camera  ·  P pause  ·  M mute  ·  Enter start mission';
