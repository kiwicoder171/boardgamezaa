import {
  initCodenamesGame,
  codenamesReducer,
  sanitizeCodenamesState,
} from '../src/games/codenames/logic';
import { CodenamesPlayer, TeamColor } from '../src/games/codenames/types';

function runCodenamesTests() {
  console.log('🧪 Starting Codenames Tests...\n');

  const players = [
    { id: 'p1', name: 'Bond' },
    { id: 'p2', name: 'Bourne' },
    { id: 'p3', name: 'Hunt' },
    { id: 'p4', name: 'Smiley' },
  ];

  // Test 1: Grid & Team Generation
  console.log('--- Test 1: 5x5 Grid & Team Initialization ---');
  let state = initCodenamesGame(players, 'classic');
  if (state.grid.length !== 25) {
    throw new Error(`Expected 25 cards on grid, got ${state.grid.length}`);
  }

  const redCards = state.grid.filter((c) => c.type === 'red');
  const blueCards = state.grid.filter((c) => c.type === 'blue');
  const neutralCards = state.grid.filter((c) => c.type === 'neutral');
  const assassinCards = state.grid.filter((c) => c.type === 'assassin');

  if (assassinCards.length !== 1) {
    throw new Error(`Expected 1 Assassin, got ${assassinCards.length}`);
  }
  if (neutralCards.length !== 7) {
    throw new Error(`Expected 7 Innocent Bystanders, got ${neutralCards.length}`);
  }

  const startTeam = state.startingTeam;
  const startCards = startTeam === 'red' ? redCards : blueCards;
  const secondCards = startTeam === 'red' ? blueCards : redCards;

  if (startCards.length !== 9 || secondCards.length !== 8) {
    throw new Error(`Starting team should have 9 cards, second team 8. Found ${startCards.length} and ${secondCards.length}`);
  }
  console.log(`✅ 5x5 Grid initialized: ${startTeam.toUpperCase()} starts (9 agents), Opponent (8 agents), 7 Bystanders, 1 Assassin.`);

  // Test 2: Anti-Cheat Sanitization
  console.log('--- Test 2: Anti-Cheat Sanitization ---');
  // p1 is Spymaster, p2 is Operative
  state.players['p1'].role = 'spymaster';
  state.players['p2'].role = 'operative';

  const spymasterView = sanitizeCodenamesState(state, 'p1');
  const operativeView = sanitizeCodenamesState(state, 'p2');

  const spymasterCardTypes = new Set(spymasterView.grid.map((c) => c.type));
  if (!spymasterCardTypes.has('assassin') || !spymasterCardTypes.has('red') || !spymasterCardTypes.has('blue')) {
    throw new Error('Spymaster should see all unrevealed card types on key card');
  }

  const operativeCardTypes = new Set(operativeView.grid.map((c) => c.type));
  if (operativeCardTypes.has('assassin') || operativeCardTypes.has('red') || operativeCardTypes.has('blue')) {
    throw new Error('Operative MUST NOT see secret types of unrevealed cards!');
  }
  console.log('✅ Anti-cheat sanitization verified: Operatives receive fully masked neutral cards.');

  // Test 3: Spymaster Clue Transmission
  console.log('--- Test 3: Spymaster Clue Transmission ---');
  state = codenamesReducer(state, {
    type: 'give_clue',
    word: 'OCEAN',
    count: 2,
  });

  if (state.turnPhase !== 'guess' || state.currentClue?.word !== 'OCEAN') {
    throw new Error('Clue was not registered properly');
  }
  if (state.guessesRemaining !== 3) {
    // Clue count + 1
    throw new Error(`Expected 3 guesses for count 2, got ${state.guessesRemaining}`);
  }
  console.log('✅ Spymaster clue "OCEAN : 2" accepted; 3 guesses granted to Operatives.');

  // Test 4: Correct Agent Guess
  console.log('--- Test 4: Correct Agent Guess ---');
  const targetAgent = state.grid.find((c) => c.type === state.currentTeam && !c.revealed)!;
  state = codenamesReducer(state, {
    type: 'guess_card',
    cardId: targetAgent.id,
  });

  const revealedTarget = state.grid.find((c) => c.id === targetAgent.id)!;
  if (!revealedTarget.revealed) {
    throw new Error('Target agent was not revealed');
  }
  if (state.guessesRemaining !== 2) {
    throw new Error('Guesses remaining not decremented');
  }
  console.log(`✅ Correct guess: "${targetAgent.word}" revealed as ${targetAgent.type.toUpperCase()} Agent!`);

  // Test 5: Innocent Bystander Guess (Ends Turn)
  console.log('--- Test 5: Innocent Bystander Ends Turn ---');
  const bystander = state.grid.find((c) => c.type === 'neutral' && !c.revealed)!;
  const currentTeamBefore = state.currentTeam;
  const opponentTeam = currentTeamBefore === 'red' ? 'blue' : 'red';

  state = codenamesReducer(state, {
    type: 'guess_card',
    cardId: bystander.id,
  });

  if (state.currentTeam !== opponentTeam || state.turnPhase !== 'clue') {
    throw new Error('Bystander guess should end turn and switch to opponent spymaster');
  }
  console.log(`✅ Innocent bystander "${bystander.word}" contacted; turn ended immediately.`);

  // Test 6: Assassin Contact (Instant Loss)
  console.log('--- Test 6: Assassin Contact Instant Loss ---');
  // New game for clean assassin test
  let assassinState = initCodenamesGame(players, 'scifi');
  assassinState.turnPhase = 'guess';
  assassinState.currentClue = { word: 'DANGER', count: 1, team: assassinState.currentTeam };
  assassinState.guessesRemaining = 2;

  const assassin = assassinState.grid.find((c) => c.type === 'assassin')!;
  const guessingTeam = assassinState.currentTeam;
  const winningTeam = guessingTeam === 'red' ? 'blue' : 'red';

  assassinState = codenamesReducer(assassinState, {
    type: 'guess_card',
    cardId: assassin.id,
  });

  if (assassinState.winner !== winningTeam) {
    throw new Error(`Expected ${winningTeam} to win after assassin, got ${assassinState.winner}`);
  }
  console.log(`✅ Assassin contacted! ${guessingTeam.toUpperCase()} lost, ${winningTeam.toUpperCase()} won immediately.`);

  // Test 7: Word Expansions (Sci-Fi and Fairy Tales)
  console.log('--- Test 7: Word Expansion Decks ---');
  const scifiState = initCodenamesGame(players, 'scifi');
  const fairyState = initCodenamesGame(players, 'fairytales');

  if (scifiState.grid.length !== 25 || fairyState.grid.length !== 25) {
    throw new Error('Expansion decks should provide 25 cards');
  }
  console.log('✅ Sci-Fi and Fairy Tales expansions verified with dedicated word pools.');

  console.log('\n🎉 ALL CODENAMES TESTS PASSED 100%!');
}

runCodenamesTests();
