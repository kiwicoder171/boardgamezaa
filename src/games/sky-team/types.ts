export type FlightRole = 'pilot' | 'copilot';

export interface SkyTeamDie {
  id: string;
  value: number; // 1 to 6
  color: 'blue' | 'orange';
  placed: boolean;
  slotId?: string;
}

export interface CockpitSlot {
  id: string;
  name: string;
  role: 'pilot' | 'copilot' | 'any';
  requiredValues?: number[]; // e.g. [1, 2] or [2]
  isMandatory?: boolean;
  die: SkyTeamDie | null;
  active: boolean; // whether slot is unlocked/available
}

export interface ApproachSpace {
  index: number;
  airplanes: number;
  isRunway: boolean;
  trafficDiceRolls?: number; // black dice rolls at start of round
  hasFog?: boolean;
}

export interface AirportScenario {
  id: string;
  name: string;
  code: string;
  country: string;
  flag: string;
  difficulty: 'Green (Novice)' | 'Yellow (Moderate)' | 'Orange (Challenging)' | 'Red (Extreme)';
  briefing: string;
  approachTrackLength: number;
  runwayIndex: number;
  trafficLayout: { [spaceIndex: number]: number }; // spaceIndex -> airplane count
  trafficDiceEvents?: { [altitude: number]: number }; // altitude -> count of black dice
  activeModules: {
    kerosene?: boolean;
    wind?: boolean;
    iceBrakes?: boolean;
    intern?: boolean;
    alarms?: boolean;
    heavyTurbulence?: boolean;
    lowVisibility?: boolean;
  };
  startingFuel?: number;
  windValue?: number; // -2 to +2
  crosswind?: number;
}

export interface SkyTeamState {
  airportId: string;
  airportName: string;
  airportCode: string;
  briefing: string;
  difficulty: string;

  // Round & Altitude
  round: number; // 1 to 7
  altitude: number; // 6000, 5000, 4000, 3000, 2000, 1000, 0
  maxRounds: number; // 7

  // Active turn & role tracking
  currentTurnPlayerId: string;
  pilotPlayerId: string;
  copilotPlayerId: string;

  // Dice pools
  pilotDice: SkyTeamDie[];
  copilotDice: SkyTeamDie[];

  // Artificial Horizon / Axis
  tilt: number; // -3 to +3 (0 = level horizontal)
  maxTiltAllowed: number; // 3

  // Aerodynamics & Speed
  blueAeroMarker: number; // Low-speed threshold (starts at 4, increases as gear deploys; sum <= blue is 0 spaces)
  orangeAeroMarker: number; // High-speed threshold (starts at 8, increases as flaps deploy; sum > orange is 2 spaces)
  currentEngineSum: number | null;
  currentRoundSpeed: number | null; // 0, 1, or 2 spaces

  // Aircraft Systems / Checklist
  landingGear: [boolean, boolean, boolean]; // 3 gear switches
  flaps: [boolean, boolean, boolean, boolean]; // 4 flap switches
  brakesLevel: number; // 0, 2, 4, 6 (highest deployed brake)

  // Resources
  coffeeTokens: number; // 0 to 3 (+1/-1 concentration)
  rerollTokens: number; // 0 to 3

  // Approach Track & Traffic
  approachTrack: ApproachSpace[];
  currentApproachIndex: number; // 0 to runwayIndex

  // Active Modules
  modules: {
    kerosene?: {
      current: number;
      max: number;
      burnRatePerRound: number;
    };
    wind?: {
      headwind: number; // affects engine sum required
      crosswind: number; // affects tilt drift
    };
    iceBrakes?: {
      slippery: boolean;
      extraBrakeRequired: number;
    };
    intern?: {
      available: boolean;
      trained: boolean;
    };
    alarms?: {
      activeAlarms: string[];
      alarmDeckCount: number;
    };
    heavyTurbulence?: {
      severity: number;
    };
    lowVisibility?: {
      visibleRange: number; // spaces ahead visible
    };
  };

  // Cockpit Slots
  slots: {
    axisPilot: SkyTeamDie | null;
    axisCopilot: SkyTeamDie | null;
    enginesPilot: SkyTeamDie | null;
    enginesCopilot: SkyTeamDie | null;
    radioPilot: SkyTeamDie | null;
    radioCopilot1: SkyTeamDie | null;
    radioCopilot2: SkyTeamDie | null;
    gear1: SkyTeamDie | null; // values [1, 2]
    gear2: SkyTeamDie | null; // values [3, 4]
    gear3: SkyTeamDie | null; // values [5, 6]
    flaps1: SkyTeamDie | null; // values [1, 2]
    flaps2: SkyTeamDie | null; // values [2, 3]
    flaps3: SkyTeamDie | null; // values [4, 5]
    flaps4: SkyTeamDie | null; // values [5, 6]
    brakes1: SkyTeamDie | null; // value [2]
    brakes2: SkyTeamDie | null; // value [4]
    brakes3: SkyTeamDie | null; // value [6]
    coffee1: SkyTeamDie | null;
    coffee2: SkyTeamDie | null;
    coffee3: SkyTeamDie | null;
    internPilot?: SkyTeamDie | null;
    internCopilot?: SkyTeamDie | null;
    keroseneDump?: SkyTeamDie | null;
    alarmClear?: SkyTeamDie | null;
  };

  // Game Status
  status: 'briefing' | 'playing' | 'won' | 'crashed';
  crashReason: string | null;
  history: Array<{
    id: string;
    text: string;
    type: 'info' | 'success' | 'warning' | 'crash' | 'radio';
    timestamp: number;
  }>;
}

export type SkyTeamAction =
  | { type: 'PLACE_DIE'; playerId: string; dieId: string; slotId: string }
  | { type: 'USE_COFFEE'; playerId: string; dieId: string; delta: 1 | -1 }
  | { type: 'USE_REROLL'; playerId: string; dieIds: string[] }
  | { type: 'DUMP_FUEL'; playerId: string; amount: number }
  | { type: 'CLEAR_ALARM'; playerId: string; alarmId: string }
  | { type: 'NEXT_ROUND'; playerId: string }
  | { type: 'RESTART_GAME' };
