import { GameDefinition, Player, Room } from '@/types/game';
import {
  SplendorAction,
  SplendorExpansion,
  SplendorState,
} from './types';
import {
  initSplendorGame,
  splendorReducer,
} from './logic';

export interface SplendorSettings {
  expansion: SplendorExpansion;
}

export const splendorGameDefinition: GameDefinition<
  SplendorState,
  SplendorAction,
  SplendorSettings
> = {
  id: 'splendor',
  name: 'Splendor',
  description:
    'The premier Renaissance gem merchant engine-building masterpiece! Collect precious clay chip gems, acquire mines and caravans, win the favor of historic nobles, or explore Cities of Splendor.',
  minPlayers: 2,
  maxPlayers: 4,
  recommendedPlayers: '2 - 4',
  tags: [
    'Engine Building',
    'Strategy',
    'Resource Management',
    'Card Drafting',
    'Cities of Splendor',
  ],
  durationMinutes: '25 min',
  icon: '💎',
  coverGradient: 'from-emerald-950 via-stone-900 to-amber-950',
  rules: {
    summary:
      'Players are Renaissance merchants competing to build the most prestigious jewelry business. Collect gem tokens, purchase development cards for permanent discounts, reserve cards for gold jokers, and attract noble patrons. First to 15 prestige points triggers the final round!',
    sections: [
      {
        title: 'Core Turn Actions (Choose 1)',
        content:
          'On your turn, you must take 1 action: 1) Take 3 gem tokens of different colors; 2) Take 2 gem tokens of the same color (if pile has >= 4); 3) Reserve 1 development card into your hand (+1 Gold Joker token, max 3 in hand); or 4) Purchase 1 face-up or reserved development card.',
      },
      {
        title: 'Permanent Gem Discounts',
        content:
          'Each development card you purchase provides a permanent gem discount of that color on all future card purchases! Build an efficient engine to buy high-tier cards for free.',
      },
      {
        title: 'Noble Patrons & City Tiles',
        content:
          'At the end of your turn, if your owned card discounts fulfill a Noble\'s requirements, that Noble visits you, granting 3 Prestige Points! In "The Cities" expansion, claiming 1 City tile triggers the win condition.',
      },
      {
        title: 'End of Game',
        content:
          'Reaching 15 prestige points triggers the final round so all players complete an equal number of turns. The merchant with the most prestige points wins!',
      },
    ],
  },
  defaultSettings: {
    expansion: 'none',
  },
  settingsSchema: [
    {
      key: 'expansion',
      label: 'Cities of Splendor Expansion Pack',
      type: 'select',
      description: 'Choose which official expansion module to play with!',
      default: 'none',
      options: [
        { label: '🏛️ Base Game (Noble Patrons & 15 VP Race)', value: 'none' },
        { label: '🏰 The Cities Module (City Objectives replace Nobles)', value: 'cities' },
        { label: '🏮 The Orient Module (3 Orient Decks with Double Gems)', value: 'orient' },
      ],
    },
  ],

  initGame: (players: Player[], settings: SplendorSettings) => {
    return initSplendorGame(
      players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
      })),
      settings.expansion || 'none'
    );
  },

  handleAction: (
    state: SplendorState,
    action: SplendorAction,
    playerId: string,
    _room: Room<SplendorState, SplendorSettings>
  ) => {
    const newState = splendorReducer(state, action, playerId);
    return { newState };
  },

  sanitizeState: (state: SplendorState, _playerId: string) => {
    // Hide deck internal ordering to prevent peeking next card
    return {
      ...state,
      decks: {
        1: state.decks[1].map(() => ({} as any)),
        2: state.decks[2].map(() => ({} as any)),
        3: state.decks[3].map(() => ({} as any)),
      },
      orientDecks: state.orientDecks
        ? {
            1: state.orientDecks[1].map(() => ({} as any)),
            2: state.orientDecks[2].map(() => ({} as any)),
            3: state.orientDecks[3].map(() => ({} as any)),
          }
        : undefined,
    };
  },

  checkGameOver: (state: SplendorState) => {
    if (state.phase === 'game_over') {
      return {
        isOver: true,
        winner: state.winner || 'Unknown',
        summary: state.winReason || 'The Renaissance gem market has closed!',
      };
    }
    return null;
  },
};

export * from './types';
export * from './cards';
export * from './logic';
