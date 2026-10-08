export type WerewolfRole =
  | 'villager'
  | 'werewolf'
  | 'wolf_pup'
  | 'seer'
  | 'bodyguard'
  | 'witch'
  | 'hunter'
  | 'tanner'
  | 'minion'
  | 'cupid'
  | 'mayor'
  | 'mason'
  | 'robber'
  | 'troublemaker'
  | 'insomniac';

export type AlignmentTeam = 'villagers' | 'werewolves' | 'tanner' | 'lovers';

export interface RoleConfig {
  id: WerewolfRole;
  name: string;
  team: AlignmentTeam;
  description: string;
  icon: string;
  badgeColor: string;
  nightOrder: number; // Order in night sequence (lower = earlier, 0 = no night action)
  wakePrompt?: string;
}

export interface WerewolfPlayer {
  id: string;
  name: string;
  avatar: string;
  role: WerewolfRole;
  originalRole: WerewolfRole;
  isAlive: boolean;
  isProtected?: boolean;
  isLover?: boolean;
  isMayor?: boolean;
}

export interface WerewolfState {
  dayNumber: number;
  phase: 'night' | 'day_discussion' | 'day_voting' | 'hunter_revenge' | 'game_over';
  activeNightRole: WerewolfRole | null;
  nightStepIndex: number; // index into active night roles array

  players: WerewolfPlayer[];

  // Night transient tracking
  werewolfKillTarget: string | null;
  bodyguardProtectTarget: string | null;
  bodyguardLastProtected: string | null;
  witchHealTarget: string | null;
  witchPoisonTarget: string | null;
  witchPotionsUsed: { heal: boolean; poison: boolean };
  seerInspected: { [seerPlayerId: string]: { targetId: string; role: WerewolfRole; isEvil: boolean } };
  cupidLovers: [string, string] | null;

  // Day voting
  votes: { [voterPlayerId: string]: string }; // voter -> target
  eliminatedLastNight: string[];
  eliminatedByDayVote: string | null;

  // Hunter revenge
  hunterActivePlayerId?: string;

  // Endgame
  winner: AlignmentTeam | null;
  winSummary: string | null;

  history: Array<{
    id: string;
    text: string;
    type: 'night' | 'day' | 'death' | 'vote' | 'seer' | 'win';
    timestamp: number;
  }>;
}

export type WerewolfAction =
  | { type: 'NIGHT_WOLF_KILL'; playerId: string; targetId: string }
  | { type: 'NIGHT_SEER_INSPECT'; playerId: string; targetId: string }
  | { type: 'NIGHT_BODYGUARD_PROTECT'; playerId: string; targetId: string }
  | { type: 'NIGHT_WITCH_ACT'; playerId: string; heal: boolean; poisonTargetId: string | null }
  | { type: 'NIGHT_CUPID_BIND'; playerId: string; lover1Id: string; lover2Id: string }
  | { type: 'NIGHT_ROBBER_SWAP'; playerId: string; targetId: string }
  | { type: 'NIGHT_TROUBLEMAKER_SWAP'; playerId: string; target1Id: string; target2Id: string }
  | { type: 'SKIP_NIGHT_STEP'; playerId: string }
  | { type: 'CAST_VOTE'; playerId: string; targetId: string }
  | { type: 'HUNTER_REVENGE'; playerId: string; targetId: string }
  | { type: 'PROCEED_TO_VOTING'; playerId: string }
  | { type: 'RESOLVE_DAY_VOTES'; playerId: string }
  | { type: 'RESTART_GAME' };

export interface WerewolfSettings {
  expansionPacks: 'standard' | 'all_roles' | 'chaos';
  discussionSeconds: number;
}
