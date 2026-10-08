import { Player } from '@/types/game';
import {
  OneNightWerewolfAction,
  OneNightWerewolfSettings,
  OneNightWerewolfState,
  RoleId,
  NightPhase,
  RoleTeam,
} from './types';
import { getDefaultDeckForPlayerCount, NIGHT_WAKE_ORDER, ROLES } from './roles';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function roleToNightPhase(role: RoleId): NightPhase {
  switch (role) {
    case 'werewolf':
      return 'night_werewolf';
    case 'minion':
      return 'night_minion';
    case 'mason':
      return 'night_mason';
    case 'seer':
      return 'night_seer';
    case 'robber':
      return 'night_robber';
    case 'troublemaker':
      return 'night_troublemaker';
    case 'drunk':
      return 'night_drunk';
    case 'insomniac':
      return 'night_insomniac';
    default:
      return 'day_discussion';
  }
}

export function initOneNightWerewolfState(
  players: Player[],
  settings?: Partial<OneNightWerewolfSettings>
): OneNightWerewolfState {
  const deck = shuffle(getDefaultDeckForPlayerCount(players.length));

  const playerRoles: Record<string, RoleId> = {};
  const initialPlayerRoles: Record<string, RoleId> = {};

  players.forEach((p, idx) => {
    playerRoles[p.id] = deck[idx];
    initialPlayerRoles[p.id] = deck[idx];
  });

  const centerRoles: [RoleId, RoleId, RoleId] = [
    deck[players.length],
    deck[players.length + 1],
    deck[players.length + 2],
  ];

  const initialCenterRoles: [RoleId, RoleId, RoleId] = [...centerRoles];

  // Determine active night roles from deck
  const activeWakeRoles = NIGHT_WAKE_ORDER.filter((role) => deck.includes(role));
  const firstRole = activeWakeRoles[0] || null;
  const firstPhase = firstRole ? roleToNightPhase(firstRole) : 'day_discussion';

  return {
    phase: firstPhase,
    phaseTimeRemaining: settings?.nightSecondsPerRole ?? 10,
    deckRoles: deck,
    playerRoles,
    initialPlayerRoles,
    centerRoles,
    initialCenterRoles,
    activeNightRole: firstRole,
    nightActionLogs: [],
    inspectedCards: {},
    claimedRoles: {},
    votes: {},
    killedPlayerIds: [],
    winningTeam: null,
    winReason: '',
    readyForVotePlayerIds: [],
  };
}

export function advanceNightPhase(state: OneNightWerewolfState): OneNightWerewolfState {
  const activeWakeRoles = NIGHT_WAKE_ORDER.filter((role) => state.deckRoles.includes(role));
  const currentIdx = state.activeNightRole ? activeWakeRoles.indexOf(state.activeNightRole) : -1;

  if (currentIdx >= 0 && currentIdx < activeWakeRoles.length - 1) {
    const nextRole = activeWakeRoles[currentIdx + 1];
    return {
      ...state,
      activeNightRole: nextRole,
      phase: roleToNightPhase(nextRole),
      phaseTimeRemaining: 10,
    };
  }

  // All night roles completed -> Day Dawns
  return {
    ...state,
    activeNightRole: null,
    phase: 'day_discussion',
    phaseTimeRemaining: 300, // 5 minutes
  };
}

export function resolveOneNightVotes(state: OneNightWerewolfState): OneNightWerewolfState {
  const voteCounts: Record<string, number> = {};

  Object.values(state.votes).forEach((targetId) => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  });

  let maxVotes = 0;
  Object.values(voteCounts).forEach((c) => {
    if (c > maxVotes) maxVotes = c;
  });

  let executedIds: string[] = [];
  // Per official ONUW rules: if maxVotes is 1 (everyone voted someone different), NO ONE dies!
  if (maxVotes > 1) {
    executedIds = Object.keys(voteCounts).filter((id) => voteCounts[id] === maxVotes);
  }

  // Hunter Revenge Rule: If an executed player is the Hunter, whoever they voted for also dies!
  const additionalHunterKills: string[] = [];
  executedIds.forEach((id) => {
    if (state.playerRoles[id] === 'hunter') {
      const hunterVote = state.votes[id];
      if (hunterVote && !executedIds.includes(hunterVote)) {
        additionalHunterKills.push(hunterVote);
      }
    }
  });

  const finalKilledIds = Array.from(new Set([...executedIds, ...additionalHunterKills]));

  // Evaluate Winner
  let winningTeam: RoleTeam = 'village';
  let winReason = '';

  const killedTanner = finalKilledIds.some((id) => state.playerRoles[id] === 'tanner');
  const killedWerewolf = finalKilledIds.some((id) => state.playerRoles[id] === 'werewolf');
  const livingWerewolves = Object.keys(state.playerRoles).filter(
    (id) => state.playerRoles[id] === 'werewolf'
  );

  if (killedTanner) {
    winningTeam = 'tanner';
    winReason = 'The Tanner was executed and achieved sole victory! 💀';
  } else if (killedWerewolf) {
    winningTeam = 'village';
    winReason = 'A Werewolf was executed! Village Team wins! 🌲';
  } else if (livingWerewolves.length > 0) {
    winningTeam = 'werewolf';
    winReason = 'No Werewolves were executed! Werewolves & Minions win! 🐺';
  } else {
    // No werewolves in village (all in center)
    if (finalKilledIds.length === 0) {
      winningTeam = 'village';
      winReason = 'Peaceful village: all Werewolves were in the center and no one died! Village wins! 🕊️';
    } else {
      winningTeam = 'werewolf';
      winReason = 'All Werewolves were in the center, but the village executed an innocent villager! Village loses!';
    }
  }

  return {
    ...state,
    phase: 'reveal',
    killedPlayerIds: finalKilledIds,
    winningTeam,
    winReason,
  };
}

