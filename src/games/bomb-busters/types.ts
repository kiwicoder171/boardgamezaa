export type WireValue = number | 'RED';
export type WireColor = 'blue' | 'yellow' | 'red';

export interface WireTile {
  id: string;
  value: WireValue;
  color: WireColor;
  isCut: boolean;
  infoToken: WireValue | null; // Number token placed in front of stand
  clues: string[];
}

export interface ClientWireTile {
  id: string;
  value: WireValue | null; // null if belonging to another player, uncut, and has no info token
  color: WireColor;
  isCut: boolean;
  infoToken: WireValue | null; // Visible to everyone if token is placed
  clues: string[];
}

export interface BombBustersSettings {
  missionId: number; // 1 to 66
  difficulty?: 'trainee' | 'veteran' | 'expert';
  numberRange?: number;
  detonatorLives?: number;
  includeRedWire?: boolean;
}

export interface ValidationTrackItem {
  number: number;
  cut: number;
  total: number;
  isValidated: boolean;
}

export interface BombBustersState {
  missionId: number;
  missionName: string;
  missionBriefing: string;
  stands: Record<string, WireTile[]>; // playerId -> sorted list of tiles
  detonatorLives: number;
  maxDetonatorLives: number;
  currentTurnPlayerId: string;
  turnOrder: string[];
  totalWiresToCut: number;
  cutWiresCount: number;
  phase: 'in_progress' | 'victory' | 'exploded';
  endReason: string | null;
  validationTrack: Record<number, { cut: number; total: number; isValidated: boolean }>;
  equipment: {
    scannerAvailable: boolean;
    stabilizerAvailable: boolean;
  };
  history: {
    id: string;
    text: string;
    time: number;
    type: 'success' | 'error' | 'boom' | 'info';
  }[];
}

export type BombBustersAction =
  | {
      type: 'CUT_WIRE';
      myWireId: string;
      targetPlayerId: string;
      targetWireId: string;
    }
  | {
      type: 'SOLO_CUT';
      wireId1: string;
      wireId2: string;
    }
  | {
      type: 'USE_SCANNER';
      targetPlayerId: string;
      scannedValue: number;
    }
  | {
      type: 'USE_STABILIZER';
    };

export interface BombBustersClientState {
  missionId: number;
  missionName: string;
  missionBriefing: string;
  stands: Record<string, ClientWireTile[]>;
  detonatorLives: number;
  maxDetonatorLives: number;
  currentTurnPlayerId: string;
  turnOrder: string[];
  totalWiresToCut: number;
  cutWiresCount: number;
  phase: 'in_progress' | 'victory' | 'exploded';
  endReason: string | null;
  validationTrack: Record<number, { cut: number; total: number; isValidated: boolean }>;
  equipment: {
    scannerAvailable: boolean;
    stabilizerAvailable: boolean;
  };
  history: {
    id: string;
    text: string;
    time: number;
    type: 'success' | 'error' | 'boom' | 'info';
  }[];
  allRevealed?: boolean;
}
