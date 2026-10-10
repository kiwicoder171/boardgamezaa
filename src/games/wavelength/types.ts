export interface SpectrumCard {
  id: string;
  left: string;
  right: string;
  leftTh: string;
  rightTh: string;
  category?: string;
}

export type WavelengthPhase = 'clue' | 'guessing' | 'counter_guess' | 'reveal' | 'gameover';

export type TeamId = 'brain' | 'mind';

export type CounterGuess = 'left' | 'right' | null;

export interface ScoreHistoryEntry {
  round: number;
  activeTeam: TeamId | 'coop';
  psychicName: string;
  card: SpectrumCard;
  clue: string;
  targetAngle: number;
  dialAngle: number;
  points: number;
  counterGuess?: CounterGuess;
  counterPoints?: number;
}

export interface WavelengthSettings {
  mode: 'competitive' | 'coop';
  targetScore: number;
  timerSeconds: number;
}

export interface WavelengthState {
  mode: 'competitive' | 'coop';
  targetScore: number;
  phase: WavelengthPhase;
  round: number;
  maxRounds: number; // for coop
  activeTeam: TeamId;
  teams: {
    brain: {
      name: string;
      playerIds: string[];
      score: number;
      psychicIndex?: number;
    };
    mind: {
      name: string;
      playerIds: string[];
      score: number;
      psychicIndex?: number;
    };
  };
  psychicId: string;
  dialCaptainId?: string; // Designated player who steers the dial for the active team
  currentCard: SpectrumCard;
  targetAngle: number | null; // 15° to 165°, masked for non-psychics until reveal
  dialAngle: number; // 0° to 180°
  clue: string;
  counterGuess: CounterGuess;
  shutterOpen: boolean;
  lastRoundResult: {
    points: number;
    zone: 'bullseye' | 'inner' | 'outer' | 'miss';
    diff: number;
    counterCorrect?: boolean;
    counterPoints?: number;
  } | null;
  winnerTeam: TeamId | 'coop_victory' | null;
  history: ScoreHistoryEntry[];
  usedCardIds: string[];
}

export type WavelengthAction =
  | { type: 'SUBMIT_CLUE'; clue: string }
  | { type: 'ROTATE_DIAL'; angle: number }
  | { type: 'LOCK_GUESS' }
  | { type: 'SUBMIT_COUNTER_GUESS'; guess: 'left' | 'right' }
  | { type: 'NEXT_ROUND' }
  | { type: 'REROLL_CARD' }
  | { type: 'SWITCH_TEAM'; playerId: string; team: TeamId };
