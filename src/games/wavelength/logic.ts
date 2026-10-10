import { Player } from '@/types/game';
import {
  WavelengthAction,
  WavelengthSettings,
  WavelengthState,
  TeamId,
  ScoreHistoryEntry,
} from './types';
import { getRandomSpectrumCard, SPECTRUM_CARDS } from './cards';

const WEDGE_RADIUS = {
  BULLSEYE: 4.5, // ±4.5 deg -> 4 pts
  INNER: 11.0,   // ±11 deg -> 3 pts
  OUTER: 19.0,   // ±19 deg -> 2 pts
};

export function calculateWedgePoints(targetAngle: number, dialAngle: number): {
  points: number;
  zone: 'bullseye' | 'inner' | 'outer' | 'miss';
  diff: number;
} {
  const diff = Math.abs(dialAngle - targetAngle);
  if (diff <= WEDGE_RADIUS.BULLSEYE) {
    return { points: 4, zone: 'bullseye', diff };
  }
  if (diff <= WEDGE_RADIUS.INNER) {
    return { points: 3, zone: 'inner', diff };
  }
  if (diff <= WEDGE_RADIUS.OUTER) {
    return { points: 2, zone: 'outer', diff };
  }
  return { points: 0, zone: 'miss', diff };
}

// Generate random target angle between 22° and 158° to keep wedge on dial
export function generateRandomTargetAngle(): number {
  return Math.floor(22 + Math.random() * 136);
}

export function initWavelengthState(
  players: Player[],
  settings?: Partial<WavelengthSettings>
): WavelengthState {
  const mode = settings?.mode || (players.length <= 2 ? 'coop' : 'competitive');
  const targetScore = settings?.targetScore ?? (mode === 'competitive' ? 10 : 16);

  // Divide players into two teams: Brain vs Mind
  const brainPlayers: string[] = [];
  const mindPlayers: string[] = [];

  if (mode === 'coop') {
    // In co-op party mode, all players cooperate together
    players.forEach((p) => {
      brainPlayers.push(p.id);
    });
  } else {
    players.forEach((p, index) => {
      if (index % 2 === 0) {
        brainPlayers.push(p.id);
      } else {
        mindPlayers.push(p.id);
      }
    });

    // If competitive but second team is empty, split evenly
    if (mindPlayers.length === 0 && brainPlayers.length > 1) {
      const moved = brainPlayers.pop();
      if (moved) mindPlayers.push(moved);
    }
  }

  const initialCard = getRandomSpectrumCard();
  const targetAngle = generateRandomTargetAngle();

  const activeTeam: TeamId = 'brain';
  const psychicId = brainPlayers[0] || players[0]?.id || '';
  const initialGuessers = brainPlayers.filter((id) => id !== psychicId);
  const dialCaptainId = initialGuessers[0] || (players.length > 1 ? players.find((p) => p.id !== psychicId)?.id : psychicId);

  return {
    mode,
    targetScore,
    phase: 'clue',
    round: 1,
    maxRounds: 7,
    activeTeam,
    teams: {
      brain: {
        name: 'Team Brain (สมองซีกซ้าย)',
        playerIds: brainPlayers,
        score: 0,
        psychicIndex: 0,
      },
      mind: {
        name: 'Team Mind (จิตวิญญาณ)',
        playerIds: mindPlayers,
        score: 0,
        psychicIndex: -1,
      },
    },
    psychicId,
    dialCaptainId,
    currentCard: initialCard,
    targetAngle,
    dialAngle: 90,
    clue: '',
    counterGuess: null,
    shutterOpen: false,
    lastRoundResult: null,
    winnerTeam: null,
    history: [],
    usedCardIds: [initialCard.id],
  };
}

