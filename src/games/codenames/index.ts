import { GameDefinition, Player, Room } from '@/types/game';
import {
  CodenamesAction,
  CodenamesState,
  WordDeckTheme,
} from './types';
import {
  codenamesReducer,
  initCodenamesGame,
  sanitizeCodenamesState,
} from './logic';

export interface CodenamesSettings {
  theme: WordDeckTheme;
}

export const codenamesGameDefinition: GameDefinition<
  CodenamesState,
  CodenamesAction,
  CodenamesSettings
> = {
  id: 'codenames',
  name: 'Codenames',
  description:
    'The award-winning team deduction and word association phenomenon by Vlaada Chvátil! Spymasters give one-word clues pointing to secret agents on a 5x5 grid while avoiding the deadly Assassin.',
  minPlayers: 2,
  maxPlayers: 12,
  recommendedPlayers: '4 - 8',
  tags: [
    'Word Game',
    'Social Deduction',
    'Team vs Team',
    'Party',
    'Expansions',
  ],
  durationMinutes: '15 min',
  icon: '🕵️',
  coverGradient: 'from-rose-950 via-stone-900 to-sky-950',
  rules: {
    summary:
      'Two rival Spymasters know the secret identities of 25 agents on the grid. Their teammates only know the agents by their CODENAMES. Spymasters take turns giving one-word clues and numbers. Teammates try to guess words of the right color while avoiding the opponent\'s agents, innocent bystanders, and the Assassin!',
    sections: [
      {
        title: 'Spymaster Key Card & 5x5 Grid',
        content:
          '25 word cards are placed on a 5x5 grid. The Spymasters have access to the classified Key Card indicating 9 starting team agents, 8 opposing agents, 7 bystanders, and 1 Assassin.',
      },
      {
        title: 'Transmitting Clues',
        content:
          'On your turn, the Spymaster gives exactly ONE word and ONE number (e.g. "RIVER: 2"). The word relates to that many cards on the board.',
      },
      {
        title: 'Operatives Guessing',
        content:
          'Operatives touch words to reveal them. If correct, you may guess again (up to number + 1) or pass. If you touch an innocent bystander or opponent agent, your turn ends immediately!',
      },
      {
        title: 'The Assassin & Victory',
        content:
          'If you touch the black Assassin card, your team loses immediately! The first team to contact all their secret agents wins the mission!',
      },
    ],
  },
  defaultSettings: {
    theme: 'classic',
  },
  settingsSchema: [
    {
      key: 'theme',
      label: 'Word Deck Expansion Pack',
      type: 'select',
      description: 'Choose which themed word collection to deploy!',
      default: 'classic',
      options: [
        { label: '🏛️ Classic Agency (400 Official Words)', value: 'classic' },
        { label: '🚀 Sci-Fi Expansion Pack (Space, Cyber, Cosmos)', value: 'scifi' },
        { label: '🧚 Fairy Tales Expansion Pack (Folklore, Magic)', value: 'fairytales' },
      ],
    },
  ],

  initGame: (players: Player[], settings: CodenamesSettings) => {
    return initCodenamesGame(
      players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
      })),
      settings.theme || 'classic'
    );
  },

  handleAction: (
    state: CodenamesState,
    action: CodenamesAction,
    playerId: string,
    _room: Room<CodenamesState, CodenamesSettings>
  ) => {
    const newState = codenamesReducer(state, action, playerId);
    return { newState };
  },

  sanitizeState: (state: CodenamesState, playerId: string) => {
    return sanitizeCodenamesState(state, playerId);
  },

  checkGameOver: (state: CodenamesState) => {
    if (state.winner) {
      return {
        isOver: true,
        winner: state.winner.toUpperCase() + ' Team',
        summary: state.winReason || 'The intelligence mission has concluded!',
      };
    }
    return null;
  },
};

export * from './types';
export * from './words';
export * from './logic';
export * from './CodenamesBoard';
