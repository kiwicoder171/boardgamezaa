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
const mockPlayers: Player[] = [
  { id: 'p1', name: 'Psychic Player', avatar: '🔮', socketId: 's1', isHost: true, isReady: true, connected: true },
  { id: 'p2', name: 'Guesser Player', avatar: '🧠', socketId: 's2', isHost: false, isReady: true, connected: true },
];

let state = initWavelengthState(mockPlayers, { mode: 'coop', targetScore: 16 });
assert(state.phase === 'clue', 'Game starts in clue phase');
assert(state.psychicId === 'p1', 'Player 1 is Psychic');

// 3. Psychic submits clue
const clueRes = wavelengthReducer(state, { type: 'SUBMIT_CLUE', clue: 'Hot Soup' }, 'p1');
assert(!clueRes.error, 'Psychic submits clue successfully');
state = clueRes.newState;
assert(state.phase === 'guessing', 'Game moves to guessing phase');
assert(state.clue === 'Hot Soup', 'Clue recorded correctly');

// 4. Test Psychic cannot rotate dial or lock guess when teammates exist
const psychicRotateRes = wavelengthReducer(state, { type: 'ROTATE_DIAL', angle: 45 }, 'p1');
assert(!!psychicRotateRes.error, 'Psychic is rejected when trying to rotate dial');

const psychicLockRes = wavelengthReducer(state, { type: 'LOCK_GUESS' }, 'p1');
assert(!!psychicLockRes.error, 'Psychic is rejected when trying to lock guess');

// 5. Guesser (p2) CAN rotate dial and lock guess
const guesserRotateRes = wavelengthReducer(state, { type: 'ROTATE_DIAL', angle: 100 }, 'p2');
assert(!guesserRotateRes.error, 'Guesser rotates dial successfully');
state = guesserRotateRes.newState;
assert(state.dialAngle === 100, 'Dial angle updated to 100°');

const guesserLockRes = wavelengthReducer(state, { type: 'LOCK_GUESS' }, 'p2');
assert(!guesserLockRes.error, 'Guesser locks guess successfully');
state = guesserLockRes.newState;
assert(state.phase === 'reveal', 'State transitions to reveal phase after lock');
assert(state.shutterOpen === true, 'Shutter opened to reveal target wedge');
assert(state.teams.brain.score > 0 || state.lastRoundResult?.points === 0, 'Score updated');

console.log('\n🎉 ALL WAVELENGTH TESTS PASSED SUCCESSFULLY!\n');
