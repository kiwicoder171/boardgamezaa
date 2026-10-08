import {
  CardType,
  CodenamesAction,
  CodenamesCard,
  CodenamesPlayer,
  CodenamesState,
  PlayerRole,
  TeamColor,
  WordDeckTheme,
} from './types';
import { getWordDeck } from './words';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function initCodenamesGame(
  rawPlayers: Array<{ id: string; name: string; avatar?: string }>,
  theme: WordDeckTheme = 'classic'
): CodenamesState {
  const count = Math.max(4, rawPlayers.length);
  const playerList = [...rawPlayers];

  while (playerList.length < 4) {
    const idx = playerList.length + 1;
    playerList.push({ id: `bot_${idx}`, name: `Agent ${idx}`, avatar: '🕵️' });
  }

  // Pick 25 unique random words
  const fullDeck = getWordDeck(theme);
  const pickedWords = shuffle(fullDeck).slice(0, 25);

  // Starting team chosen randomly (gets 9 agents, second team gets 8)
  const startingTeam: TeamColor = Math.random() < 0.5 ? 'red' : 'blue';
  const secondTeam: TeamColor = startingTeam === 'red' ? 'blue' : 'red';

  // 9 start agents, 8 second agents, 7 neutrals, 1 assassin = 25 cards
  const types: CardType[] = [
    ...Array(9).fill(startingTeam),
    ...Array(8).fill(secondTeam),
    ...Array(7).fill('neutral'),
    'assassin',
  ];

  const shuffledTypes = shuffle(types);

  const grid: CodenamesCard[] = pickedWords.map((word, idx) => ({
    id: `card_${idx}`,
    word,
    type: shuffledTypes[idx],
    revealed: false,
  }));

  // Distribute players into Red and Blue teams
  const players: Record<string, CodenamesPlayer> = {};
  const playerOrder: string[] = [];

  playerList.forEach((p, idx) => {
    const team: TeamColor = idx % 2 === 0 ? 'red' : 'blue';
    // First person on each team is designated Spymaster by default
    const isFirstOnTeam = !Object.values(players).some((pl) => pl.team === team);
    const role: PlayerRole = isFirstOnTeam ? 'spymaster' : 'operative';

    players[p.id] = {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      team,
      role,
    };
    playerOrder.push(p.id);
  });

  return {
    theme,
    grid,
    startingTeam,
    currentTeam: startingTeam,
    turnPhase: 'clue',
    currentClue: null,
    guessesRemaining: 0,
    redRemaining: startingTeam === 'red' ? 9 : 8,
    blueRemaining: startingTeam === 'blue' ? 9 : 8,
    winner: null,
    winReason: null,
    players,
    playerOrder,
    logs: [
      {
        id: `log_${Date.now()}`,
        text: `Top-Secret Dossiers unsealed! ${startingTeam.toUpperCase()} Team has the initiative (9 agents). Spymasters, consult your classified key cards!`,
        timestamp: Date.now(),
      },
    ],
  };
}

