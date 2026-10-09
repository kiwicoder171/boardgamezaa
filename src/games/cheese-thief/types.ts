export type CheeseThiefRole = 'thief' | 'sleepyhead' | 'fall_mouse';

export type CheeseThiefPhase =
  | 'setup'
  | 'night'
  | 'day'
  | 'voting'
  | 'game_over';

export interface CheeseThiefPlayer {
  id: string;
  name: string;
  avatar?: string;
  seatIndex: number;
  role: CheeseThiefRole;
  isFollower: boolean;
  dieValue: number; // 1 to 6
  cupLifted: boolean;
  hasPeeked: boolean;
  peekedTargetId: string | null;
  peekedTargetDie: number | null;
  votedTargetId: string | null;
  isReady: boolean;
}

export interface CheeseThiefLogEntry {
  id: string;
  hour?: number;
  text: string;
  timestamp: number;
}

export interface CheeseThiefState {
  phase: CheeseThiefPhase;
  currentHour: number; // 0 (pre-night), 1..6, 7 (dawn)
  hourDurationSeconds: number;
  hourSecondsRemaining: number;
  dayDiscussionSeconds: number;
  daySecondsRemaining: number;
  cheeseStolen: boolean;
  stolenAtHour: number | null;
  stolenBy: string | null;
  followerId: string | null;
  winner: 'sleepyheads' | 'thief' | 'fall_mouse' | null;
  winReason: string | null;
  fallMouseEnabled: boolean;
  players: Record<string, CheeseThiefPlayer>;
  playerOrder: string[];
  logs: CheeseThiefLogEntry[];
}

export type CheeseThiefAction =
  | { type: 'set_ready'; playerId: string }
  | { type: 'toggle_fall_mouse'; enabled: boolean }
  | { type: 'start_night' }
  | { type: 'advance_hour' }
  | { type: 'steal_cheese'; playerId: string }
  | { type: 'peek_cup'; playerId: string; targetId: string }
  | { type: 'choose_follower'; playerId: string; targetId: string }
  | { type: 'start_voting' }
  | { type: 'cast_vote'; playerId: string; targetId: string }
  | { type: 'resolve_votes' }
  | { type: 'tick_second' }
  | { type: 'reset_game' };
