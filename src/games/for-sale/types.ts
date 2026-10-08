export interface PropertyCard {
  id: number;
  rank: number; // 1 to 30
  name: string;
  nameTh: string;
  icon: string;
  category: 'humble' | 'suburban' | 'luxury' | 'fantasy';
}

export interface CheckCard {
  id: string;
  value: number; // 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 (in thousands, e.g. 15 = $15,000)
}

export interface PlayerForSaleState {
  playerId: string;
  coins: number; // Liquid cash (1 coin = $1,000)
  currentBid: number; // Bid in current auction round
  hasPassed: boolean;
  properties: PropertyCard[]; // Acquired properties (held or remaining to sell)
  checks: CheckCard[]; // Acquired cashier checks
  selectedPropertyId: number | null; // Chosen card in Phase 2 (masked for opponents until reveal)
  isLockedIn: boolean; // Confirmed choice in Phase 2
  lastRefund?: number;
  lastAcquiredProperty?: PropertyCard | null;
  lastAcquiredCheck?: CheckCard | null;
}

export type ForSalePhase =
  | 'phase1_auction'
  | 'phase1_round_summary'
  | 'phase2_selling'
  | 'phase2_reveal'
  | 'game_over';

export interface Phase2RoundResult {
  playerId: string;
  property: PropertyCard;
  check: CheckCard;
}

export interface ForSaleLog {
  timestamp: number;
  text: string;
  textTh?: string;
  type?: 'bid' | 'pass' | 'win' | 'sale' | 'system';
}

export interface ForSaleState {
  phase: ForSalePhase;
  round: number; // 1-indexed
  totalRounds: number; // 5 rounds for 6p/5p (or 6 for 4p, 8 for 3p)
  activePlayerIndex: number;
  currentHighBid: number;
  highBidderId: string | null;
  propertyDeck: PropertyCard[];
  checkDeck: CheckCard[];
  tableProperties: PropertyCard[]; // Ascending order
  tableChecks: CheckCard[]; // Ascending order
  players: Record<string, PlayerForSaleState>;
  turnOrder: string[]; // Player IDs in turn order
  logs: ForSaleLog[];
  winnerId: string | null;
  lastRoundResults?: Phase2RoundResult[];
}

export interface ForSaleSettings {
  turnTimerSeconds?: number;
}

export type ForSaleAction =
  | { type: 'BID'; playerId: string; amount: number }
  | { type: 'PASS'; playerId: string }
  | { type: 'SELECT_PROPERTY'; playerId: string; propertyId: number }
  | { type: 'CONTINUE_NEXT_ROUND'; playerId: string }
  | { type: 'RESTART_GAME'; playerId: string };
