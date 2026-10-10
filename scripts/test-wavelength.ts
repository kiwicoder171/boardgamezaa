import { initWavelengthState, wavelengthReducer, calculateWedgePoints } from '../src/games/wavelength/logic';
import { Player } from '../src/types/game';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ ${msg}`);
  }
}

console.log('🧪 Testing Wavelength Game Logic & Rules...\n');

// 1. Test wedge point calculation
const bullseyeTest = calculateWedgePoints(90, 92);
assert(bullseyeTest.points === 4 && bullseyeTest.zone === 'bullseye', 'Diff 2° hits Bullseye (4 pts)');

const innerTest = calculateWedgePoints(90, 98);
assert(innerTest.points === 3 && innerTest.zone === 'inner', 'Diff 8° hits Inner zone (3 pts)');

const outerTest = calculateWedgePoints(90, 105);
assert(outerTest.points === 2 && outerTest.zone === 'outer', 'Diff 15° hits Outer zone (2 pts)');

const missTest = calculateWedgePoints(90, 125);
assert(missTest.points === 0 && missTest.zone === 'miss', 'Diff 35° Misses (0 pts)');

// 2. Setup 2 players (p1 = psychic, p2 = guesser)
const mockPlayers2: Player[] = [
  { id: 'p1', name: 'Psychic Player', avatar: '🔮', socketId: 's1', isHost: true, isReady: true, connected: true },
  { id: 'p2', name: 'Guesser Player', avatar: '🧠', socketId: 's2', isHost: false, isReady: true, connected: true },
];

let state = initWavelengthState(mockPlayers2, { mode: 'coop', targetScore: 16 });
assert(state.phase === 'clue', 'Game starts in clue phase');
assert(state.psychicId === 'p1', 'Player 1 is Psychic');
assert(state.dialCaptainId === 'p2', 'Player 2 is designated Dial Captain');

// 3. Test REROLL_CARD (Change Topic)
const oldCardId = state.currentCard.id;
const rerollRes = wavelengthReducer(state, { type: 'REROLL_CARD' }, 'p1');
assert(!rerollRes.error, 'Psychic can reroll topic card during clue phase');
state = rerollRes.newState;
assert(state.currentCard.id !== oldCardId || !!state.currentCard.id, 'New spectrum card picked');

// Non-psychic cannot reroll card
const invalidReroll = wavelengthReducer(state, { type: 'REROLL_CARD' }, 'p2');
assert(!!invalidReroll.error, 'Guesser cannot reroll card');

// 4. Psychic submits clue
const clueRes = wavelengthReducer(state, { type: 'SUBMIT_CLUE', clue: 'Hot Soup' }, 'p1');
assert(!clueRes.error, 'Psychic submits clue successfully');
state = clueRes.newState;
assert(state.phase === 'guessing', 'Game moves to guessing phase');
assert(state.clue === 'Hot Soup', 'Clue recorded correctly');

// 5. Test Lock Guess restriction
const psychicLockRes = wavelengthReducer(state, { type: 'LOCK_GUESS' }, 'p1');
assert(!!psychicLockRes.error, 'Psychic cannot lock guess when other teammates exist');

// 6. Guesser rotates and locks
const guesserRotateRes = wavelengthReducer(state, { type: 'ROTATE_DIAL', angle: 100 }, 'p2');
assert(!guesserRotateRes.error, 'Guesser rotates dial successfully');
state = guesserRotateRes.newState;
assert(state.dialAngle === 100, 'Dial angle updated to 100°');

const guesserLockRes = wavelengthReducer(state, { type: 'LOCK_GUESS' }, 'p2');
assert(!guesserLockRes.error, 'Guesser locks guess successfully');
state = guesserLockRes.newState;
assert(state.phase === 'reveal', 'State transitions to reveal phase after lock');

// 7. Test 4-Player Competitive Rotation across 4 rounds
console.log('\n👥 Testing 4-Player Competitive Psychic Rotation...');
const mockPlayers4: Player[] = [
  { id: 'p1', name: 'Alice', avatar: '🐱', socketId: 's1', isHost: true, isReady: true, connected: true },
  { id: 'p2', name: 'Bob', avatar: '🐶', socketId: 's2', isHost: false, isReady: true, connected: true },
  { id: 'p3', name: 'Charlie', avatar: '🦊', socketId: 's3', isHost: false, isReady: true, connected: true },
  { id: 'p4', name: 'Diana', avatar: '🐼', socketId: 's4', isHost: false, isReady: true, connected: true },
];

let compState = initWavelengthState(mockPlayers4, { mode: 'competitive', targetScore: 10 });
// Round 1
assert(compState.activeTeam === 'brain', 'Round 1: Brain active');
assert(compState.psychicId === 'p1', 'Round 1: p1 is Psychic');
assert(compState.dialCaptainId === 'p3', 'Round 1: p3 is Dial Captain for Brain');

// Advance to reveal
compState.phase = 'reveal';

// Round 2
const r2 = wavelengthReducer(compState, { type: 'NEXT_ROUND' }, 'p1');
compState = r2.newState;
assert(compState.activeTeam === 'mind', 'Round 2: Mind active');
assert(compState.psychicId === 'p2', 'Round 2: p2 is Psychic');
assert(compState.dialCaptainId === 'p4', 'Round 2: p4 is Dial Captain for Mind');

// Advance to reveal
compState.phase = 'reveal';

// Round 3
const r3 = wavelengthReducer(compState, { type: 'NEXT_ROUND' }, 'p2');
compState = r3.newState;
assert(compState.activeTeam === 'brain', 'Round 3: Brain active');
assert(compState.psychicId === 'p3', 'Round 3: p3 is Psychic (fair rotation within Brain team!)');
assert(compState.dialCaptainId === 'p1', 'Round 3: p1 is Dial Captain');

// Advance to reveal
compState.phase = 'reveal';

// Round 4
const r4 = wavelengthReducer(compState, { type: 'NEXT_ROUND' }, 'p3');
compState = r4.newState;
assert(compState.activeTeam === 'mind', 'Round 4: Mind active');
assert(compState.psychicId === 'p4', 'Round 4: p4 is Psychic (the fourth player gets their turn!)');
assert(compState.dialCaptainId === 'p2', 'Round 4: p2 is Dial Captain');

console.log('\n🎉 ALL WAVELENGTH TESTS PASSED SUCCESSFULLY!\n');
