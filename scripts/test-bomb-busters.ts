import { initBombBustersGame, handleBombBustersAction } from '../src/games/bomb-busters/logic';
import { Player, Room } from '../src/types/game';

function runTests() {
  console.log('🧪 Starting Bomb Busters Test Suite...\n');

  const p1: Player = { id: 'p1', name: 'Alice', avatar: '🐱', isHost: true, socketId: 's1', isReady: true, connected: true };
  const p2: Player = { id: 'p2', name: 'Bob', avatar: '🐶', isHost: false, socketId: 's2', isReady: true, connected: true };
  const room: Room = {
    code: 'TEST',
    hostId: 'p1',
    players: [p1, p2],
    selectedGameId: 'bomb-busters',
    status: 'playing',
    gameSettings: { missionId: 1 },
    gameState: null,
    chatMessages: [],
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  // 1. Test Game Initialization
  const state = initBombBustersGame([p1, p2], { missionId: 1 });
  console.log('✓ Init game state generated successfully.');
  console.log(`  Total wires to cut: ${state.totalWiresToCut}, Detonator lives: ${state.detonatorLives}`);

  // Test Helper Cards are present
  const xrayCard = state.helperCards.find((c) => c.effect === 'PEEK_WIRE');
  if (!xrayCard) throw new Error('Safe X-Ray Probe helper card missing!');
  console.log('✓ Safe X-Ray Probe card present:', xrayCard.name);

  // Manually unlock X-Ray card for testing
  state.helperCards = state.helperCards.map((c) =>
    c.effect === 'PEEK_WIRE' ? { ...c, isUnlocked: true } : c
  );

  // 2. Test Safe X-Ray Probe on Blue Wire
  // Set game phase to in_progress with p1's turn
  state.phase = 'in_progress';
  state.currentTurnPlayerId = 'p1';

  const bobStand = state.stands['p2'];
  const blueWire = bobStand.find((w) => w.color === 'blue' && !w.isCut);
  if (!blueWire) throw new Error('No blue wire on Bob stand!');

  const blueSlotNum = bobStand.findIndex((w) => w.id === blueWire.id) + 1;
  const initialLives = state.detonatorLives;

  const res1 = handleBombBustersAction(state, {
    type: 'USE_HELPER_CARD',
    cardId: xrayCard.id,
    targetPlayerId: 'p2',
    targetWireId: blueWire.id,
  }, 'p1', room);

  if (res1.error) throw new Error(`X-Ray failed on blue wire: ${res1.error}`);
  const updatedBobBlue = res1.newState.stands['p2'].find((w) => w.id === blueWire.id);
  if (updatedBobBlue?.infoToken !== blueWire.value) {
    throw new Error(`Expected infoToken ${blueWire.value}, got ${updatedBobBlue?.infoToken}`);
  }
  if (res1.newState.detonatorLives !== initialLives) {
    throw new Error('Detonator lives should not change on safe X-Ray Probe!');
  }
  const consumedCard = res1.newState.helperCards.find((c) => c.id === xrayCard.id);
  if (!consumedCard?.isUsed) {
    throw new Error('Helper card should be marked as used!');
  }
  console.log(`✓ Safe X-Ray Probe successfully scanned blue wire at slot #${blueSlotNum} (revealed #${blueWire.value})!`);

  // 3. Test Safe X-Ray Probe on Red Wire (Should NOT explode!)
  // Create state with a red wire on Bob's rack
  const stateWithRed = { ...state };
  stateWithRed.helperCards = state.helperCards.map((c) =>
    c.effect === 'PEEK_WIRE' ? { ...c, isUnlocked: true, isUsed: false } : c
  );
  stateWithRed.stands['p2'] = [
    ...stateWithRed.stands['p2'],
    {
      id: 'test_red_wire',
      value: 'RED',
      color: 'red' as const,
      isCut: false,
      infoToken: null,
      adjacentToken: null,
      clues: [],
    },
  ];

  const res2 = handleBombBustersAction(stateWithRed, {
    type: 'USE_HELPER_CARD',
    cardId: xrayCard.id,
    targetPlayerId: 'p2',
    targetWireId: 'test_red_wire',
  }, 'p1', room);

  if (res2.error) throw new Error(`X-Ray failed on red wire: ${res2.error}`);
  if (res2.newState.phase === 'exploded') {
    throw new Error('CATASTROPHIC FAILURE: X-Ray Probe exploded on red wire! It must be 100% safe!');
  }
  const updatedRed = res2.newState.stands['p2'].find((w) => w.id === 'test_red_wire');
  if (updatedRed?.infoToken !== 'RED') {
    throw new Error(`Expected infoToken 'RED', got ${updatedRed?.infoToken}`);
  }
  console.log('✓ Safe X-Ray Probe successfully neutralized red wire risk by revealing RED infoToken WITHOUT detonating!');

  // 4. Test Double Detector Slot Consistency
  // Cut first 2 wires on Bob's stand so that remaining wires are at slot #3 and #4
  const stateWithCuts = { ...state };
  stateWithCuts.stands['p2'] = bobStand.map((w, idx) =>
    idx < 2 ? { ...w, isCut: true } : { ...w, isCut: false }
  );
  const remainingWires = stateWithCuts.stands['p2'].filter((w) => !w.isCut);
  const wA = remainingWires[0];
  const wB = remainingWires[1];

  const slotA = stateWithCuts.stands['p2'].findIndex((w) => w.id === wA.id) + 1;
  const slotB = stateWithCuts.stands['p2'].findIndex((w) => w.id === wB.id) + 1;

  if (slotA !== 3 || slotB !== 4) {
    throw new Error(`Expected slots 3 & 4 on board, got ${slotA} & ${slotB}`);
  }

  // Double detector call on these two adjacent remaining wires
  const ddRes = handleBombBustersAction(stateWithCuts, {
    type: 'USE_DOUBLE_DETECTOR',
    targetPlayerId: 'p2',
    wireId1: wA.id,
    wireId2: wB.id,
    guessedValue: 99, // Intentional miss to test life deduction and safety
  }, 'p1', room);

  if (ddRes.error) throw new Error(`Double detector error: ${ddRes.error}`);
  if (!ddRes.newState.doubleDetectorUsed['p1']) {
    throw new Error('Double detector should be marked as used for player 1');
  }
  // 5. Test Initial Clue Phase on Full Number Wire vs Decimal (Yellow & Red) Wires
  const clueTestState = initBombBustersGame([p1, p2], { missionId: 2 });
  clueTestState.phase = 'initial_clue';
  // Reset info tokens
  clueTestState.stands['p1'] = [
    { id: 'w_blue', value: 4, color: 'blue', isCut: false, infoToken: null, clues: [] },
    { id: 'w_yellow', value: 1.1, color: 'yellow', isCut: false, infoToken: null, clues: [] },
    { id: 'w_red', value: 1.5, color: 'red', isCut: false, infoToken: null, clues: [] },
  ];

  // A. Place Clue on Blue Wire -> reveals number #4
  const resClueBlue = handleBombBustersAction(clueTestState, {
    type: 'PLACE_INFO_TOKEN',
    wireId: 'w_blue',
  }, 'p1', room);
  if (resClueBlue.error) throw new Error(`Blue wire clue failed: ${resClueBlue.error}`);
  const blueAfter = resClueBlue.newState.stands['p1'].find((w) => w.id === 'w_blue');
  if (blueAfter?.infoToken !== 4) {
    throw new Error(`Expected Blue wire infoToken to be number 4, got ${blueAfter?.infoToken}`);
  }
  console.log('✓ Initial clue on Full Number (Blue) wire reveals number: #4');

  // B. Place Clue on Yellow Decimal Wire -> reveals 'YELLOW' color
  const stateYellowTest = { ...clueTestState };
  stateYellowTest.stands['p1'] = clueTestState.stands['p1'].map((w) => ({ ...w, infoToken: null }));
  const resClueYellow = handleBombBustersAction(stateYellowTest, {
    type: 'PLACE_INFO_TOKEN',
    wireId: 'w_yellow',
  }, 'p1', room);
  if (resClueYellow.error) throw new Error(`Yellow wire clue failed: ${resClueYellow.error}`);
  const yellowAfter = resClueYellow.newState.stands['p1'].find((w) => w.id === 'w_yellow');
  if (yellowAfter?.infoToken !== 'YELLOW') {
    throw new Error(`Expected Yellow wire infoToken to be 'YELLOW', got ${yellowAfter?.infoToken}`);
  }
  console.log('✓ Initial clue on Yellow Decimal wire reveals color: "YELLOW"');

  // C. Place Clue on Red Wire -> reveals 'RED' color
  const stateRedTest = { ...clueTestState };
  stateRedTest.stands['p1'] = clueTestState.stands['p1'].map((w) => ({ ...w, infoToken: null }));
  const resClueRed = handleBombBustersAction(stateRedTest, {
    type: 'PLACE_INFO_TOKEN',
    wireId: 'w_red',
  }, 'p1', room);
  if (resClueRed.error) throw new Error(`Red wire clue failed: ${resClueRed.error}`);
  const redAfter = resClueRed.newState.stands['p1'].find((w) => w.id === 'w_red');
  if (redAfter?.infoToken !== 'RED') {
    throw new Error(`Expected Red wire infoToken to be 'RED', got ${redAfter?.infoToken}`);
  }
  console.log('✓ Initial clue on Red Danger wire reveals color: "RED"');

  console.log('\n🎉 ALL TESTS PASSED! Full number wires give numbers, decimal wires give colors!\n');
}

runTests();
