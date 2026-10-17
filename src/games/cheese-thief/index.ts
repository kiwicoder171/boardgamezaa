import { GameDefinition, Player, Room } from '@/types/game';
import {
  CheeseThiefAction,
  CheeseThiefState,
} from './types';
import {
  cheeseThiefReducer,
  getCheeseThiefBotAction,
  initCheeseThiefState,
  sanitizeCheeseThiefState,
} from './logic';

export interface CheeseThiefSettings {
  fallMouseEnabled?: boolean;
}

export const cheeseThiefGameDefinition: GameDefinition<
  CheeseThiefState,
  CheeseThiefAction,
  CheeseThiefSettings
> = {
  id: 'cheese-thief',
  name: 'Cheese Thief',
  description:
    'A fast-paced social deduction and hidden dice game by Jolly Thinkers! Sleepyhead mice sleep under cups, while the Cheese Thief swipes the royal cheese in the dead of night.',
  minPlayers: 4,
  maxPlayers: 8,
  recommendedPlayers: '5 - 7',
  tags: ['Social Deduction', 'Hidden Dice', 'Bluffing', 'Jolly Thinkers', 'Expansion'],
  durationMinutes: '10 min',
  icon: '🧀',
  coverGradient: 'from-amber-900 via-stone-900 to-amber-950',
  rules: {
    summary:
      'Players are mice sleeping around a tavern table with a central wheel of cheese. Everyone rolls a secret wake-up die under their cup (1–6). During the night clock, mice wake at their hour. The Cheese Thief steals the cheese. Solo sleepyheads can peek under one cup! By morning, find the thief or help them escape!',
    sections: [
      {
        title: 'Hidden Dice & Cups',
        content:
          'Before night begins, every mouse rolls a secret die under their cup. The number (1 to 6) indicates which hour of the night you will wake up!',
      },
      {
        title: 'Night Heist (Hours 1 to 6)',
        content:
          'As the clock chimes from 1:00 to 6:00, mice with that die wake up. The Cheese Thief steals the cheese from the center. If a Sleepyhead wakes up completely alone, they get to peek under any one other player\'s cup!',
      },
      {
        title: 'Follower / Accomplice Mechanic',
        content:
          'If a Sleepyhead witnesses the heist (awake at the same hour as the Thief), or if the Thief recruits an accomplice at dawn, that player becomes the secret Follower and shares victory with the Thief!',
      },
      {
        title: 'The Trial & Fall Mouse Variant',
        content:
          'All mice discuss and cast votes pointing at a suspect. If the Cheese Thief receives the most votes, Sleepyheads win! If the Thief survives, the Thief & Follower win! If playing with the Fall Mouse expansion, the Fall Mouse wins alone if they get the most votes!',
      },
    ],
  },
  defaultSettings: {
    fallMouseEnabled: true,
  },
  settingsSchema: [
    {
      key: 'fallMouseEnabled',
      label: 'Fall Mouse Expansion Variant',
      type: 'boolean',
      description: 'Add the Fall Mouse rogue character who wins alone if voted out!',
      default: true,
    },
  ],

  initGame: (players: Player[], settings: CheeseThiefSettings) => {
    return initCheeseThiefState(
      players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
      })),
      settings.fallMouseEnabled ?? true
    );
  },

  handleAction: (
    state: CheeseThiefState,
    action: CheeseThiefAction,
    _playerId: string,
    _room: Room<CheeseThiefState, CheeseThiefSettings>
  ) => {
    const newState = cheeseThiefReducer(state, action);
    return { newState };
  },

  sanitizeState: (state: CheeseThiefState, playerId: string) =>
    sanitizeCheeseThiefState(state, playerId),

  checkGameOver: (state: CheeseThiefState) => {
    if (state.phase === 'game_over') {
      return {
        isOver: true,
        winner: state.winner || 'Unknown',
        summary: state.winReason || 'The mouse trial has ended!',
      };
    }
    return null;
  },

  onTimerTick: (state: CheeseThiefState) => {
    if (state.phase !== 'night' && state.phase !== 'day') {
      return { newState: state };
    }
    const nextState = cheeseThiefReducer(state, { type: 'tick_second' });
    return { newState: nextState };
  },

  getBotAction: (state: CheeseThiefState, botPlayerId: string) => {
    return getCheeseThiefBotAction(state, botPlayerId);
  },
};

export * from './types';
export * from './logic';
