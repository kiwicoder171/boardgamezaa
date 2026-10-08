import { GameDefinition, Player, Room } from '@/types/game';
import {
  ForSaleAction,
  ForSaleSettings,
  ForSaleState,
} from './types';
import {
  initForSaleState,
  forSaleReducer,
  sanitizeForSaleState,
  getForSaleBotAction,
} from './logic';

export const forSaleGameDefinition: GameDefinition<
  ForSaleState,
  ForSaleAction,
  ForSaleSettings
> = {
  id: 'for-sale',
  name: 'Bid แล้วรวย (For Sale)',
  description:
    'The premier real estate bidding game! Bid cash coins to acquire quirky properties, then flip them on the open market for lucrative cashier checks.',
  minPlayers: 3,
  maxPlayers: 6,
  recommendedPlayers: '3 - 6',
  tags: ['Strategy', 'Party', 'Auction', 'Bluffing'],
  durationMinutes: '15 - 20 min',
  icon: '🏷️',
  coverGradient: 'from-emerald-950 via-zinc-950 to-teal-950',
  rules: {
    summary:
      'Buy low in Phase 1, sell high in Phase 2! Outbid rivals to snatch prime real estate, then bluff and time your market entries to collect the largest cashier checks. The richest player at the end wins!',
    sections: [
      {
        title: 'Phase 1: Real Estate Auction (ประมูลอสังหาริมทรัพย์)',
        content:
          'In each round, property cards are revealed in ascending order. Players take turns raising the bid or passing. When you pass, you take the lowest-ranked property on the table and get half your bid refunded (rounded down). The last standing player takes the highest property and pays 100% of their bid.',
      },
      {
        title: 'Phase 2: Selling for Checks (ขายบ้านรับเช็คเงินสด)',
        content:
          'Once all houses are bought, cashier checks ($0k up to $15k) are placed on the table. Every player secretly chooses 1 property card from their hand. Cards are revealed simultaneously: the highest property wins the highest check, and the lowest property gets the lowest check!',
      },
      {
        title: 'Winning Condition (เงื่อนไขชัยชนะ)',
        content:
          'Combine all check values with any remaining liquid cash coins in your wallet. The player with the highest total net worth wins the game! Ties are broken by remaining cash coins.',
      },
    ],
  },
  defaultSettings: {
    turnTimerSeconds: 30,
  },
  settingsSchema: [
    {
      key: 'turnTimerSeconds',
      label: 'Turn Timer (Seconds)',
      description: 'Maximum time per player action in seconds',
      type: 'number',
      default: 30,
      min: 15,
      max: 60,
      step: 5,
    },
  ],

  initGame: (players: Player[], settings: ForSaleSettings) => {
    return initForSaleState(players, settings);
  },

  handleAction: (
    state: ForSaleState,
    action: ForSaleAction,
    _playerId: string,
    _room: Room<ForSaleState, ForSaleSettings>
  ) => {
    const newState = forSaleReducer(state, action);
    return { newState };
  },

  sanitizeState: (state: ForSaleState, playerId: string) => {
    return sanitizeForSaleState(state, playerId);
  },

  getBotAction: (state: ForSaleState, botPlayerId: string) => {
    return getForSaleBotAction(state, botPlayerId);
  },

  checkGameOver: (state: ForSaleState) => {
    if (state.phase === 'game_over') {
      const winner = state.winnerId
        ? `Player ${state.winnerId}`
        : 'Auction Champ';
      return {
        isOver: true,
        winner,
        summary: 'All properties and cashier checks have been distributed!',
      };
    }
    return null;
  },
};

export * from './types';
export * from './cards';
export * from './logic';
export { default as ForSaleBoard } from './ForSaleBoard';
