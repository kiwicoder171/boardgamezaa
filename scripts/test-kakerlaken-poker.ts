import { Player, Room } from '../src/types/game';
import {
  initKakerlakenPokerState,
  handleKakerlakenPokerAction,
  sanitizeKakerlakenPokerState,
  createDeck,
} from '../src/games/kakerlaken-poker/logic';
import {
  KakerlakenPokerState,
  KakerlakenPokerSettings,
  CreatureType,
} from '../src/games/kakerlaken-poker/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

const mockPlayers: Player[] = [
  { id: 'p1', name: 'Alice', avatar: '🐱', socketId: 's1', isHost: true, isReady: true, connected: true },
  { id: 'p2', name: 'Bob', avatar: '🐶', socketId: 's2', isHost: false, isReady: true, connected: true },
  { id: 'p3', name: 'Charlie', avatar: '🦊', socketId: 's3', isHost: false, isReady: true, connected: true },
  { id: 'p4', name: 'Diana', avatar: '🐼', socketId: 's4', isHost: false, isReady: true, connected: true },
];

const mockRoom: Room<KakerlakenPokerState, KakerlakenPokerSettings> = {
  code: 'POKER1',
  hostId: 'p1',
  players: mockPlayers,
  selectedGameId: 'kakerlaken-poker',
  status: 'playing',
  gameSettings: { turnTimerSeconds: 30, menagerieVariant: false },
  gameState: null,
  chatMessages: [],
  createdAt: Date.now(),
  lastActivity: Date.now(),
};

console.log('🧪 Starting Kakerlaken Poker Test Suite...\n');

// 1. Deck & Initialization Test
const deck = createDeck();
assert(deck.length === 64, 'Deck must contain exactly 64 cards');
const counts: Record<string, number> = {};
deck.forEach((c) => (counts[c.creature] = (counts[c.creature] || 0) + 1));
assert(Object.keys(counts).length === 8, 'Deck must contain all 8 creature types');
Object.entries(counts).forEach(([creature, count]) => {
  assert(count === 8, `Creature ${creature} must have exactly 8 copies`);
});

const initialState = initKakerlakenPokerState(mockPlayers);
assert(initialState.phase === 'offering', 'Initial phase must be offering');
assert(
  initialState.hands['p1'].length === 16 &&
  initialState.hands['p2'].length === 16 &&
  initialState.hands['p3'].length === 16 &&
  initialState.hands['p4'].length === 16,
  'Each player in a 4-player game must receive exactly 16 cards'
);

// 1.1 Two-Player Deal Test (Official rule: remove 10 cards, 27 each)
const twoPlayersState = initKakerlakenPokerState([mockPlayers[0], mockPlayers[1]]);
assert(
  twoPlayersState.hands['p1'].length === 27 && twoPlayersState.hands['p2'].length === 27,
  'In a 2-player game, exactly 10 cards are removed and each player receives 27 cards'
);

// 2. Offer Card Action Test
const firstPlayerId = initialState.currentTurnPlayerId;
const targetPlayerId = mockPlayers.find((p) => p.id !== firstPlayerId)!.id;
const offeredCard = initialState.hands[firstPlayerId][0];

const offerRes = handleKakerlakenPokerAction(
  initialState,
  {
    type: 'OFFER_CARD',
    cardId: offeredCard.id,
    targetPlayerId,
    declaredCreature: 'cockroach',
  },
  firstPlayerId,
  mockRoom
);

assert(!offerRes.error, 'Offering card should succeed without error');
assert(offerRes.newState.phase === 'deciding', 'Phase must transition to deciding');
assert(offerRes.newState.activeCard !== null, 'Active card must be present');
assert(
  offerRes.newState.activeCard!.currentReceiverId === targetPlayerId,
  'Current receiver must be the target player'
);
assert(
  offerRes.newState.hands[firstPlayerId].length === 15,
  'Sender hand count must decrease by 1'
);

// 3. State Sanitization Test
const sanitizedForReceiver = sanitizeKakerlakenPokerState(
  offerRes.newState,
  targetPlayerId
);
assert(
  sanitizedForReceiver.activeCard?.card === null,
  'Receiver must NOT see the real card identity before guessing or peeking!'
);

const sanitizedForSender = sanitizeKakerlakenPokerState(
  offerRes.newState,
  firstPlayerId
);
assert(
  sanitizedForSender.activeCard?.card !== null,
  'Sender who slid the card CAN see the real card identity!'
);

// 4. Peek and Pass Test
const thirdPlayerId = mockPlayers.find(
  (p) => p.id !== firstPlayerId && p.id !== targetPlayerId
)!.id;

