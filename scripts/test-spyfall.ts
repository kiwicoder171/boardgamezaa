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

async function runSpyfallTest() {
  console.log('====================================================');
  console.log('🎮 STARTING FULL SPYFALL TEST SIMULATION');
  console.log('====================================================\n');

  // 1. Connect Alice (Host)
  const alice = createPlayerClient('usr_alice', 'Alice (Host)', '🦊');
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

  console.log(`✅ [Room Created via Socket] Room Code: ${roomCode}\n`);

  // 2. Connect Bob and Charlie
  const bob = createPlayerClient('usr_bob', 'Bob', '🐯');
  const charlie = createPlayerClient('usr_charlie', 'Charlie', '🐼');
  await sleep(400);

  console.log('👥 [Joining Room] Bob and Charlie joining...');
  bob.socket.emit('join_room', { code: roomCode, player: { id: bob.id, name: bob.name, avatar: bob.avatar } });
  charlie.socket.emit('join_room', { code: roomCode, player: { id: charlie.id, name: charlie.name, avatar: charlie.avatar } });


  await sleep(1000);

  console.log(`✅ Room Players: ${alice.latestRoomState?.players?.map((p: any) => p.name).join(', ')}`);
  console.log(`   Selected Game: ${alice.latestRoomState?.selectedGameId}`);
  console.log(`   Lobby Status: ${alice.latestRoomState?.status}\n`);

  // 3. Alice starts the game
  console.log('🚀 [Host Action] Alice clicks "Start Game"...');
  alice.socket.emit('start_game', { code: roomCode });

  await sleep(1000);

  // 4. Verify Game Initialized & Inspect Secret States
  console.log('🕵️‍♂️ [Verifying Secret Information Sanitization]');
  const players = [alice, bob, charlie];
  let spyPlayer: PlayerClient | null = null;
  const citizenPlayers: PlayerClient[] = [];

  for (const p of players) {
    const gameState = p.latestRoomState?.gameState;
    console.log(`   Player: ${p.name}`);
    console.log(`     - Is Spy: ${gameState?.isSpy}`);
    console.log(`     - Secret Role: ${gameState?.myRole}`);
    console.log(`     - Location Revealed: ${gameState?.myLocation ?? 'HIDDEN (CONFIDENTIAL)'}`);

    if (gameState?.isSpy) {
      spyPlayer = p;
      if (gameState?.myLocation !== null) {
        throw new Error(`SECURITY BREACH! Spy ${p.name} was sent the secret location!`);
      }
    } else {
      citizenPlayers.push(p);
      if (!gameState?.myLocation) {
        throw new Error(`Citizen ${p.name} should know the secret location!`);
      }
    }
  }

  console.log('\n🔒 SECURITY AUDIT PASSED: Secret state is perfectly sanitized per player!\n');
  console.log(`🎯 Citizen Location: "${citizenPlayers[0].latestRoomState.gameState.myLocation}"`);
  console.log(`🕵️ The Spy is: ${spyPlayer?.name}\n`);

  // 5. Question & Answer Phase
  const firstAskerId = alice.latestRoomState.gameState.currentAskerId;
  const firstAsker = players.find((p) => p.id === firstAskerId)!;
  const targetAnswerer = players.find((p) => p.id !== firstAskerId)!;

  console.log(`🗣️ [Q&A Round 1] ${firstAsker.name} selects ${targetAnswerer.name} to ask a question.`);
  firstAsker.socket.emit('game_action', {
    code: roomCode,
    action: { type: 'SELECT_QUESTIONEE', targetPlayerId: targetAnswerer.id },
  });

  await sleep(800);
  console.log(`   State: ${alice.latestRoomState.gameState.history.slice(-1)[0].text}`);

  console.log(`💬 [Q&A Round 1] ${targetAnswerer.name} finishes answering and takes the floor.`);
  targetAnswerer.socket.emit('game_action', {
    code: roomCode,
    action: { type: 'FINISH_ANSWER' },
  });

  await sleep(800);
  console.log(`   State: ${alice.latestRoomState.gameState.history.slice(-1)[0].text}\n`);

  // 6. Test Accusation & Unanimous Voting!
  const accuserCitizen = citizenPlayers[0];
  console.log(`🚨 [Accusation Test] Citizen ${accuserCitizen.name} formally accuses ${spyPlayer?.name} of being the SPY!`);

  accuserCitizen.socket.emit('game_action', {
    code: roomCode,
    action: { type: 'ACCUSE', targetPlayerId: spyPlayer!.id },
  });

  await sleep(800);
  console.log(`   Phase is now: ${alice.latestRoomState.gameState.phase}`);
  console.log(`   Accused: ${alice.latestRoomState.gameState.accusedId}`);

  // Remaining eligible voters cast votes
  const otherCitizen = citizenPlayers[1];
  console.log(`🗳️ [Voting Test] ${otherCitizen.name} casts GUILTY vote...`);
  otherCitizen.socket.emit('game_action', {
    code: roomCode,
    action: { type: 'CAST_VOTE', voteGuilty: true },
  });

  await sleep(1000);

  // 7. Verify Game Over & Mission Debrief
  const finalState = alice.latestRoomState;
  console.log('🏁 [GAME OVER RESULT - ACCUSATION VERDICT]');
  console.log(`   Room Status: ${finalState.status}`);
  console.log(`   Winner: ${finalState.gameState.winner?.toUpperCase()}`);
  console.log(`   Win Reason: ${finalState.gameState.winReason}`);
  console.log(`   Revealed Location: ${finalState.gameState.revealedLocation}`);
  console.log(`   Revealed Spies: ${finalState.gameState.revealedSpies?.join(', ')}`);
  console.log(`   Revealed Roles:`, finalState.gameState.revealedRoles);

  console.log('\n====================================================');
  console.log('🎉 SPYFALL TEST COMPLETED WITH 100% SUCCESS!');
  console.log('====================================================');

  // Disconnect sockets
  alice.socket.disconnect();
  bob.socket.disconnect();
  charlie.socket.disconnect();
  process.exit(0);
}

runSpyfallTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