export function oneNightWerewolfReducer(
  state: OneNightWerewolfState,
  action: OneNightWerewolfAction,
  playerId: string
): { newState: OneNightWerewolfState; error?: string } {
  switch (action.type) {
    case 'NIGHT_DONE': {
      return { newState: advanceNightPhase(state) };
    }

    case 'NIGHT_ACTION': {
      const userInspections = state.inspectedCards[playerId] || [];

      switch (action.actionType) {
        case 'peek_center': {
          // Lone werewolf or Seer peeking center card
          const targetKey = action.targets[0]; // 'center_0' / 'center_1' / 'center_2'
          const idx = parseInt(targetKey.replace('center_', ''), 10);
          if (isNaN(idx) || idx < 0 || idx > 2) return { newState: state };

          const inspectedRole = state.centerRoles[idx];
          const newInspections = [...userInspections, { targetId: targetKey, role: inspectedRole }];

          return {
            newState: {
              ...state,
              inspectedCards: {
                ...state.inspectedCards,
                [playerId]: newInspections,
              },
              nightActionLogs: [
                ...state.nightActionLogs,
                {
                  role: state.activeNightRole || 'seer',
                  playerId,
                  description: `Viewed Center Card #${idx + 1}`,
                  targets: [targetKey],
                },
              ],
            },
          };
        }

        case 'peek_player': {
          // Seer peeking another player
          const targetPlayerId = action.targets[0];
          const targetRole = state.playerRoles[targetPlayerId];
          if (!targetRole) return { newState: state };

          const newInspections = [
            ...userInspections,
            { targetId: targetPlayerId, role: targetRole },
          ];

          return {
            newState: {
              ...state,
              inspectedCards: {
                ...state.inspectedCards,
                [playerId]: newInspections,
              },
              nightActionLogs: [
                ...state.nightActionLogs,
                {
                  role: 'seer',
                  playerId,
                  description: `Inspected another player's role`,
                  targets: [targetPlayerId],
                },
              ],
            },
          };
        }

        case 'rob_swap': {
          // Robber swaps card with target player and views new card
          const targetId = action.targets[0];
          const targetRole = state.playerRoles[targetId];
          const robberRole = state.playerRoles[playerId];
          if (!targetRole || !robberRole) return { newState: state };

          const updatedPlayerRoles = {
            ...state.playerRoles,
            [playerId]: targetRole,
            [targetId]: robberRole,
          };

          // Robber learns their new role
          const newInspections = [...userInspections, { targetId: playerId, role: targetRole }];

          return {
            newState: {
              ...state,
              playerRoles: updatedPlayerRoles,
              inspectedCards: {
                ...state.inspectedCards,
                [playerId]: newInspections,
              },
              nightActionLogs: [
                ...state.nightActionLogs,
                {
                  role: 'robber',
                  playerId,
                  description: `Robber swapped cards with a player and became ${targetRole}`,
                  targets: [targetId],
                  swapped: true,
                },
              ],
            },
          };
        }

        case 'trouble_swap': {
          // Troublemaker swaps two other players' cards without looking
          const [idA, idB] = action.targets;
          if (!idA || !idB || idA === idB) return { newState: state };
          const roleA = state.playerRoles[idA];
          const roleB = state.playerRoles[idB];
          if (!roleA || !roleB) return { newState: state };

          const updatedPlayerRoles = {
            ...state.playerRoles,
            [idA]: roleB,
            [idB]: roleA,
          };

          return {
            newState: {
              ...state,
              playerRoles: updatedPlayerRoles,
              nightActionLogs: [
                ...state.nightActionLogs,
                {
                  role: 'troublemaker',
                  playerId,
                  description: `Troublemaker swapped two players' cards in the dark`,
                  targets: [idA, idB],
                  swapped: true,
                },
              ],
            },
          };
        }

        case 'drunk_swap': {
          // Drunk swaps with 1 center card blind
          const centerKey = action.targets[0]; // 'center_0' / 'center_1' / 'center_2'
          const idx = parseInt(centerKey.replace('center_', ''), 10);
          if (isNaN(idx) || idx < 0 || idx > 2) return { newState: state };

          const drunkRole = state.playerRoles[playerId];
          const centerRole = state.centerRoles[idx];

          const updatedPlayerRoles = {
            ...state.playerRoles,
            [playerId]: centerRole,
          };

          const updatedCenterRoles = [...state.centerRoles] as [RoleId, RoleId, RoleId];
          updatedCenterRoles[idx] = drunkRole;

          return {
            newState: {
              ...state,
              playerRoles: updatedPlayerRoles,
              centerRoles: updatedCenterRoles,
              nightActionLogs: [
                ...state.nightActionLogs,
                {
                  role: 'drunk',
                  playerId,
                  description: `Drunk swapped with Center Card #${idx + 1} blind`,
                  targets: [centerKey],
                  swapped: true,
                },
              ],
            },
          };
        }

        default:
          return { newState: state };
      }
    }

    case 'CLAIM_ROLE': {
      return {
        newState: {
          ...state,
          claimedRoles: {
            ...state.claimedRoles,
            [playerId]: action.role,
          },
        },
      };
    }

    case 'READY_TO_VOTE': {
      const readyList = Array.from(new Set([...state.readyForVotePlayerIds, playerId]));
      const totalPlayers = Object.keys(state.playerRoles).length;

      if (readyList.length >= totalPlayers) {
        return {
          newState: {
            ...state,
            phase: 'voting',
            readyForVotePlayerIds: readyList,
          },
        };
      }

      return {
        newState: {
          ...state,
          readyForVotePlayerIds: readyList,
        },
      };
    }

    case 'CAST_VOTE': {
      const newVotes = {
        ...state.votes,
        [playerId]: action.targetPlayerId,
      };

      const totalPlayers = Object.keys(state.playerRoles).length;
      if (Object.keys(newVotes).length >= totalPlayers) {
        return {
          newState: resolveOneNightVotes({ ...state, votes: newVotes }),
        };
      }

      return {
        newState: {
          ...state,
          votes: newVotes,
        },
      };
    }

    case 'RESOLVE_VOTES': {
      return { newState: resolveOneNightVotes(state) };
    }

    default:
      return { newState: state };
  }
}