const passRes = handleKakerlakenPokerAction(
  offerRes.newState,
  {
    type: 'PEEK_AND_PASS',
    targetPlayerId: thirdPlayerId,
    declaredCreature: 'toad',
  },
  targetPlayerId,
  mockRoom
);

assert(!passRes.error, 'Peek and Pass must succeed');
assert(
  passRes.newState.activeCard!.currentSenderId === targetPlayerId,
  'Current sender is now the second player'
);
assert(
  passRes.newState.activeCard!.currentReceiverId === thirdPlayerId,
  'Current receiver is now the third player'
);
assert(
  passRes.newState.activeCard!.declaredCreature === 'toad',
  'Declared creature updated to toad'
);
assert(
  passRes.newState.activeCard!.seenByPlayerIds.includes(targetPlayerId),
  'Second player is now marked as having seen the card'
);

// Cannot pass back to original sender
const invalidPassRes = handleKakerlakenPokerAction(
  passRes.newState,
  {
    type: 'PEEK_AND_PASS',
    targetPlayerId: firstPlayerId,
    declaredCreature: 'rat',
  },
  thirdPlayerId,
  mockRoom
);
assert(
  Boolean(invalidPassRes.error),
  'Cannot pass card back to original sender who already held it'
);

// 5. Guess & Resolution Test
const guessRes = handleKakerlakenPokerAction(
  passRes.newState,
  {
    type: 'GUESS',
    guess: 'false',
  },
  thirdPlayerId,
  mockRoom
);

assert(!guessRes.error, 'Guess action must succeed');
assert(guessRes.newState.phase === 'resolution', 'Phase must transition to resolution');
assert(guessRes.newState.lastResolution !== null, 'Last resolution record must exist');

const recipientId = guessRes.newState.lastResolution!.recipientId;
assert(
  guessRes.newState.tableaus[recipientId].length === 1,
  'Recipient tableau must have received the penalty card'
);

// 6. Loss Condition: 4 of a kind test
const fourOfAKindState: KakerlakenPokerState = JSON.parse(JSON.stringify(guessRes.newState));
fourOfAKindState.phase = 'deciding';
fourOfAKindState.tableaus['p2'] = [
  { id: 'c1', creature: 'bat' },
  { id: 'c2', creature: 'bat' },
  { id: 'c3', creature: 'bat' },
];
fourOfAKindState.activeCard = {
  card: { id: 'c4', creature: 'bat' },
  originalSenderId: 'p1',
  currentSenderId: 'p1',
  currentReceiverId: 'p2',
  declaredCreature: 'bat',
  seenByPlayerIds: ['p1'],
};

// p2 incorrectly guesses 'false' (it is actually a bat) -> p2 must take the 4th bat!
const fatalGuessRes = handleKakerlakenPokerAction(
  fourOfAKindState,
  {
    type: 'GUESS',
    guess: 'false',
  },
  'p2',
  mockRoom
);

assert(
  fatalGuessRes.newState.phase === 'game_over',
  'Game must immediately end when a player collects 4 of a kind'
);
assert(
  fatalGuessRes.newState.loserPlayerId === 'p2',
  'Player 2 must be recorded as the lone loser'
);
assert(
  fatalGuessRes.newState.lossReason === 'four_of_a_kind',
  'Loss reason must be four_of_a_kind'
);

// 7. Loss Condition: Empty Hand when starting turn
const emptyHandState: KakerlakenPokerState = JSON.parse(JSON.stringify(guessRes.newState));
emptyHandState.phase = 'deciding';
emptyHandState.hands['p1'] = []; // p1 has 0 cards
emptyHandState.activeCard = {
  card: { id: 'c99', creature: 'spider' },
  originalSenderId: 'p2',
  currentSenderId: 'p2',
  currentReceiverId: 'p1',
  declaredCreature: 'cockroach',
  seenByPlayerIds: ['p2'],
};

// p1 guesses 'false' correctly! p2 has to take the card. But what if p1 guessed wrong and took the card?
// If p1 guesses 'true' (wrong, it's spider), p1 takes the card and must start next turn with 0 cards:
const emptyHandGuessRes = handleKakerlakenPokerAction(
  emptyHandState,
  {
    type: 'GUESS',
    guess: 'true',
  },
  'p1',
  mockRoom
);

assert(
  emptyHandGuessRes.newState.phase === 'game_over',
  'Game must end if round recipient has no cards left on hand to start next round'
);
assert(
  emptyHandGuessRes.newState.loserPlayerId === 'p1',
  'Player 1 with empty hand must be the loser'
);
assert(
  emptyHandGuessRes.newState.lossReason === 'empty_hand',
  'Loss reason must be empty_hand'
);

console.log('\n🎉 ALL KAKERLAKEN POKER TESTS PASSED WITH 100% SUCCESS!');
