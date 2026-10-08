export type GemColor = 'diamond' | 'sapphire' | 'emerald' | 'ruby' | 'onyx';
export type TokenType = GemColor | 'gold';

export type GemTokens = Record<TokenType, number>;

export type CardTier = 1 | 2 | 3;

export interface DevCard {
  id: string;
  tier: CardTier;
  gemBonus: GemColor;
  bonusCount?: number; // 1 (standard) or 2 (Orient)
  prestige: number;
  cost: Partial<Record<GemColor, number>>;
  isOrient?: boolean;
}

export interface NobleTile {
  id: string;
  name: string;
  avatar: string;
  prestige: number; // 3
  requirements: Partial<Record<GemColor, number>>; // e.g. { diamond: 4, sapphire: 4 }
}

export interface CityTile {
  id: string;
  name: string;
  avatar: string;
  minPrestige: number;
  requirements: Partial<Record<GemColor, number>>;
}

export interface SplendorPlayer {
  id: string;
  name: string;
  avatar?: string;
  tokens: GemTokens;
  cards: DevCard[];
  reservedCards: DevCard[];
  nobles: NobleTile[];
  claimedCity?: CityTile | null;
  prestige: number;
}

export type SplendorExpansion = 'none' | 'cities' | 'orient';

export interface SplendorLogEntry {
  id: string;
  message: string;
  timestamp: number;
}

export interface SplendorState {
  expansion: SplendorExpansion;
  bank: GemTokens;
  market: Record<CardTier, (DevCard | null)[]>; // 4 cards per tier
  decks: Record<CardTier, DevCard[]>;
  orientMarket?: Record<CardTier, (DevCard | null)[]>; // 2 cards per tier if Orient active
  orientDecks?: Record<CardTier, DevCard[]>;
  nobles: NobleTile[];
  cities?: CityTile[];
  players: Record<string, SplendorPlayer>;
  playerOrder: string[];
  currentTurnPlayerId: string;
  turnIndex: number;
  finalRoundTriggered: boolean;
  roundStartPlayerId: string;
  phase: 'action' | 'discard_tokens' | 'game_over';
  discardingPlayerId: string | null;
  winner: string | null;
  winReason: string | null;
  logs: SplendorLogEntry[];
}

export type SplendorAction =
  | { type: 'take_3_tokens'; colors: [GemColor, GemColor, GemColor] }
  | { type: 'take_2_tokens'; color: GemColor }
  | { type: 'reserve_card'; cardId: string }
  | { type: 'reserve_from_deck'; tier: CardTier; isOrient?: boolean }
  | { type: 'buy_card'; cardId: string }
  | { type: 'discard_tokens'; tokens: Partial<GemTokens> }
  | { type: 'reset_game' };
