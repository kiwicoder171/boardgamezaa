export interface Player {
  id: string; // Persistent player ID (e.g., from client storage)
  socketId: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  connected: boolean;
  score?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export type RoomStatus = 'lobby' | 'playing' | 'gameover';

export interface Room<TGameState = any, TSettings = any> {
  code: string;
  hostId: string;
  players: Player[];
  selectedGameId: string;
  status: RoomStatus;
  gameSettings: TSettings;
  gameState: TGameState | null;
  chatMessages: ChatMessage[];
  createdAt: number;
  lastActivity: number;
}

export interface SettingSchemaField {
  key: string;
  label: string;
  description?: string;
  type: 'number' | 'boolean' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: any }[];
  default: any;
}

export interface GameDefinition<TState = any, TAction = any, TSettings = any> {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  recommendedPlayers?: string;
  tags: string[];
  durationMinutes: string;
  icon: string; // Emoji or Lucide icon name
  coverGradient: string;
  rules: {
    summary: string;
    sections: { title: string; content: string }[];
  };
  defaultSettings: TSettings;
  settingsSchema: SettingSchemaField[];
  
  // Game logic methods
  initGame: (players: Player[], settings: TSettings) => TState;
  handleAction: (
    state: TState,
    action: TAction,
    playerId: string,
    room: Room<TState, TSettings>
  ) => { newState: TState; events?: string[]; error?: string };
  
  // Crucial: sanitize secret state per player to prevent client-side cheating
  sanitizeState: (state: TState, playerId: string) => any;
  
  checkGameOver?: (state: TState) => {
    isOver: boolean;
    winner?: string;
    summary?: string;
    scores?: Record<string, number>;
  } | null;
  
  onTimerTick?: (state: TState) => {
    newState: TState;
    triggeredGameOver?: boolean;
  };
}
