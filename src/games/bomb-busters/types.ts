export type WireValue = number | string;
export type WireColor = 'blue' | 'yellow' | 'red';

export interface WireTile {
  id: string;
  value: WireValue;
  color: WireColor;
  isCut: boolean;
  infoToken: WireValue | 'YELLOW' | 'RED' | null; // Number or color token placed in front of stand
  adjacentToken?: '=' | '≠' | null; // Deduction token between this wire and the next wire
  clues: string[];
}

export interface ClientWireTile {
  id: string;
  value: WireValue | null; // null if hidden by Fog-of-War
  color: WireColor;
  isCut: boolean;
  infoToken: WireValue | 'YELLOW' | 'RED' | null; // Visible to everyone if token is placed
  adjacentToken?: '=' | '≠' | null;
  clues: string[];
}

export interface HelperCard {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  requiredNumber: number; // Cut this number to unlock the card
  isUnlocked: boolean;
  isUsed: boolean;
  effect: 'EXTRA_INFO_TOKEN' | 'RESTORE_STABILITY' | 'PEEK_WIRE';
}

export interface BombBustersSettings {
  missionId: number; // 1 to 60
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
  captainPlayerId: string; // Player #1 who serves as mission captain
  stands: Record<string, WireTile[]>; // playerId -> sorted list of tiles
  detonatorLives: number;
  maxDetonatorLives: number;
  currentTurnPlayerId: string;
  turnOrder: string[];
  totalWiresToCut: number;
  cutWiresCount: number;
  phase: 'initial_clue' | 'in_progress' | 'victory' | 'exploded';
  endReason: string | null;
  validationTrack: Record<number, { cut: number; total: number; isValidated: boolean }>;
  helperCards: HelperCard[];
  doubleDetectorUsed: Record<string, boolean>; // playerId -> has used skill
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
  numberRange: number;
  yellowDecimals?: number[];
  redDecimals?: number[];
  blueCount?: number;
  yellowCount?: number;
  redCount?: number;
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
      wireId3?: string;
      wireId4?: string;
    }
  | {
      type: 'USE_DOUBLE_DETECTOR';
      targetPlayerId: string;
      wireId1: string;
      wireId2: string;
      guessedValue: number;
    }
  | {
      type: 'USE_HELPER_CARD';
      cardId: string;
      targetWireId?: string;
    }
  | {
      type: 'REVEAL_RED_WIRES';
    }
  | {
      type: 'PLACE_INFO_TOKEN';
      wireId: string;
    }
  | {
      type: 'PLACE_ADJACENT_TOKEN';
      leftWireId: string;
      tokenType: '=' | '≠' | null;
    }
  | {
      type: 'OPERATIVE_CALL';
      targetPlayerId: string;
      targetWireId: string;
      guessedValue: number;
    }
  | {
      type: 'PASS_TURN';
    }
  | {
      type: 'USE_SCANNER';
      targetPlayerId: string;
      scannedValue: number;
    }
  | {
      type: 'USE_STABILIZER';
    }
  | {
      type: 'BOT_AUTO_TURN';
      botId: string;
    };

export interface BombBustersClientState {
  missionId: number;
  missionName: string;
  missionBriefing: string;
  captainPlayerId: string;
  stands: Record<string, ClientWireTile[]>;
  detonatorLives: number;
  maxDetonatorLives: number;
  currentTurnPlayerId: string;
  turnOrder: string[];
  totalWiresToCut: number;
  cutWiresCount: number;
  phase: 'initial_clue' | 'in_progress' | 'victory' | 'exploded';
  endReason: string | null;
  validationTrack: Record<number, { cut: number; total: number; isValidated: boolean }>;
  helperCards: HelperCard[];
  doubleDetectorUsed: Record<string, boolean>;
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
  numberRange: number;
  allRevealed: boolean;
  blueCount?: number;
  yellowCount?: number;
  redCount?: number;
  yellowDecimals?: number[];
  redDecimals?: number[];
}
