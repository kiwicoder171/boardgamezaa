export type CoupRole = 'duke' | 'assassin' | 'captain' | 'ambassador' | 'contessa';

export type CoupActionType =
  | 'INCOME'
  | 'FOREIGN_AID'
  | 'TAX'
  | 'ASSASSINATE'
  | 'STEAL'
  | 'EXCHANGE'
  | 'COUP';

export interface CoupCard {
  id: string;
  role: CoupRole;
  isRevealed: boolean; // Face up (eliminated)
}

export interface ClientCoupCard {
  id: string;
  role: CoupRole | null; // Masked for other players until revealed
  isRevealed: boolean;
}

export interface PlayerCoupState {
  playerId: string;
  coins: number;
  cards: CoupCard[];
  isEliminated: boolean;
}

export interface ClientPlayerCoupState {
  playerId: string;
  coins: number;
  cards: ClientCoupCard[];
  isEliminated: boolean;
}

export type CoupPhase =
  | 'action_selection'
  | 'action_reaction' // Opponents can Challenge or Block
  | 'block_reaction' // Opponents can Challenge the Block
  | 'choose_loss' // A player must select a card to lose
  | 'exchange_selection' // Ambassador is choosing which 2 cards to keep
  | 'game_over';

export interface PendingAction {
  type: CoupActionType;
  actorId: string;
  claimedRole?: CoupRole;
  targetId?: string;
  passedPlayerIds: string[];
  expiresAt: number;
}

export interface PendingBlock {
  blockerId: string;
  claimedRole: CoupRole;
  passedPlayerIds: string[];
  expiresAt: number;
}

export interface PendingLoss {
  playerId: string;
  cause: string;
  secondaryLossPending?: {
    playerId: string;
    cause: string;
  };
}

export interface CoupLog {
  timestamp: number;
  text: string;
  textTh?: string;
  type?: 'action' | 'challenge' | 'block' | 'loss' | 'system';
}

export interface CoupState {
  phase: CoupPhase;
  currentTurnPlayerId: string;
  turnOrder: string[];
  courtDeck: CoupCard[];
  discardGraveyard: CoupCard[];
  treasuryCoins: number;
  players: Record<string, PlayerCoupState>;
  pendingAction: PendingAction | null;
  pendingBlock: PendingBlock | null;
  pendingLoss: PendingLoss | null;
  exchangeCards: { playerId: string; cards: CoupCard[] } | null;
  winnerId: string | null;
  logs: CoupLog[];
}

export interface CoupClientState {
  phase: CoupPhase;
  currentTurnPlayerId: string;
  turnOrder: string[];
  courtDeckCount: number;
  discardGraveyard: CoupCard[];
  treasuryCoins: number;
  players: Record<string, ClientPlayerCoupState>;
  pendingAction: PendingAction | null;
  pendingBlock: PendingBlock | null;
  pendingLoss: PendingLoss | null;
  exchangeCards: { playerId: string; cards: CoupCard[] } | null;
  winnerId: string | null;
  logs: CoupLog[];
}

export interface CoupSettings {
  reactionSeconds?: number;
}

export type CoupAction =
  | { type: 'DECLARE_ACTION'; playerId: string; actionType: CoupActionType; targetId?: string }
  | { type: 'CHALLENGE_ACTION'; playerId: string }
  | { type: 'PASS_ACTION_REACTION'; playerId: string }
  | { type: 'DECLARE_BLOCK'; playerId: string; claimedRole: CoupRole }
  | { type: 'CHALLENGE_BLOCK'; playerId: string }
  | { type: 'PASS_BLOCK_REACTION'; playerId: string }
  | { type: 'CHOOSE_INFLUENCE_LOSS'; playerId: string; cardId: string }
  | { type: 'CONFIRM_EXCHANGE'; playerId: string; keepCardIds: string[] }
  | { type: 'BOT_AUTO_TURN'; botId: string }
  | { type: 'RESTART_GAME'; playerId: string };
