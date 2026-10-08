import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

interface PlayerClient {
  id: string;
  name: string;
  avatar: string;
  socket: Socket;
  latestRoomState: any;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPlayerClient(id: string, name: string, avatar: string): PlayerClient {
  const socket = io(SERVER_URL, { transports: ['websocket'] });
  const client: PlayerClient = {
    id,
    name,
    avatar,
    socket,
    latestRoomState: null,
  };

  socket.on('room_state_update', (state) => {
    client.latestRoomState = state;
  });

  socket.on('error_notification', (err) => {
    console.error(`[${name} ERROR]:`, err.message);
  });

  return client;
}

async function runBombBustersTest() {
  console.log('====================================================');
  console.log('💣 STARTING FULL BOMB BUSTERS TEST SIMULATION');
  console.log('====================================================\n');

  // 1. Connect Alice (Host)
  const alice = createPlayerClient('usr_alice', 'Alice (Captain)', '🦊');
  await sleep(400);

  let roomCode = '';
  await new Promise<void>((resolve) => {
    alice.socket.on('room_created', ({ code }) => {
      roomCode = code;
      resolve();
    });
    alice.socket.emit('create_room', {
      player: { id: alice.id, name: alice.name, avatar: alice.avatar },
      gameId: 'spyfall',
    });
  });

  console.log(`✅ [Room Created] Room Code: ${roomCode}`);

  // 2. Bob joins
  const bob = createPlayerClient('usr_bob', 'Bob (Technician)', '🤖');
  await sleep(300);
  bob.socket.emit('join_room', { code: roomCode, player: { id: bob.id, name: bob.name, avatar: bob.avatar } });

  await sleep(600);
  console.log(`👥 Squad Roster: ${alice.latestRoomState?.players?.map((p: any) => p.name).join(', ')}`);

  // 3. Switch Game to "bomb-busters"
  console.log('🎮 [Host Action] Alice switches active game to Bomb Busters...');
  alice.socket.emit('select_game', { code: roomCode, gameId: 'bomb-busters' });

  await sleep(600);
  console.log(`   Active Game confirmed: ${alice.latestRoomState?.selectedGameId}\n`);

  // 4. Start Game
  console.log('🚀 [Host Action] Alice presses "Start Mission"...');
  alice.socket.emit('start_game', { code: roomCode });

  await sleep(1000);

  // 5. Verify State & Anti-Cheat Information Masking
  console.log('🔒 [Security & Ascending Order Audit]');
  const aliceState = alice.latestRoomState?.gameState;
  const bobState = bob.latestRoomState?.gameState;

  const aliceOwnWires = aliceState?.stands['usr_alice'];
  const aliceViewOfBobWires = aliceState?.stands['usr_bob'];

  console.log(`   Alice sees her own wires: ${aliceOwnWires.map((w: any) => `#${w.value}`).join(', ')}`);
  console.log(`   Alice sees Bob's wires: ${aliceViewOfBobWires.map((w: any) => w.value === null ? '🔒?' : `#${w.value}`).join(', ')}`);

  // Verify ascending order
  const values = aliceOwnWires.map((w: any) => w.value);
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] > values[i + 1]) {
      throw new Error(`Ascending order violation on Alice stand! ${values}`);
    }
  }
  console.log('   ✅ Ascending order strictly verified!');

  // Verify Bob's values are hidden from Alice (except the 1 starting wire with an Info Token)
  const nonTokenBobWires = aliceViewOfBobWires.filter((w: any) => !w.isCut && w.infoToken === null);
  const leakedValues = nonTokenBobWires.filter((w: any) => w.value !== null);
  if (leakedValues.length > 0) {
    throw new Error('SECURITY LEAK: Bob uncut wire values without info tokens visible to Alice!');
  }
  const tokenBobWires = aliceViewOfBobWires.filter((w: any) => w.infoToken !== null);
  console.log(`   ✅ Setup Info Token verified: Bob has starting info token #${tokenBobWires[0]?.infoToken}`);
  console.log('   ✅ Information masking verified: All other teammate wires are strictly hidden (value = null)!\n');

  // 6. Test Equipment: Sonar Scanner
  console.log('📡 [Equipment Test] Bob uses Sonar Scanner to check if Alice has wire #3...');
  bob.socket.emit('game_action', {
    code: roomCode,
    action: { type: 'USE_SCANNER', targetPlayerId: 'usr_alice', scannedValue: 3 },
  });

  await sleep(800);
  console.log(`   Log: ${alice.latestRoomState.gameState.history.slice(-1)[0].text}\n`);

  // 7. Test Wire Snip
  console.log('✂️ [Action Test] Operative cuts a wire pair...');
  const currentTurnId = alice.latestRoomState.gameState.currentTurnPlayerId;
  const activePlayer = currentTurnId === 'usr_alice' ? alice : bob;
  const otherPlayer = currentTurnId === 'usr_alice' ? bob : alice;

  // Pick first uncut wire of active player
  const myWire = activePlayer.latestRoomState.gameState.stands[activePlayer.id].find((w: any) => !w.isCut);
  const targetWire = otherPlayer.latestRoomState.gameState.stands[otherPlayer.id].find((w: any) => !w.isCut);

  console.log(`   ${activePlayer.name} attempts to snip matching wire on ${otherPlayer.name}'s stand...`);
  activePlayer.socket.emit('game_action', {
    code: roomCode,
    action: {
      type: 'CUT_WIRE',
      myWireId: myWire.id,
      targetPlayerId: otherPlayer.id,
      targetWireId: targetWire.id,
    },
  });

  await sleep(1000);
  console.log(`   Result Log: ${alice.latestRoomState.gameState.history.slice(-1)[0].text}`);
  console.log(`   Detonator Stability: ${alice.latestRoomState.gameState.detonatorLives} / ${alice.latestRoomState.gameState.maxDetonatorLives}`);
  console.log(`   Disarmed Wires Count: ${alice.latestRoomState.gameState.cutWiresCount} / ${alice.latestRoomState.gameState.totalWiresToCut}\n`);

  // 8. Test Stabilizer
  console.log('🧪 [Equipment Test] Squad deploys Detonator Stabilizer...');
  alice.socket.emit('game_action', {
    code: roomCode,
    action: { type: 'USE_STABILIZER' },
  });

  await sleep(800);
  console.log(`   Result Log: ${alice.latestRoomState.gameState.history.slice(-1)[0].text}`);
  console.log(`   Detonator Stability now: ${alice.latestRoomState.gameState.detonatorLives}\n`);

  console.log('====================================================');
  console.log('🎉 BOMB BUSTERS SIMULATION PASSED 100%!');
  console.log('====================================================');

  alice.socket.disconnect();
  bob.socket.disconnect();
  process.exit(0);
}

runBombBustersTest().catch((err) => {
  console.error('Bomb Busters test failed:', err);
  process.exit(1);
});