export function wavelengthReducer(
  state: WavelengthState,
  action: WavelengthAction,
  playerId: string
): { newState: WavelengthState; error?: string } {
  switch (action.type) {
    case 'SUBMIT_CLUE': {
      if (state.phase !== 'clue') {
        return { newState: state, error: 'Cannot submit clue in this phase' };
      }
      if (playerId !== state.psychicId) {
        return { newState: state, error: 'Only the active Psychic can give a clue' };
      }
      const trimmedClue = action.clue?.trim();
      if (!trimmedClue) {
        return { newState: state, error: 'Clue cannot be empty' };
      }

      return {
        newState: {
          ...state,
          clue: trimmedClue,
          phase: 'guessing',
        },
      };
    }

    case 'ROTATE_DIAL': {
      if (state.phase !== 'guessing') {
        return { newState: state, error: 'Dial can only be rotated during guessing phase' };
      }
      // Clamped between 0° and 180°
      const clampedAngle = Math.max(0, Math.min(180, Math.round(action.angle)));
      return {
        newState: {
          ...state,
          dialAngle: clampedAngle,
        },
      };
    }

    case 'LOCK_GUESS': {
      if (state.phase !== 'guessing') {
        return { newState: state, error: 'Cannot lock guess in current phase' };
      }
      const guessingTeam =
        state.mode === 'coop'
          ? state.teams.brain.playerIds
          : state.teams[state.activeTeam].playerIds;
      if (guessingTeam.length > 1 && playerId === state.psychicId && !playerId.startsWith('bot_')) {
        return { newState: state, error: 'The Psychic cannot lock the guess' };
      }

      // If Co-op mode, skip counter-guess and reveal directly
      if (state.mode === 'coop') {
        const { points, zone, diff } = calculateWedgePoints(
          state.targetAngle ?? 90,
          state.dialAngle
        );

        const newBrainScore = state.teams.brain.score + points;
        const isGameOver = state.round >= state.maxRounds;

        const historyEntry: ScoreHistoryEntry = {
          round: state.round,
          activeTeam: 'coop',
          psychicName: state.psychicId,
          card: state.currentCard,
          clue: state.clue,
          targetAngle: state.targetAngle ?? 90,
          dialAngle: state.dialAngle,
          points,
        };

        return {
          newState: {
            ...state,
            phase: isGameOver ? 'gameover' : 'reveal',
            shutterOpen: true,
            teams: {
              ...state.teams,
              brain: {
                ...state.teams.brain,
                score: newBrainScore,
              },
            },
            lastRoundResult: {
              points,
              zone,
              diff,
            },
            winnerTeam: isGameOver ? 'coop_victory' : null,
            history: [historyEntry, ...state.history],
          },
        };
      }

      // In competitive mode, advance to counter-guess
      return {
        newState: {
          ...state,
          phase: 'counter_guess',
        },
      };
    }

    case 'SUBMIT_COUNTER_GUESS': {
      if (state.phase !== 'counter_guess') {
        return { newState: state, error: 'Counter-guess not active' };
      }

      const opposingTeamId: TeamId = state.activeTeam === 'brain' ? 'mind' : 'brain';
      const isOpposingMember = state.teams[opposingTeamId].playerIds.includes(playerId);

      // In competitive matches, ensure opposing team member or host can submit
      const guess = action.guess;
      const target = state.targetAngle ?? 90;
      const dial = state.dialAngle;

      const { points: activePoints, zone, diff } = calculateWedgePoints(target, dial);

      // Opposing team scores +1 point if their guess is correct AND active team did not get a 4-pt bullseye
      let counterCorrect = false;
      let counterPoints = 0;

      if (guess === 'left' && target < dial) {
        counterCorrect = true;
      } else if (guess === 'right' && target > dial) {
        counterCorrect = true;
      }

      if (counterCorrect && activePoints < 4) {
        counterPoints = 1;
      }

      const updatedTeams = {
        ...state.teams,
        [state.activeTeam]: {
          ...state.teams[state.activeTeam],
          score: state.teams[state.activeTeam].score + activePoints,
        },
        [opposingTeamId]: {
          ...state.teams[opposingTeamId],
          score: state.teams[opposingTeamId].score + counterPoints,
        },
      };

      const brainScore = updatedTeams.brain.score;
      const mindScore = updatedTeams.mind.score;

      let winner: TeamId | null = null;
      if (brainScore >= state.targetScore || mindScore >= state.targetScore) {
        if (brainScore > mindScore) winner = 'brain';
        else if (mindScore > brainScore) winner = 'mind';
        // Tied sudden death continues if both hit >= targetScore with same points
      }

      const historyEntry: ScoreHistoryEntry = {
        round: state.round,
        activeTeam: state.activeTeam,
        psychicName: state.psychicId,
        card: state.currentCard,
        clue: state.clue,
        targetAngle: target,
        dialAngle: dial,
        points: activePoints,
        counterGuess: guess,
        counterPoints,
      };

      return {
        newState: {
          ...state,
          phase: winner ? 'gameover' : 'reveal',
          shutterOpen: true,
          counterGuess: guess,
          teams: updatedTeams,
          lastRoundResult: {
            points: activePoints,
            zone,
            diff,
            counterCorrect,
            counterPoints,
          },
          winnerTeam: winner,
          history: [historyEntry, ...state.history],
        },
      };
    }

    case 'REROLL_CARD': {
      if (state.phase !== 'clue') {
        return { newState: state, error: 'Cannot change card outside clue phase' };
      }
      if (playerId !== state.psychicId && !playerId.startsWith('bot_')) {
        return { newState: state, error: 'Only the Psychic can change the card' };
      }
      const nextCard = getRandomSpectrumCard(state.usedCardIds);
      const nextTargetAngle = generateRandomTargetAngle();
      return {
        newState: {
          ...state,
          currentCard: nextCard,
          targetAngle: nextTargetAngle,
          usedCardIds: [...state.usedCardIds, nextCard.id],
        },
      };
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'reveal') {
        return { newState: state, error: 'Cannot advance until current round is revealed' };
      }

      const nextRound = state.round + 1;
      const nextCard = getRandomSpectrumCard(state.usedCardIds);
      const nextTargetAngle = generateRandomTargetAngle();

      if (state.mode === 'coop') {
        // Rotate psychic through all players fairly
        const allPlayers =
          state.teams.brain.playerIds.length > 0
            ? state.teams.brain.playerIds
            : [...state.teams.brain.playerIds, ...state.teams.mind.playerIds];
        const currentIdx = allPlayers.indexOf(state.psychicId);
        const nextIdx = (currentIdx + 1) % allPlayers.length;
        const nextPsychic = allPlayers[nextIdx] || allPlayers[0];
        const guessers = allPlayers.filter((id) => id !== nextPsychic);
        const nextDialCaptain = guessers[0] || nextPsychic;

        return {
          newState: {
            ...state,
            phase: 'clue',
            round: nextRound,
            psychicId: nextPsychic,
            dialCaptainId: nextDialCaptain,
            currentCard: nextCard,
            targetAngle: nextTargetAngle,
            dialAngle: 90,
            clue: '',
            counterGuess: null,
            shutterOpen: false,
            lastRoundResult: null,
            usedCardIds: [...state.usedCardIds, nextCard.id],
          },
        };
      }

      // Competitive mode: swap active team
      const nextActiveTeam: TeamId = state.activeTeam === 'brain' ? 'mind' : 'brain';
      const teamPlayers = state.teams[nextActiveTeam].playerIds;

      // Advance this team's psychic index so EVERY team member gets a turn
      const prevIdx = state.teams[nextActiveTeam].psychicIndex ?? -1;
      const nextIdx = teamPlayers.length > 0 ? (prevIdx + 1) % teamPlayers.length : 0;
      const nextPsychic = teamPlayers[nextIdx] || teamPlayers[0] || state.psychicId;

      const teamGuessers = teamPlayers.filter((id) => id !== nextPsychic);
      const nextDialCaptain = teamGuessers[0] || nextPsychic;

      return {
        newState: {
          ...state,
          phase: 'clue',
          round: nextRound,
          activeTeam: nextActiveTeam,
          teams: {
            ...state.teams,
            [nextActiveTeam]: {
              ...state.teams[nextActiveTeam],
              psychicIndex: nextIdx,
            },
          },
          psychicId: nextPsychic,
          dialCaptainId: nextDialCaptain,
          currentCard: nextCard,
          targetAngle: nextTargetAngle,
          dialAngle: 90,
          clue: '',
          counterGuess: null,
          shutterOpen: false,
          lastRoundResult: null,
          usedCardIds: [...state.usedCardIds, nextCard.id],
        },
      };
    }

    case 'SWITCH_TEAM': {
      const targetTeam = action.team;
      const otherTeam: TeamId = targetTeam === 'brain' ? 'mind' : 'brain';

      return {
        newState: {
          ...state,
          teams: {
            ...state.teams,
            [targetTeam]: {
              ...state.teams[targetTeam],
              playerIds: Array.from(new Set([...state.teams[targetTeam].playerIds, action.playerId])),
            },
            [otherTeam]: {
              ...state.teams[otherTeam],
              playerIds: state.teams[otherTeam].playerIds.filter((id) => id !== action.playerId),
            },
          },
        },
      };
    }

    default:
      return { newState: state };
  }
}

