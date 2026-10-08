import { GameDefinition, Player, Room } from '@/types/game';
import { WerewolfState, WerewolfAction, WerewolfSettings } from './types';
import { initWerewolfGame, handleWerewolfAction, sanitizeWerewolfState } from './logic';

export const werewolfGameDefinition: GameDefinition<
  WerewolfState,
  WerewolfAction,
  WerewolfSettings
> = {
  id: 'werewolf',
  name: 'Ultimate Werewolf',
  description:
    'The quintessential social deduction party classic! Deceive, inspect, protect, and survive in a village besieged by Werewolves under a full moon.',
  minPlayers: 4,
  maxPlayers: 18,
  recommendedPlayers: '5 - 12',
  tags: ['Social Deduction', 'Hidden Roles', 'Bluffing', 'Party', 'Expansions'],
  durationMinutes: '15 min',
  icon: '🐺',
  coverGradient: 'from-slate-900 via-indigo-950 to-purple-950',
  rules: {
    summary:
      'Players are secretly assigned roles on either the Villager team or the Werewolf team (plus neutral wildcards like the Tanner). Each night, special roles wake up in secret to hunt, inspect, protect, or brew potions. By day, the village debates and votes to execute a suspect!',
    sections: [
      {
        title: 'Night Phase Sequence',
        content:
          'When night falls, players close their eyes. The automated moderator awakens special roles in order: Cupid binds lovers, Werewolves pick a victim, the Seer inspects an alignment, the Bodyguard protects a villager, and the Witch brews potions.',
      },
      {
        title: 'Day Phase: Discussion & Trials',
        content:
          'At dawn, night casualties are announced. Villagers debate who among them might be lying. Players cast votes at the town podium, and the most voted player is executed.',
      },
      {
        title: 'Special Expansion Roles',
        content:
          'Includes Seer, Bodyguard, Witch (Heal/Poison), Hunter (dies shooting revenge arrow), Tanner (wins if executed!), Minion, Cupid, Masons, and more!',
      },
      {
        title: 'Victory Conditions',
        content:
          'Villagers win by eliminating all Werewolves. Werewolves win by equaling or outnumbering living Villagers. The Tanner wins alone if the village votes to execute them!',
      },
    ],
  },
  defaultSettings: {
    expansionPacks: 'all_roles',
    discussionSeconds: 120,
  },
  settingsSchema: [
    {
      key: 'expansionPacks',
      label: 'Role Expansion Pack',
      type: 'select',
      description: 'Choose which role collection to include in the deck!',
      default: 'all_roles',
      options: [
        { label: '🌟 All Expansion Roles (Seer, Witch, Hunter, Tanner, Bodyguard)', value: 'all_roles' },
        { label: '🌲 Standard Village (Werewolves, Seer, Bodyguard, Villagers)', value: 'standard' },
      ],
    },
  ],

  initGame: (players: Player[], settings: WerewolfSettings) =>
    initWerewolfGame(players, settings),

  handleAction: (
    state: WerewolfState,
    action: WerewolfAction,
    _playerId: string,
    _room: Room<WerewolfState, WerewolfSettings>
  ) => {
    const newState = handleWerewolfAction(state, action);
    return { newState };
  },

  sanitizeState: (state: WerewolfState, playerId: string) =>
    sanitizeWerewolfState(state, playerId),

  checkGameOver: (state: WerewolfState) => {
    if (state.phase === 'game_over') {
      return {
        isOver: true,
        winner: state.winner || 'Unknown',
        summary: state.winSummary || 'The trial has ended!',
      };
    }
    return null;
  },
};
