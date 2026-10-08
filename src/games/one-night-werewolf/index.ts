import { GameDefinition, Player, Room } from '@/types/game';
import {
  OneNightWerewolfAction,
  OneNightWerewolfSettings,
  OneNightWerewolfState,
} from './types';
import {
  initOneNightWerewolfState,
  oneNightWerewolfReducer,
  sanitizeOneNightWerewolfState,
  getOneNightWerewolfBotAction,
  advanceNightPhase,
  resolveOneNightVotes,
} from './logic';

export const oneNightWerewolfGameDefinition: GameDefinition<
  OneNightWerewolfState,
  OneNightWerewolfAction,
  OneNightWerewolfSettings
> = {
  id: 'one-night-werewolf',
  name: 'One Night Werewolf',
  description:
    'The legendary lightning-fast social deduction game! One single night, secret card swaps, zero player elimination, and a single dramatic vote.',
  minPlayers: 3,
  maxPlayers: 10,
  recommendedPlayers: '4 - 8',
  tags: ['Social Deduction', 'Bluffing', 'Secret Roles', 'Party'],
  durationMinutes: '5 - 10 min',
  icon: '🐺',
  coverGradient: 'from-indigo-950 via-zinc-950 to-purple-950',
  rules: {
    summary:
      'The entire village falls asleep for one single night! Roles wake up in secret to inspect, rob, and swap cards. In the morning, everyone debates who the Werewolves are without knowing for sure if their own card was changed. One vote decides the fate of the entire village!',
    sections: [
      {
        title: 'Only One Night & The 3 Center Cards',
        content:
          'Unlike traditional werewolf, there is only one night and NO player is eliminated in the dark. The table always includes 3 face-down Center Cards.',
      },
      {
        title: 'Night Call Sequence',
        content:
          'Special roles wake up in numerical order: Werewolves find packmates (lone wolf peeks 1 center card), Seer views 1 player card or 2 center cards, Robber swaps and peeks, Troublemaker swaps two others blind, and Drunk swaps with a center card blind.',
      },
      {
        title: 'The Day Debate',
        content:
          'At dawn, players wake up. Nobody is allowed to touch their card! Reconstruct the night through clever questioning, role claims, and bluffs.',
      },
      {
        title: 'The Trial Vote',
        content:
          'When time expires, all players point simultaneously. The player with the most votes dies (ties mean all tied players die). If at least 1 Werewolf dies, Village wins! If no Werewolf dies, Werewolves win! If the Tanner dies, the Tanner wins alone!',
      },
    ],
  },
  defaultSettings: {
    discussionMinutes: 5,
    nightSecondsPerRole: 10,
    selectedRoles: [],
  },
  settingsSchema: [
    {
      key: 'discussionMinutes',
      label: 'Day Discussion Timer (Minutes)',
      type: 'number',
      description: 'How many minutes the village has to debate before casting votes.',
      default: 5,
      min: 2,
      max: 10,
      step: 1,
    },
  ],

  initGame: (players: Player[], settings: OneNightWerewolfSettings) => {
    return initOneNightWerewolfState(players, settings);
  },

  handleAction: (
    state: OneNightWerewolfState,
    action: OneNightWerewolfAction,
    playerId: string,
    _room: Room<OneNightWerewolfState, OneNightWerewolfSettings>
  ) => {
    const { newState, error } = oneNightWerewolfReducer(state, action, playerId);
    return { newState, error };
  },

  sanitizeState: (state: OneNightWerewolfState, playerId: string) => {
    return sanitizeOneNightWerewolfState(state, playerId);
  },

  getBotAction: (state: OneNightWerewolfState, botPlayerId: string) => {
    return getOneNightWerewolfBotAction(state, botPlayerId);
  },

  onTimerTick: (state: OneNightWerewolfState) => {
    if (state.phase === 'reveal' || state.phase === 'game_over') {
      return { newState: state };
    }

    const remaining = state.phaseTimeRemaining - 1;
    if (remaining <= 0) {
      if (state.phase.startsWith('night_')) {
        return { newState: advanceNightPhase(state) };
      }
      if (state.phase === 'day_discussion') {
        return {
          newState: {
            ...state,
            phase: 'voting',
            phaseTimeRemaining: 20,
          },
        };
      }
      if (state.phase === 'voting') {
        return { newState: resolveOneNightVotes(state) };
      }
    }

    return {
      newState: {
        ...state,
        phaseTimeRemaining: remaining,
      },
    };
  },

  checkGameOver: (state: OneNightWerewolfState) => {
    if (state.phase === 'reveal') {
      return {
        isOver: true,
        winner:
          state.winningTeam === 'village'
            ? 'Village Team'
            : state.winningTeam === 'tanner'
            ? 'Tanner'
            : 'Werewolf Team',
        summary: state.winReason,
      };
    }
    return null;
  },
};

export * from './types';
export * from './roles';
export * from './logic';
