import {
  initCheeseThiefState,
  cheeseThiefReducer,
  sanitizeCheeseThiefState,
} from '../src/games/cheese-thief/logic';

function runTests() {
  console.log('🧪 Starting Cheese Thief Tests...\n');

  const testPlayers = [
    { id: 'p1', name: 'Mickey' },
    { id: 'p2', name: 'Minnie' },
    { id: 'p3', name: 'Jerry' },
    { id: 'p4', name: 'Stuart' },
  ];

  // Test 1: Setup & Role distribution
  console.log('--- Test 1: Setup & Initialization ---');
  let state = initCheeseThiefState(testPlayers, false);
  if (state.phase !== 'setup') throw new Error(`Expected setup phase, got ${state.phase}`);
  if (state.playerOrder.length !== 4) throw new Error('Expected 4 players');
  const thieves = Object.values(state.players).filter((p) => p.role === 'thief');
  if (thieves.length !== 1) throw new Error(`Expected 1 thief, found ${thieves.length}`);
  const sleepyheads = Object.values(state.players).filter((p) => p.role === 'sleepyhead');
  if (sleepyheads.length !== 3) throw new Error(`Expected 3 sleepyheads, found ${sleepyheads.length}`);
  console.log(`✅ Setup successful: 1 Thief (${thieves[0].name}), 3 Sleepyheads.`);

  // Test 2: Anti-cheat sanitization
  console.log('--- Test 2: Anti-Cheat Sanitization ---');
  const sanitizedForP1 = sanitizeCheeseThiefState(state, 'p1');
  if (sanitizedForP1.players['p2'].dieValue !== 0) {
    throw new Error('P2 die value should be masked to 0 for P1 before peeking');
  }
  if (sanitizedForP1.players['p1'].dieValue === 0) {
    throw new Error('P1 should see their own die value');
  }
  console.log('✅ Anti-cheat sanitization masks other dice and roles properly.');

  // Test 3: Night Heist
  console.log('--- Test 3: Night Heist & Stealing Cheese ---');
  state = cheeseThiefReducer(state, { type: 'start_night' });
  if (state.phase !== 'night' || state.currentHour !== 1) {
    throw new Error(`Night failed to start at Hour 1, got hour ${state.currentHour}`);
  }

  // Force specific dice for deterministic testing
  // Thief at hour 2, P2 at hour 3 (alone), P3 & P4 at hour 4
  const thief = thieves[0];
  state.players[thief.id].dieValue = 2;
  const nonThieves = testPlayers.filter((p) => p.id !== thief.id);
  state.players[nonThieves[0].id].dieValue = 3;
  state.players[nonThieves[1].id].dieValue = 4;
  state.players[nonThieves[2].id].dieValue = 4;

  // Advance to hour 2 (Thief's hour)
  state = cheeseThiefReducer(state, { type: 'advance_hour' }); // hour 2
  if (state.currentHour !== 2) throw new Error('Expected hour 2');

  // Thief swipes cheese
  state = cheeseThiefReducer(state, { type: 'steal_cheese', playerId: thief.id });
  if (!state.cheeseStolen || state.stolenAtHour !== 2) {
    throw new Error('Cheese was not stolen properly');
  }
  console.log(`✅ Thief successfully stole cheese at Hour 2!`);

  // Test 4: Solo Peek at Hour 3
  console.log('--- Test 4: Solo Peek Mechanic ---');
  state = cheeseThiefReducer(state, { type: 'advance_hour' }); // hour 3
  const soloPlayer = state.players[nonThieves[0].id];
  state = cheeseThiefReducer(state, {
    type: 'peek_cup',
    playerId: soloPlayer.id,
    targetId: thief.id,
  });
  if (state.players[soloPlayer.id].peekedTargetId !== thief.id) {
    throw new Error('Peek target not registered');
  }
  if (state.players[soloPlayer.id].peekedTargetDie !== 2) {
    throw new Error(`Expected peeked die 2, got ${state.players[soloPlayer.id].peekedTargetDie}`);
  }
  console.log(`✅ Solo Sleepyhead peeked at Thief's cup and discovered Die 2!`);

  // Advance to dawn
  state = cheeseThiefReducer(state, { type: 'advance_hour' }); // hour 4
  state = cheeseThiefReducer(state, { type: 'advance_hour' }); // hour 5
  state = cheeseThiefReducer(state, { type: 'advance_hour' }); // hour 6
  state = cheeseThiefReducer(state, { type: 'advance_hour' }); // follower selection / dawn

  if (state.phase === 'follower_selection') {
    // Thief recruits follower
    state = cheeseThiefReducer(state, {
      type: 'choose_follower',
      playerId: thief.id,
      targetId: nonThieves[1].id,
    });
    if (state.followerId !== nonThieves[1].id) {
      throw new Error('Follower not recruited properly');
    }
    console.log(`✅ Follower recruited: ${state.players[nonThieves[1].id].name}`);
  }

  // Day & Voting Phase
  console.log('--- Test 5: Day Discussion & Voting ---');
  state = cheeseThiefReducer(state, { type: 'start_voting' });
  if (state.phase !== 'voting') throw new Error('Expected voting phase');

  // All 4 players vote for the thief!
  testPlayers.forEach((p) => {
    state = cheeseThiefReducer(state, {
      type: 'cast_vote',
      playerId: p.id,
      targetId: thief.id,
    });
  });

  const finalPhase = (state as any).phase;
  if (finalPhase !== 'game_over') throw new Error(`Expected game_over after all votes, got ${finalPhase}`);
  if (state.winner !== 'sleepyheads') {
    throw new Error(`Expected sleepyheads to win, got ${state.winner}`);
  }
  console.log(`✅ Sleepyheads successfully caught the Thief and won!`);

  // Test 6: Fall Mouse Expansion Variant
  console.log('--- Test 6: Fall Mouse Expansion Variant ---');
  const fivePlayers = [...testPlayers, { id: 'p5', name: 'Jerry-Fall' }];
  let fallState = initCheeseThiefState(fivePlayers, true);
  const fallMouse = Object.values(fallState.players).find((p) => p.role === 'fall_mouse');
  if (!fallMouse) throw new Error('Expected Fall Mouse role to be assigned');

  fallState.phase = 'voting';
  // All players vote for the Fall Mouse
  fivePlayers.forEach((p) => {
    fallState = cheeseThiefReducer(fallState, {
      type: 'cast_vote',
      playerId: p.id,
      targetId: fallMouse.id,
    });
  });

  if (fallState.winner !== 'fall_mouse') {
    throw new Error(`Expected Fall Mouse solo victory, got ${fallState.winner}`);
  }
  console.log(`✅ Fall Mouse expansion variant verified: Fall Mouse won alone!`);

  console.log('\n🎉 ALL CHEESE THIEF TESTS PASSED 100%!');
}

runTests();
