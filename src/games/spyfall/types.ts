import { LocationInfo } from './data';

export interface SpyfallSettings {
  roundMinutes: number; // typically 5-10
  spyCount: number; // 1 or 2
  locationPack: string; // 'all' | 'transport' | 'city' | 'leisure'
}

export interface SpyfallState {
  selectedLocation: string; // The secret location name
  roles: Record<string, string>; // playerId -> role name
  spies: string[]; // playerIds of spies
  timeRemaining: number; // in seconds
  isPaused: boolean;
  
  // Turn indicator
  currentAskerId: string | null;
  currentAnswererId: string | null;
  lastNudgeAt: number | null;
  
  // Accusation / Voting
  phase: 'questioning' | 'accusation' | 'spy_guess' | 'gameover';
  accuserId: string | null;
  accusedId: string | null;
  votes: Record<string, boolean>; // playerId -> true (guilty) / false (innocent)
  votingTimeRemaining: number;
  
  // Results
  winner: 'citizens' | 'spy' | null;
  winReason: string | null;
  revealedLocation: string | null;
  history: { id: string; text: string; time: number; type?: 'info' | 'turn' | 'accuse' | 'verdict' }[];
}

export type SpyfallAction =
  | { type: 'SELECT_QUESTIONEE'; targetPlayerId: string }
  | { type: 'FINISH_ANSWER' }
  | { type: 'ACCUSE'; targetPlayerId: string }
  | { type: 'CAST_VOTE'; voteGuilty: boolean }
  | { type: 'CANCEL_ACCUSATION' }
  | { type: 'SPY_GUESS'; locationName: string }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'NUDGE_PLAYER' }
  | { type: 'TIMER_TICK'; secondsElapsed?: number }
  | { type: 'TIMES_UP' };

export interface SpyfallClientState {
  // Public state
  timeRemaining: number;
  isPaused: boolean;
  currentAskerId: string | null;
  currentAnswererId: string | null;
  lastNudgeAt: number | null;
  phase: 'questioning' | 'accusation' | 'spy_guess' | 'gameover';
  accuserId: string | null;
  accusedId: string | null;
  votes: Record<string, boolean>;
  votingTimeRemaining: number;
  winner: 'citizens' | 'spy' | null;
  winReason: string | null;
  revealedLocation: string | null;
  history: { id: string; text: string; time: number; type?: 'info' | 'turn' | 'accuse' | 'verdict' }[];
  locations: LocationInfo[];
  
  // Sanitized private info
  isSpy: boolean;
  myRole: string; // "SPY" or specific role
  myLocation: string | null; // null if spy, or location name if citizen
  revealedSpies?: string[]; // only revealed when game over
  revealedRoles?: Record<string, string>; // only revealed when game over
}