// Anti-Cheat State Sanitizer
export function sanitizeOneNightWerewolfState(
  state: OneNightWerewolfState,
  viewerPlayerId: string
): any {
  // If in reveal or game_over, expose full table state
  if (state.phase === 'reveal' || state.phase === 'game_over') {
    return state;
  }

  // During night and day, mask other players' current roles and center cards!
  const myInitialRole = state.initialPlayerRoles[viewerPlayerId] || 'villager';
  const myInspections = state.inspectedCards[viewerPlayerId] || [];

  return {
    ...state,
    // Mask center cards
    centerRoles: [null, null, null],
    initialCenterRoles: [null, null, null],
    // Mask other players' roles
    playerRoles: {
      [viewerPlayerId]: myInitialRole,
    },
    initialPlayerRoles: {
      [viewerPlayerId]: myInitialRole,
    },
    // Only return authorized inspections for this specific viewer
    inspectedCards: {
      [viewerPlayerId]: myInspections,
    },
    // Mask votes until resolution
    votes: {},
    nightActionLogs: [],
  };
}

// Bot Simulation Logic
export function getOneNightWerewolfBotAction(
  state: OneNightWerewolfState,
  botPlayerId: string
): OneNightWerewolfAction | null {
  const initialRole = state.initialPlayerRoles[botPlayerId];

  // 1. Night Actions
  if (state.phase.startsWith('night_') && state.activeNightRole === initialRole) {
    if (initialRole === 'seer') {
      const otherPlayers = Object.keys(state.playerRoles).filter((id) => id !== botPlayerId);
      const target = otherPlayers[0] || 'center_0';
      return {
        type: 'NIGHT_ACTION',
        actionType: 'peek_player',
        targets: [target],
      };
    }

    if (initialRole === 'robber') {
      const otherPlayers = Object.keys(state.playerRoles).filter((id) => id !== botPlayerId);
      const target = otherPlayers[0];
      if (target) {
        return {
          type: 'NIGHT_ACTION',
          actionType: 'rob_swap',
          targets: [target],
        };
      }
    }

    if (initialRole === 'troublemaker') {
      const otherPlayers = Object.keys(state.playerRoles).filter((id) => id !== botPlayerId);
      if (otherPlayers.length >= 2) {
        return {
          type: 'NIGHT_ACTION',
          actionType: 'trouble_swap',
          targets: [otherPlayers[0], otherPlayers[1]],
        };
      }
    }

    if (initialRole === 'drunk') {
      return {
        type: 'NIGHT_ACTION',
        actionType: 'drunk_swap',
        targets: ['center_0'],
      };
    }

    // Default done for werewolf/minion/mason/insomniac
    return { type: 'NIGHT_DONE' };
  }

  // 2. Voting Action
  if (state.phase === 'voting' && !state.votes[botPlayerId]) {
    const candidates = Object.keys(state.playerRoles).filter((id) => id !== botPlayerId);
    const target = candidates[Math.floor(Math.random() * candidates.length)] || botPlayerId;
    return { type: 'CAST_VOTE', targetPlayerId: target };
  }

  return null;
}
