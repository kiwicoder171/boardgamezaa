export type TeamColor = 'red' | 'blue';
export type PlayerRole = 'spymaster' | 'operative';
export type CardType = 'red' | 'blue' | 'neutral' | 'assassin';
export type WordDeckTheme = 'classic' | 'scifi' | 'fairytales';

export interface CodenamesCard {
  id: string;
  word: string;
  type: CardType; // Secret identity
  revealed: boolean;
}

export interface CodenamesPlayer {
  id: string;
  name: string;
  avatar?: string;
  team: TeamColor;
  role: PlayerRole;
}

export interface CodenamesClue {
  word: string;
  count: number;
  team: TeamColor;
}

export interface CodenamesLogEntry {
  id: string;
  text: string;
  timestamp: number;
}

export interface CodenamesState {
  theme: WordDeckTheme;
  grid: CodenamesCard[]; // 25 cards (5x5)
  startingTeam: TeamColor;
  currentTeam: TeamColor;
  turnPhase: 'clue' | 'guess';
  currentClue: CodenamesClue | null;
  guessesRemaining: number;
  redRemaining: number;
  blueRemaining: number;
  winner: TeamColor | null;
  winReason: string | null;
  players: Record<string, CodenamesPlayer>;
  playerOrder: string[];
  logs: CodenamesLogEntry[];
}

export type CodenamesAction =
  | { type: 'set_team'; playerId: string; team: TeamColor }
  | { type: 'set_role'; playerId: string; role: PlayerRole }
  | { type: 'give_clue'; word: string; count: number }
  | { type: 'guess_card'; cardId: string }
  | { type: 'end_guessing' }
  | { type: 'reset_game' };
