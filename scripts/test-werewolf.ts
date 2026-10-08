import { initWerewolfGame, handleWerewolfAction, sanitizeWerewolfState } from '../src/games/werewolf/logic';

console.log('🧪 Starting Ultimate Werewolf Automated Test Suite...');

// 1. Test Role Dealing
const players = [
  { id: 'p1', name: 'Alice', avatar: '👩' },
  { id: 'p2', name: 'Bob', avatar: '🧔' },
  { id: 'p3', name: 'Charlie', avatar: '👦' },
  { id: 'p4', name: 'Diana', avatar: '👧' },
  { id: 'p5', name: 'Evan', avatar: '🧓' },
];

let state = initWerewolfGame(players, { expansionPacks: 'all_roles', discussionSeconds: 60 });
console.log(`Initialized Werewolf game with ${state.players.length} players.`);
console.log('Roles dealt:', state.players.map((p) => `${p.name}: ${p.role}`).join(', '));

if (state.phase !== 'night') {
  throw new Error('Initial phase should be night!');
}

// 2. Test Anti-Cheat State Sanitization
const wolfPlayer = state.players.find((p) => p.role === 'werewolf');
const villagerPlayer = state.players.find((p) => p.role !== 'werewolf' && p.role !== 'minion');

if (villagerPlayer) {
  const sanitizedForVillager = sanitizeWerewolfState(state, villagerPlayer.id);
  const otherRolesRevealed = sanitizedForVillager.players.filter(
    (p) => p.id !== villagerPlayer.id && p.role !== 'villager'
  );
  if (otherRolesRevealed.length > 0) {
    throw new Error('Anti-cheat breach! Villager should not see other players secret roles!');
  }
  console.log('✅ Anti-cheat verified: innocent villagers only see masked roles!');
}

// 3. Test Night Progression
const activeNightRole = state.activeNightRole;
console.log('Active night call:', activeNightRole);

// Test Tanner Win Condition
// Create custom state where Tanner is lynched
const tannerState = initWerewolfGame([
  { id: 't1', name: 'TannerTom' },
  { id: 'v1', name: 'Villager1' },
  { id: 'v2', name: 'Villager2' },
  { id: 'w1', name: 'Wolf1' },
]);
// Force t1 to be tanner
const tannerPlayer = tannerState.players.find((p) => p.id === 't1')!;
tannerPlayer.role = 'tanner';

// Move to day voting
tannerState.phase = 'day_voting';
// All vote Tanner
let votedState = handleWerewolfAction(tannerState, { type: 'CAST_VOTE', playerId: 'v1', targetId: 't1' });
votedState = handleWerewolfAction(votedState, { type: 'CAST_VOTE', playerId: 'v2', targetId: 't1' });
votedState = handleWerewolfAction(votedState, { type: 'CAST_VOTE', playerId: 'w1', targetId: 't1' });
votedState = handleWerewolfAction(votedState, { type: 'CAST_VOTE', playerId: 't1', targetId: 'w1' });

console.log(`After voting Tanner: phase=${votedState.phase}, winner=${votedState.winner}`);
if (votedState.winner !== 'tanner' || votedState.phase !== 'game_over') {
  throw new Error('Tanner win condition failed!');
}
console.log('✅ Tanner win condition passed: Tanner wins when executed by the village!');

console.log('🎉 ALL ULTIMATE WEREWOLF ENGINE TESTS PASSED 100%!');
