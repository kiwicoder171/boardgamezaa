import { GameDefinition, Player, Room } from '@/types/game';
import {
  CatanAction,
  CatanSettings,
  CatanState,
} from './types';
import {
  catanReducer,
  getBotAction,
  initCatanGame,
} from './logic';

export const catanGameDefinition: GameDefinition<
  CatanState,
  CatanAction,
  CatanSettings
> = {
  id: 'catan',
  name: 'Catan',
  description:
    'The premier island settlement & trading classic! Harvest wheat, wood, brick, wool, and ore. Build sprawling roads and thriving cities, negotiate trades, outsmart the robber, and race to 10 Victory Points.',
  minPlayers: 2,
  maxPlayers: 4,
  recommendedPlayers: '3 - 4',
  tags: [
    'Strategy',
    'Trading & Negotiation',
    'Resource Management',
    'Dice Rolling',
    'Board Game Classic',
  ],
  durationMinutes: '45 - 60 min',
  icon: '🏝️',
  coverGradient: 'from-amber-950 via-slate-900 to-emerald-950',
  rules: {
    summary:
      'Players explore and settle the island of Catan. Roll dice each turn to harvest resources (Lumber, Brick, Wool, Grain, Ore) based on hexagonal terrain numbers. Trade with rivals or coastal harbors, build roads, settlements, and cities, and compete for Longest Road and Largest Army. First to 10 Victory Points wins!',
    sections: [
      {
        title: 'Initial Setup (Snake Draft)',
        content:
          'In Round 1, each player places 1 settlement and 1 adjoining road. In Round 2 (reverse order), each player places a 2nd settlement and road, and immediately collects starting resources from the adjacent terrain tiles!',
      },
      {
        title: 'The Distance Rule',
        content:
          'Settlements can only be built at intersections where NO other settlement or city exists on any directly adjacent intersection (must be at least 2 road edges away from any building).',
      },
      {
        title: 'Dice Roll & Harvest (Rolling 7)',
        content:
          'On your turn, roll two dice. Tiles matching the roll yield 1 resource per settlement and 2 per city to touching players. If 7 is rolled: players with more than 7 cards must discard half. The active player moves the Robber to block a tile and steals 1 resource card from a resident.',
      },
      {
        title: 'Building Costs',
        content:
          'Road: 1 Wood + 1 Brick | Settlement (1 VP): 1 Wood + 1 Brick + 1 Wool + 1 Grain | City (2 VP): 2 Grain + 3 Ore | Development Card: 1 Wool + 1 Grain + 1 Ore.',
      },
      {
        title: 'Victory Conditions',
        content:
          'First player to reach 10 Victory Points on their turn wins. Points come from Settlements (1 VP), Cities (2 VP), Longest Road (2 VP for 5+ roads), Largest Army (2 VP for 3+ knights), and Secret VP Cards.',
      },
    ],
  },
  defaultSettings: {
    targetVictoryPoints: 10,
    boardLayout: 'standard',
    enableDomesticTrading: true,
  },
  settingsSchema: [
    {
      key: 'targetVictoryPoints',
      label: 'Target Victory Points',
      type: 'number',
      min: 8,
      max: 14,
      step: 1,
      default: 10,
      description: 'Points required to conquer Catan (Standard: 10 VP)',
    },
    {
      key: 'boardLayout',
      label: 'Island Layout Generation',
      type: 'select',
      default: 'standard',
      options: [
        { label: '🗺️ Standard Beginner Island (Balanced & Fixed)', value: 'standard' },
        { label: '🎲 Procedural Random Island (Shuffled hexes & chits)', value: 'random' },
      ],
      description: 'Choose fixed beginner setup or randomized island layout.',
    },
  ],

  initGame: (players: Player[], settings: CatanSettings) => {
    return initCatanGame(
      players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
      })),
      settings
    );
  },

  handleAction: (
    state: CatanState,
    action: CatanAction,
    playerId: string,
    _room: Room<CatanState, CatanSettings>
  ) => {
    return catanReducer(state, action, playerId);
  },

  sanitizeState: (state: CatanState, playerId: string) => {
    // Hide deck order
    const sanitizedDeck = state.devCardDeck.map(() => 'knight' as any);
    
    // Hide secret VP cards of other players
    const sanitizedPlayers = { ...state.players };
    for (const [pid, p] of Object.entries(sanitizedPlayers)) {
      if (pid !== playerId) {
        sanitizedPlayers[pid] = {
          ...p,
          devCards: p.devCards.map((c) => (c === 'victory_point' ? ('secret_vp' as any) : c)),
        };
      }
    }

    return {
      ...state,
      devCardDeck: sanitizedDeck,
      players: sanitizedPlayers,
    };
  },

  checkGameOver: (state: CatanState) => {
    if (state.phase === 'game_over' && state.winner) {
      return {
        isOver: true,
        winner: state.winner,
        summary: `👑 ${state.winnerName} conquered Catan with ${
          state.players[state.winner]?.victoryPoints || 10
        } Victory Points!`,
      };
    }
    return null;
  },

  getBotAction: (state: CatanState, botPlayerId: string) => {
    return getBotAction(state, botPlayerId);
  },
};

export * from './types';
export * from './boardData';
export * from './logic';