// Anti-Cheat State Masking
export function sanitizeWavelengthState(
  state: WavelengthState,
  viewerPlayerId: string
): WavelengthState {
  // If shutter is open or viewer is the active Psychic, they see the true target
  if (state.shutterOpen || viewerPlayerId === state.psychicId) {
    return state;
  }

  // Otherwise, hide targetAngle completely from all clients
  return {
    ...state,
    targetAngle: null,
  };
}

// Automated Bot Play logic
export function getWavelengthBotAction(
  state: WavelengthState,
  botPlayerId: string
): WavelengthAction | null {
  // 1. Bot is the Psychic giving a clue
  if (state.phase === 'clue' && state.psychicId === botPlayerId) {
    const angle = state.targetAngle ?? 90;
    const card = state.currentCard;

    let clue = '';
    // Left side (0° - 60°)
    if (angle < 60) {
      clue = `Definitely more ${card.left}`;
    }
    // Mid-left (60° - 85°)
    else if (angle < 85) {
      clue = `Slightly towards ${card.left}`;
    }
    // Middle (85° - 95°)
    else if (angle <= 95) {
      clue = `Right in the middle of both`;
    }
    // Mid-right (95° - 120°)
    else if (angle <= 120) {
      clue = `Leaning ${card.right}`;
    }
    // Far right (120° - 180°)
    else {
      clue = `Extremely ${card.right}!`;
    }

    return { type: 'SUBMIT_CLUE', clue };
  }

  // 2. Bot on active team during guessing phase
  const isBotActiveTeam =
    state.mode === 'coop' ||
    state.teams[state.activeTeam].playerIds.includes(botPlayerId);

  if (state.phase === 'guessing' && isBotActiveTeam && state.psychicId !== botPlayerId) {
    // If dial hasn't been moved yet, nudge dial toward target with human variance
    const trueAngle = state.targetAngle ?? 90;
    const noise = (Math.random() - 0.5) * 20; // ±10° noise
    const guessedAngle = Math.max(10, Math.min(170, Math.round(trueAngle + noise)));

    return { type: 'ROTATE_DIAL', angle: guessedAngle };
  }

  // 3. Bot on opposing team for counter-guess
  const opposingTeamId: TeamId = state.activeTeam === 'brain' ? 'mind' : 'brain';
  const isBotOpponent =
    state.mode === 'competitive' &&
    state.teams[opposingTeamId].playerIds.includes(botPlayerId);

  if (state.phase === 'counter_guess' && isBotOpponent) {
    const trueAngle = state.targetAngle ?? 90;
    const dial = state.dialAngle;
    const choice: 'left' | 'right' = trueAngle < dial ? 'left' : 'right';
    return { type: 'SUBMIT_COUNTER_GUESS', guess: choice };
  }

  return null;
}
