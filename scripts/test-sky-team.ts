import { initSkyTeamGame, handleSkyTeamAction, sanitizeSkyTeamState } from '../src/games/sky-team/logic';
import { SKY_TEAM_SCENARIOS } from '../src/games/sky-team/scenarios';

console.log('🧪 Starting Sky Team Automated Engine Test Suite...');

// 1. Test Scenarios
console.log(`Checking scenarios... Found ${SKY_TEAM_SCENARIOS.length} scenarios.`);
if (SKY_TEAM_SCENARIOS.length < 8) {
  throw new Error('Expected at least 8 airport scenarios!');
}

// 2. Test Initialization
const players = [
  { id: 'player-pilot', name: 'Maverick' },
  { id: 'player-copilot', name: 'Goose' },
];

let state = initSkyTeamGame(players, { airportId: 'yul-montreal' });
console.log(`Initialized flight to ${state.airportName} (${state.airportCode}).`);
console.log(`Initial Altitude: ${state.altitude} ft, Tilt: ${state.tilt}°, Round: ${state.round}/7`);

if (state.pilotDice.length !== 4 || state.copilotDice.length !== 4) {
  throw new Error('Expected 4 dice per pilot/copilot!');
}

// 3. Test Coffee Usage
const originalDieVal = state.pilotDice[0].value;
if (originalDieVal < 6) {
  state = handleSkyTeamAction(state, {
    type: 'USE_COFFEE',
    playerId: 'player-pilot',
    dieId: state.pilotDice[0].id,
    delta: 1,
  });
  console.log(`Coffee used: die modified from ${originalDieVal} to ${state.pilotDice[0].value}`);
  if (state.pilotDice[0].value !== originalDieVal + 1) {
    throw new Error('Coffee did not increment die value!');
  }
}

// 4. Test Reroll
const preRerollTokens = state.rerollTokens;
state = handleSkyTeamAction(state, {
  type: 'USE_REROLL',
  playerId: 'player-pilot',
  dieIds: [state.pilotDice[1].id],
});
if (state.rerollTokens !== preRerollTokens - 1) {
  throw new Error('Reroll tokens not decremented!');
}
console.log(`Reroll consumed: remaining tokens ${state.rerollTokens}`);

// 5. Test State Sanitization (Anti-Cheat)
const sanitizedForPilot = sanitizeSkyTeamState(state, 'player-pilot');
if (sanitizedForPilot.copilotDice.some((d) => !d.placed && d.value !== 0)) {
  throw new Error('Anti-cheat leak! Pilot should not see unplaced Co-Pilot dice values!');
}
const sanitizedForCopilot = sanitizeSkyTeamState(state, 'player-copilot');
if (sanitizedForCopilot.pilotDice.some((d) => !d.placed && d.value !== 0)) {
  throw new Error('Anti-cheat leak! Co-Pilot should not see unplaced Pilot dice values!');
}
console.log('✅ Anti-cheat state sanitization verified: unplaced secret dice are properly masked!');

// 6. Test Sequential Dice Placement in Round 1
// Place Pilot Axis
state = handleSkyTeamAction(state, {
  type: 'PLACE_DIE',
  playerId: 'player-pilot',
  dieId: state.pilotDice[0].id,
  slotId: 'axisPilot',
});

// Place Copilot Axis
state = handleSkyTeamAction(state, {
  type: 'PLACE_DIE',
  playerId: 'player-copilot',
  dieId: state.copilotDice[0].id,
  slotId: 'axisCopilot',
});

// Place Pilot Engines
state = handleSkyTeamAction(state, {
  type: 'PLACE_DIE',
  playerId: 'player-pilot',
  dieId: state.pilotDice[1].id,
  slotId: 'enginesPilot',
});

// Place Copilot Engines
state = handleSkyTeamAction(state, {
  type: 'PLACE_DIE',
  playerId: 'player-copilot',
  dieId: state.copilotDice[1].id,
  slotId: 'enginesCopilot',
});

// Place Pilot Radio (clears traffic)
state = handleSkyTeamAction(state, {
  type: 'PLACE_DIE',
  playerId: 'player-pilot',
  dieId: state.pilotDice[2].id,
  slotId: 'radioPilot',
});

// Place Copilot Radio
state = handleSkyTeamAction(state, {
  type: 'PLACE_DIE',
  playerId: 'player-copilot',
  dieId: state.copilotDice[2].id,
  slotId: 'radioCopilot1',
});

// Place remaining dice on coffee or available slots to finish round 1
state = handleSkyTeamAction(state, {
  type: 'PLACE_DIE',
  playerId: 'player-pilot',
  dieId: state.pilotDice[3].id,
  slotId: 'coffee1',
});

state = handleSkyTeamAction(state, {
  type: 'PLACE_DIE',
  playerId: 'player-copilot',
  dieId: state.copilotDice[3].id,
  slotId: 'coffee2',
});

console.log(`After Round 1: Status=${state.status}, Altitude=${state.altitude} ft, Round=${state.round}`);
if (state.altitude === 6000 && state.status === 'playing') {
  throw new Error('Altitude should have dropped after 8 dice placed!');
}
console.log('✅ Round 1 completed cleanly! Altitude descended to:', state.altitude, 'ft.');
console.log('🎉 ALL SKY TEAM ENGINE TESTS PASSED 100%!');
