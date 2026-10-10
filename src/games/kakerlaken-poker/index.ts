import { GameDefinition, Player, Room } from '@/types/game';
import {
  KakerlakenPokerAction,
  KakerlakenPokerSettings,
  KakerlakenPokerState,
} from './types';
import {
  initKakerlakenPokerState,
  handleKakerlakenPokerAction,
  sanitizeKakerlakenPokerState,
  getKakerlakenPokerBotAction,
} from './logic';

export const kakerlakenPokerGameDefinition: GameDefinition<
  KakerlakenPokerState,
  KakerlakenPokerAction,
  KakerlakenPokerSettings
> = {
  id: 'kakerlaken-poker',
  name: 'Kakerlaken Poker (โป๊กเกอร์แมลงสาบ)',
  description:
    'The legendary reverse-bluffing party game! Slide creepy critters across the table with a straight face. Catch liars, bluff your rivals, and avoid collecting 4 of a kind—because there is only ONE loser!',
  minPlayers: 2,
  maxPlayers: 6,
  recommendedPlayers: '3 - 6',
  tags: ['Bluffing', 'Party', 'Humor', 'Deduction'],
  durationMinutes: '15 - 25 min',
  icon: '🪳',
  coverGradient: 'from-amber-950 via-stone-900 to-emerald-950',
  rules: {
    summary:
      'Slide a card face-down to a rival and claim what creature it is. The receiver can guess if you are telling the truth or lying, or secretly peek and pass it to someone else! Whoever collects 4 cards of the same creature (or runs out of cards to offer) LOSES the game!',
    sections: [
      {
        title: 'The Goal (เป้าหมายของเกม)',
        content:
          'Unlike other games where one person wins, Kakerlaken Poker has only ONE LOSER! When any player collects 4 of the same creature face-up in front of them, or runs out of cards when it is their turn to offer, that player immediately LOSES and everyone else wins!',
      },
      {
        title: 'Offering a Card (การส่งการ์ด)',
        content:
          'On your turn, slide 1 card face-down from your hand to another player and make a claim: "This is a [Creature]!" You can tell the truth or bluff with a poker face.',
      },
      {
        title: 'Receiver Choice A: Guess True or False (ทายจริง/โกหก)',
        content:
          'Declare "True" or "False", then flip the card! If you guessed correctly, the sender takes the card face-up in their display. If you guessed wrong, you must take the card face-up!',
      },
      {
        title: 'Receiver Choice B: Peek & Pass (แอบดูแล้วส่งต่อ)',
        content:
          'Secretly peek at the card, then pass it to another player who hasn’t seen it yet this round, making your own claim (same or different creature). If everyone else has already seen it, the last player MUST guess!',
      },
      {
        title: 'End of Round (เริ่มรอบใหม่)',
        content:
          'Whoever took the card starts the next round by offering a new card from their hand. If they have no cards left in hand to start, they immediately LOSE!',
      },
    ],
  },
  defaultSettings: {
    turnTimerSeconds: 30,
    menagerieVariant: false,
  },
  settingsSchema: [
    {
      key: 'turnTimerSeconds',
      label: 'Decision Timer (Seconds)',
      description: 'Seconds allowed for deciding whether to guess or pass',
      type: 'number',
      default: 30,
      min: 15,
      max: 60,
      step: 5,
    },
    {
      key: 'menagerieVariant',
      label: 'Menagerie Variant (กฎสวนสัตว์ 8 ชนิด)',
      description: 'A player also loses if they collect 1 of all 8 different creature species',
      type: 'boolean',
      default: false,
    },
  ],

  initGame: (players: Player[], settings: KakerlakenPokerSettings) => {
    return initKakerlakenPokerState(players, settings);
  },

  handleAction: (
    state: KakerlakenPokerState,
    action: KakerlakenPokerAction,
    playerId: string,
    room: Room<KakerlakenPokerState, KakerlakenPokerSettings>
  ) => {
    const { newState, error, events } = handleKakerlakenPokerAction(
      state,
      action,
      playerId,
      room
    );
    return { newState, error, events };
  },

  sanitizeState: (state: KakerlakenPokerState, playerId: string) => {
    return sanitizeKakerlakenPokerState(state, playerId);
  },

  getBotAction: (state: KakerlakenPokerState, botPlayerId: string) => {
    return getKakerlakenPokerBotAction(state, botPlayerId, []);
  },

  checkGameOver: (state: KakerlakenPokerState) => {
    if (state.phase === 'game_over') {
      return {
        isOver: true,
        winner: state.loserPlayerId ? `Everyone except loser` : 'Game Over',
        summary:
          state.lossReason === 'four_of_a_kind'
            ? 'A player collected 4 of the same creature and lost!'
            : state.lossReason === 'all_eight_species'
            ? 'A player collected all 8 creature species and lost!'
            : 'A player ran out of cards to offer and lost!',
      };
    }
    return null;
  },
};

export * from './types';
export * from './logic';
export { default as KakerlakenPokerBoard } from './KakerlakenPokerBoard';
