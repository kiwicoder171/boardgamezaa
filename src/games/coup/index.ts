import { GameDefinition, Player, Room } from '@/types/game';
import {
  CoupAction,
  CoupSettings,
  CoupState,
} from './types';
import {
  initCoupState,
  handleCoupAction,
  sanitizeCoupState,
  getCoupBotAction,
} from './logic';

export const coupGameDefinition: GameDefinition<
  CoupState,
  CoupAction,
  CoupSettings
> = {
  id: 'coup',
  name: 'Coup (โค่นอำนาจ)',
  description:
    'The premier political bluffing & deduction game! Claim court roles, assassinate rivals, bluff without fear, and call out liars to be the last survivor standing.',
  minPlayers: 2,
  maxPlayers: 6,
  recommendedPlayers: '3 - 5',
  tags: ['Bluffing', 'Social Deduction', 'Strategy', 'Party'],
  durationMinutes: '10 - 15 min',
  icon: '👑',
  coverGradient: 'from-purple-950 via-zinc-950 to-rose-950',
  rules: {
    summary:
      'Each player starts with 2 secret influence cards and 2 coins. On your turn, declare any action—even if you do not hold the required card! But beware: any player can challenge your bluff. If caught, you lose a card. The last player with influence wins!',
    sections: [
      {
        title: 'Actions & Roles (การกระทำและบทบาท)',
        content:
          'General: Income (+1 coin), Foreign Aid (+2 coins), Coup (Pay 7 coins to kill 1 influence). Role Claims: Duke (Tax +3 coins), Assassin (Pay 3 coins to assassinate), Captain (Steal 2 coins), Ambassador (Exchange 2 cards).',
      },
      {
        title: 'Counteractions / Blocks (การสกัดกั้น)',
        content:
          'Duke blocks Foreign Aid. Contessa blocks Assassination. Captain or Ambassador blocks Stealing. Counteractions can also be bluffed and challenged!',
      },
      {
        title: 'Challenges & Assassination (การท้าทาย)',
        content:
          'If challenged, truth-tellers prove their card, shuffle it away for a new one, and the challenger loses 1 card. Liars lose 1 card and their action is canceled! If an assassination is challenged and verified, the target suffers a double kill!',
      },
      {
        title: 'Mandatory Coup (กฎบังคับทำรัฐประหาร)',
        content:
          'If you start your turn with 10 or more coins, you MUST declare a Coup against an opponent.',
      },
    ],
  },
  defaultSettings: {
    reactionSeconds: 12,
  },
  settingsSchema: [
    {
      key: 'reactionSeconds',
      label: 'Reaction Timer (Seconds)',
      description: 'Time given to challenge or block an action',
      type: 'number',
      default: 12,
      min: 8,
      max: 20,
      step: 2,
    },
  ],

  initGame: (players: Player[], settings: CoupSettings) => {
    return initCoupState(players, settings);
  },

  handleAction: (
    state: CoupState,
    action: CoupAction,
    playerId: string,
    room: Room<CoupState, CoupSettings>
  ) => {
    const { newState, error } = handleCoupAction(state, action, playerId, room);
    return { newState, error };
  },

  sanitizeState: (state: CoupState, playerId: string) => {
    return sanitizeCoupState(state, playerId);
  },

  getBotAction: (state: CoupState, botPlayerId: string) => {
    return getCoupBotAction(state, botPlayerId);
  },

  checkGameOver: (state: CoupState) => {
    if (state.phase === 'game_over') {
      const winner = state.winnerId ? `Player ${state.winnerId}` : 'Coup Master';
      return {
        isOver: true,
        winner,
        summary: 'All rivals have lost their court influence!',
      };
    }
    return null;
  },
};

export * from './types';
export * from './cards';
export * from './logic';
export { default as CoupBoard } from './CoupBoard';
