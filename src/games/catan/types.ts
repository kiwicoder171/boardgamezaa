export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';

export type TerrainType = 'forest' | 'pasture' | 'fields' | 'hills' | 'mountains' | 'desert';

export type HarborType = 'generic' | ResourceType;

export type BuildingType = 'settlement' | 'city';

export type DevCardType = 'knight' | 'road_building' | 'year_of_plenty' | 'monopoly' | 'victory_point';

export type CatanPhase =
  | 'setup_round_1' // P1 -> P4 place 1 settlement + 1 road
  | 'setup_round_2' // P4 -> P1 place 2nd settlement + 1 road (receive resources from adjacent hexes)
  | 'main_game'
  | 'discarding'    // On rolling 7, players with > 7 cards must discard
  | 'moving_robber' // Active player moves robber and steals a card
  | 'game_over';

export interface CatanVertex {
  id: number; // 0..53
  x: number;
  y: number;
  adjacentVertices: number[]; // Connected vertices
  adjacentEdges: number[];    // Connected road edges
  adjacentHexes: number[];    // Adjacent terrain hexes (1..3)
  building: null | {
    type: BuildingType;
    playerId: string;
  };
  harbor: null | {
    type: HarborType;
    ratio: number; // 2 or 3
  };
}

export interface CatanEdge {
  id: number; // 0..71
  vertices: [number, number];
  road: null | {
    playerId: string;
  };
}

export interface CatanHex {
  id: number; // 0..18
  terrain: TerrainType;
  resource: ResourceType | null;
  number: number | null; // 2..12, null for desert
  pips: number;          // Probability dots (e.g. 5 for 6 and 8)
  vertices: number[];    // 6 vertex IDs
  edges: number[];       // 6 edge IDs
  x: number;             // Center x
  y: number;             // Center y
}

export interface ResourceCount {
  wood: number;
  brick: number;
  sheep: number;
  wheat: number;
  ore: number;
}

export interface DevCardCount {
  knight: number;
  road_building: number;
  year_of_plenty: number;
  monopoly: number;
  victory_point: number;
}

export interface CatanPlayerState {
  id: string;
  name: string;
  color: string;
  avatar: string;
  resources: ResourceCount;
  devCards: DevCardType[];
  playedKnights: number;
  roadsCount: number;       // Max 15
  settlementsCount: number; // Max 5
  citiesCount: number;      // Max 4
  victoryPoints: number;
  toDiscardCount?: number;  // If waiting to discard during roll 7
  hasPlayedDevCardThisTurn?: boolean;
}

export interface TradeOffer {
  id: string;
  senderId: string;
  targetPlayerId?: string | null; // null means open to all players
  offer: Partial<ResourceCount>;
  request: Partial<ResourceCount>;
  acceptedPlayerIds: string[];
}

export interface CatanSettings {
  targetVictoryPoints: number; // default 10
  boardLayout: 'standard' | 'random';
  enableDomesticTrading: boolean;
}

export interface CatanLogEntry {
  id: string;
  timestamp: number;
  text: string;
  textTh?: string;
  type: 'roll' | 'build' | 'trade' | 'robber' | 'dev_card' | 'system' | 'victory';
}

export interface CatanState {
  phase: CatanPhase;
  turnOrder: string[];
  currentTurnPlayerId: string;
  activeSetupStep?: 'settlement' | 'road';
  setupRound: 1 | 2;
  setupTurnIndex: number;
  
  turnStep: 'roll' | 'actions';
  dice: [number, number] | null;
  diceTotal: number | null;
  robberHexId: number;
  
  hexes: CatanHex[];
  vertices: CatanVertex[];
  edges: CatanEdge[];
  
  players: Record<string, CatanPlayerState>;
  devCardDeck: DevCardType[];
  
  longestRoad: {
    playerId: string | null;
    length: number;
  };
  largestArmy: {
    playerId: string | null;
    count: number;
  };
  
  pendingTrade: TradeOffer | null;
  pendingRobberStealTargets?: string[]; // Candidate player IDs adjacent to robber
  roadBuildingRemaining?: number;      // 1 or 2 free roads left from Road Building card
  
  winner: string | null;
  winnerName: string | null;
  logs: CatanLogEntry[];
}

export type CatanAction =
  | { type: 'BUILD_INITIAL_SETTLEMENT'; vertexId: number }
  | { type: 'BUILD_INITIAL_ROAD'; edgeId: number }
  | { type: 'ROLL_DICE' }
  | { type: 'DISCARD_CARDS'; cards: Partial<ResourceCount> }
  | { type: 'MOVE_ROBBER'; hexId: number; targetPlayerId?: string }
  | { type: 'BUILD_ROAD'; edgeId: number }
  | { type: 'BUILD_SETTLEMENT'; vertexId: number }
  | { type: 'UPGRADE_CITY'; vertexId: number }
  | { type: 'BUY_DEV_CARD' }
  | { type: 'PLAY_DEV_CARD'; card: DevCardType; params?: any }
  | { type: 'BANK_TRADE'; giveResource: ResourceType; giveAmount: number; getResource: ResourceType }
  | { type: 'PROPOSE_TRADE'; offer: Partial<ResourceCount>; request: Partial<ResourceCount>; targetPlayerId?: string }
  | { type: 'RESPOND_TRADE'; accept: boolean }
  | { type: 'EXECUTE_TRADE'; partnerPlayerId: string }
  | { type: 'CANCEL_TRADE' }
  | { type: 'END_TURN' };