export function codenamesReducer(
  state: CodenamesState,
  action: CodenamesAction,
  actingPlayerId?: string
): CodenamesState {
  if (state.winner && action.type !== 'reset_game') {
    return state;
  }

  switch (action.type) {
    case 'set_team': {
      const p = state.players[action.playerId];
      if (!p) return state;
      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...p,
            team: action.team,
          },
        },
      };
    }

    case 'set_role': {
      const p = state.players[action.playerId];
      if (!p) return state;
      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...p,
            role: action.role,
          },
        },
      };
    }

    case 'give_clue': {
      if (state.turnPhase !== 'clue') return state;
      const { word, count } = action;
      const cleanWord = word.trim().toUpperCase();
      if (!cleanWord || count < 0) return state;

      // Verification: Clue must not be any unrevealed word on the grid
      const matchingUnrevealed = state.grid.some(
        (c) => !c.revealed && c.word.toUpperCase() === cleanWord
      );
      if (matchingUnrevealed) return state;

      const guesses = count === 0 ? 99 : count + 1;

      return {
        ...state,
        turnPhase: 'guess',
        currentClue: {
          word: cleanWord,
          count,
          team: state.currentTeam,
        },
        guessesRemaining: guesses,
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            text: `🔎 ${state.currentTeam.toUpperCase()} Spymaster issued clue: "${cleanWord}" for ${count} card(s). Field Operatives are now guessing!`,
            timestamp: Date.now(),
          },
        ],
      };
    }

    case 'guess_card': {
      if (state.turnPhase !== 'guess') return state;
      const card = state.grid.find((c) => c.id === action.cardId);
      if (!card || card.revealed) return state;

      // Reveal card
      const newGrid = state.grid.map((c) =>
        c.id === card.id ? { ...c, revealed: true } : c
      );

      let nextRedRemaining = state.redRemaining;
      let nextBlueRemaining = state.blueRemaining;
      const team = state.currentTeam;
      const opponentTeam: TeamColor = team === 'red' ? 'blue' : 'red';

      // 1. Assassin Contacted
      if (card.type === 'assassin') {
        const winner = opponentTeam;
        const winReason = `💀 ${team.toUpperCase()} Team contacted the Assassin ("${card.word}")! ${winner.toUpperCase()} Team wins the game!`;
        return {
          ...state,
          grid: newGrid,
          winner,
          winReason,
          logs: [
            ...state.logs,
            {
              id: `log_${Date.now()}`,
              text: winReason,
              timestamp: Date.now(),
            },
          ],
        };
      }

      // 2. Red Agent Contacted
      if (card.type === 'red') {
        nextRedRemaining--;
        if (nextRedRemaining === 0) {
          const winReason = `🎉 RED Team successfully established contact with all their secret agents! RED Team wins!`;
          return {
            ...state,
            grid: newGrid,
            redRemaining: 0,
            winner: 'red',
            winReason,
            logs: [
              ...state.logs,
              {
                id: `log_${Date.now()}`,
                text: winReason,
                timestamp: Date.now(),
              },
            ],
          };
        }
      }

      // 3. Blue Agent Contacted
      if (card.type === 'blue') {
        nextBlueRemaining--;
        if (nextBlueRemaining === 0) {
          const winReason = `🎉 BLUE Team successfully established contact with all their secret agents! BLUE Team wins!`;
          return {
            ...state,
            grid: newGrid,
            blueRemaining: 0,
            winner: 'blue',
            winReason,
            logs: [
              ...state.logs,
              {
                id: `log_${Date.now()}`,
                text: winReason,
                timestamp: Date.now(),
              },
            ],
          };
        }
      }

      // 4. Check if guess was for current team
      if (card.type === team) {
        const remainingGuesses = state.guessesRemaining - 1;
        const logMsg = `✓ ${team.toUpperCase()} Team correctly contacted their agent: "${card.word}"! (${remainingGuesses} guesses left).`;

        if (remainingGuesses <= 0) {
          // Out of guesses, turn switches to opponent
          return {
            ...state,
            grid: newGrid,
            redRemaining: nextRedRemaining,
            blueRemaining: nextBlueRemaining,
            currentTeam: opponentTeam,
            turnPhase: 'clue',
            currentClue: null,
            guessesRemaining: 0,
            logs: [
              ...state.logs,
              {
                id: `log_${Date.now()}`,
                text: `${logMsg} Turn ends. It is now ${opponentTeam.toUpperCase()} Spymaster's turn.`,
                timestamp: Date.now(),
              },
            ],
          };
        }

        // Can continue guessing
        return {
          ...state,
          grid: newGrid,
          redRemaining: nextRedRemaining,
          blueRemaining: nextBlueRemaining,
          guessesRemaining: remainingGuesses,
          logs: [
            ...state.logs,
            {
              id: `log_${Date.now()}`,
              text: logMsg,
              timestamp: Date.now(),
            },
          ],
        };
      }

      // 5. Wrong guess (Opponent agent or Neutral bystander) -> Turn ends immediately!
      const wrongTypeMsg =
        card.type === 'neutral'
          ? `Innocent Bystander`
          : `${opponentTeam.toUpperCase()} Agent`;

      return {
        ...state,
        grid: newGrid,
        redRemaining: nextRedRemaining,
        blueRemaining: nextBlueRemaining,
        currentTeam: opponentTeam,
        turnPhase: 'clue',
        currentClue: null,
        guessesRemaining: 0,
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            text: `✕ ${team.toUpperCase()} Team contacted a ${wrongTypeMsg} ("${card.word}"). Turn ends! Over to ${opponentTeam.toUpperCase()} Team.`,
            timestamp: Date.now(),
          },
        ],
      };
    }

    case 'end_guessing': {
      if (state.turnPhase !== 'guess') return state;
      const nextTeam: TeamColor = state.currentTeam === 'red' ? 'blue' : 'red';
      return {
        ...state,
        currentTeam: nextTeam,
        turnPhase: 'clue',
        currentClue: null,
        guessesRemaining: 0,
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            text: `${state.currentTeam.toUpperCase()} Team concluded their turn. Over to ${nextTeam.toUpperCase()} Team Spymaster.`,
            timestamp: Date.now(),
          },
        ],
      };
    }

    case 'reset_game': {
      return initCodenamesGame(
        state.playerOrder.map((id) => ({
          id,
          name: state.players[id].name,
          avatar: state.players[id].avatar,
        })),
        state.theme
      );
    }

    default:
      return state;
  }
}

/**
 * Anti-Cheat State Sanitizer:
 * Spymasters see all card identities.
 * Field Operatives ONLY see revealed card identities. Unrevealed cards are masked as 'neutral'
 * so they cannot inspect websocket payloads or DOM to cheat!
 */
export function sanitizeCodenamesState(
  state: CodenamesState,
  viewerId: string
): CodenamesState {
  // If game is over, reveal everything for post-game analysis
  if (state.winner !== null) {
    return state;
  }

  const viewer = state.players[viewerId];
  const isSpymaster = viewer?.role === 'spymaster';

  if (isSpymaster) {
    return state; // Spymasters have full key card vision
  }

  // Operatives and spectators: Mask unrevealed card types
  const sanitizedGrid = state.grid.map((card) => {
    if (card.revealed) {
      return card;
    }
    return {
      ...card,
      type: 'neutral' as CardType, // Mask unrevealed type
    };
  });

  return {
    ...state,
    grid: sanitizedGrid,
  };
}
