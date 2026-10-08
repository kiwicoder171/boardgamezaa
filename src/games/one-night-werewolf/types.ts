export type RoleId =
  | 'werewolf'
  | 'minion'
  | 'mason'
  | 'seer'
  | 'robber'
  | 'troublemaker'
  | 'drunk'
  | 'insomniac'
  | 'tanner'
  | 'hunter'
  | 'villager';

export type RoleTeam = 'werewolf' | 'village' | 'tanner';

export type NightPhase =
  | 'night_start'
  | 'night_werewolf'
  | 'night_minion'
  | 'night_mason'
  | 'night_seer'
  | 'night_robber'
  | 'night_troublemaker'
  | 'night_drunk'
  | 'night_insomniac'
  | 'day_discussion'
  | 'voting'
  | 'reveal'
  | 'game_over';

export interface RoleDefinition {
  id: RoleId;
  name: string;
  nameTh: string;
  team: RoleTeam;
  wakeOrder: number; // 0 for no wake up (Villager, Tanner, Hunter)
  icon: string;
  description: string;
  nightInstruction: string;
}

export interface NightActionRecord {
  role: RoleId;
  playerId: string;
  description: string;
  targets?: string[];
  swapped?: boolean;
}

export interface InspectedCard {
  targetId: string; // playerId or 'center_0', 'center_1', 'center_2'
  role: RoleId;
}

export interface OneNightWerewolfSettings {
  discussionMinutes: number; // default 5
  nightSecondsPerRole: number; // default 10
  selectedRoles: RoleId[];
}

export interface OneNightWerewolfState {
  phase: NightPhase;
  phaseTimeRemaining: number;
  deckRoles: RoleId[];
  playerRoles: Record<string, RoleId>; // Current roles (masked for players)
  initialPlayerRoles: Record<string, RoleId>; // Original dealt roles
  centerRoles: [RoleId, RoleId, RoleId]; // Current center cards (masked)
  initialCenterRoles: [RoleId, RoleId, RoleId]; // Original center cards
  activeNightRole: RoleId | null;
  nightActionLogs: NightActionRecord[];
  inspectedCards: Record<string, InspectedCard[]>; // What each player was authorized to see
  claimedRoles: Record<string, RoleId>; // Optional bluff/claim badge
  votes: Record<string, string>; // voterId -> targetPlayerId
  killedPlayerIds: string[];
  winningTeam: RoleTeam | null;
  winReason: string;
  readyForVotePlayerIds: string[];
}

export type OneNightWerewolfAction =
  | {
      type: 'NIGHT_ACTION';
      actionType: 'peek_center' | 'peek_player' | 'rob_swap' | 'trouble_swap' | 'drunk_swap';
      targets: string[]; // playerIds or center indices ('center_0', etc)
    }
  | { type: 'NIGHT_DONE' }
  | { type: 'CLAIM_ROLE'; role: RoleId }
  | { type: 'READY_TO_VOTE' }
  | { type: 'CAST_VOTE'; targetPlayerId: string }
  | { type: 'RESOLVE_VOTES' }
  | { type: 'RESTART_GAME' };
