import { Player, Room } from '@/types/game';
import { LocationInfo, SPYFALL_LOCATIONS } from './data';
import { SpyfallAction, SpyfallClientState, SpyfallSettings, SpyfallState } from './types';

function getLocationsForPack(packId?: string): LocationInfo[] {
  if (!packId || packId === 'all') return SPYFALL_LOCATIONS;
  if (packId === 'transport') {
    return SPYFALL_LOCATIONS.filter((l) => l.category === 'Transport');
  }
  if (packId === 'city') {
    return SPYFALL_LOCATIONS.filter((l) => l.category === 'Public & Services');
  }
  if (packId === 'leisure') {
    return SPYFALL_LOCATIONS.filter((l) => l.category === 'Leisure & Fun');
  }
  return SPYFALL_LOCATIONS;
}

export function initSpyfallGame(players: Player[], settings: SpyfallSettings): SpyfallState {
  if (players.length < 3) {
    throw new Error('Spyfall requires at least 3 players');
  }

  // 1. Filter locations by chosen pack
  const eligibleLocations = getLocationsForPack(settings.locationPack);
  const locationIndex = Math.floor(Math.random() * eligibleLocations.length);
  const location = eligibleLocations[locationIndex];

  // 2. Determine spies (default 1 spy, max 2 if >= 6 players)
  const spyCount = Math.min(settings.spyCount || 1, Math.floor(players.length / 2));
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  const spies = shuffledPlayers.slice(0, spyCount).map((p) => p.id);

  // 3. Assign roles
  const nonSpyPlayers = shuffledPlayers.slice(spyCount);
  const shuffledRoles = [...location.roles].sort(() => Math.random() - 0.5);
  const roles: Record<string, string> = {};

  for (const spyId of spies) {
    roles[spyId] = 'SPY';
  }

  nonSpyPlayers.forEach((player, index) => {
    const role = shuffledRoles[index % shuffledRoles.length];
    roles[player.id] = role;
  });

  // 4. Starter asker
  const firstAsker = players[Math.floor(Math.random() * players.length)];

  return {
    selectedLocation: location.name,
    roles,
    spies,
    timeRemaining: (settings.roundMinutes || 8) * 60,
    isPaused: false,
    currentAskerId: firstAsker.id,
    currentAnswererId: null,
    lastNudgeAt: null,
    phase: 'questioning',
    accuserId: null,
    accusedId: null,
    votes: {},
    votingTimeRemaining: 45,
    winner: null,
    winReason: null,
    revealedLocation: null,
    history: [
      {
        id: 'start',
        text: `Round started! ${firstAsker.name} will ask the first question.`,
        time: Date.now(),
        type: 'info',
      },
    ],
  };
}

export function handleSpyfallAction(
  state: SpyfallState,
  action: SpyfallAction,
  playerId: string,
  room: Room<SpyfallState, SpyfallSettings>
): { newState: SpyfallState; events?: string[]; error?: string } {
  const player = room.players.find((p) => p.id === playerId);
  const playerName = player?.name || 'Someone';

  switch (action.type) {
    case 'TOGGLE_PAUSE': {
      if (room.hostId !== playerId) {
        return { newState: state, error: 'Only the host can pause/resume the game.' };
      }
      const nextPaused = !state.isPaused;
      return {
        newState: {
          ...state,
          isPaused: nextPaused,
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: nextPaused ? `⏸️ Game paused by ${playerName}.` : `▶️ Game resumed by ${playerName}.`,
              time: Date.now(),
              type: 'info',
            },
          ],
        },
      };
    }

    case 'NUDGE_PLAYER': {
      const target = room.players.find((p) => p.id === state.currentAnswererId);
      return {
        newState: {
          ...state,
          lastNudgeAt: Date.now(),
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `🔔 ${playerName} nudged ${target?.name || 'the current player'}!`,
              time: Date.now(),
              type: 'info',
            },
          ],
        },
      };
    }

    case 'SELECT_QUESTIONEE': {
      if (state.phase !== 'questioning') {
        return { newState: state, error: 'Cannot ask questions during accusation phase.' };
      }
      if (state.currentAskerId && state.currentAskerId !== playerId) {
        return { newState: state, error: 'It is not your turn to ask a question.' };
      }
      if (action.targetPlayerId === playerId) {
        return { newState: state, error: 'You cannot ask yourself a question!' };
      }

      const target = room.players.find((p) => p.id === action.targetPlayerId);
      if (!target) {
        return { newState: state, error: 'Target player not found.' };
      }

      return {
        newState: {
          ...state,
          currentAskerId: playerId,
          currentAnswererId: action.targetPlayerId,
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `${playerName} is asking ${target.name} a question.`,
              time: Date.now(),
              type: 'turn',
            },
          ],
        },
      };
    }

    case 'FINISH_ANSWER': {
      if (state.phase !== 'questioning') {
        return { newState: state, error: 'Invalid phase.' };
      }
      if (state.currentAnswererId !== playerId) {
        return { newState: state, error: 'You are not the current answerer.' };
      }

      return {
        newState: {
          ...state,
          currentAskerId: playerId,
          currentAnswererId: null,
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `${playerName} finished answering and now holds the floor.`,
              time: Date.now(),
              type: 'turn',
            },
          ],
        },
      };
    }

    case 'ACCUSE': {
      if (state.phase !== 'questioning') {
        return { newState: state, error: 'An accusation or guess is already in progress.' };
      }
      if (action.targetPlayerId === playerId) {
        return { newState: state, error: 'You cannot accuse yourself!' };
      }

      const accused = room.players.find((p) => p.id === action.targetPlayerId);
      if (!accused) {
        return { newState: state, error: 'Accused player not found.' };
      }

      return {
        newState: {
          ...state,
          phase: 'accusation',
          isPaused: true,
          accuserId: playerId,
          accusedId: action.targetPlayerId,
          votes: { [playerId]: true }, // Accuser votes guilty
          votingTimeRemaining: 45,
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `🚨 ${playerName} formally accused ${accused.name} of being the SPY!`,
              time: Date.now(),
              type: 'accuse',
            },
          ],
        },
      };
    }

    case 'CAST_VOTE': {
      if (state.phase !== 'accusation') {
        return { newState: state, error: 'Not in voting phase.' };
      }
      if (playerId === state.accusedId) {
        return { newState: state, error: 'The accused player cannot vote.' };
      }

      const newVotes = { ...state.votes, [playerId]: action.voteGuilty };
      const eligibleVoters = room.players.filter((p) => p.id !== state.accusedId);
      const allVoted = eligibleVoters.every((p) => newVotes[p.id] !== undefined);

      if (!allVoted) {
        return {
          newState: {
            ...state,
            votes: newVotes,
          },
        };
      }

      // Tally votes
      const guiltyVotes = Object.values(newVotes).filter(Boolean).length;
      const totalEligible = eligibleVoters.length;
      const accusedPlayer = room.players.find((p) => p.id === state.accusedId);
      const accusedName = accusedPlayer?.name || 'The accused';
      const isUnanimousGuilty = guiltyVotes === totalEligible;

      if (isUnanimousGuilty) {
        const isAccusedSpy = state.spies.includes(state.accusedId!);
        if (isAccusedSpy) {
          return {
            newState: {
              ...state,
              phase: 'gameover',
              votes: newVotes,
              winner: 'citizens',
              winReason: `Unanimous guilty verdict! ${accusedName} was caught as the SPY! Citizens win!`,
              revealedLocation: state.selectedLocation,
              history: [
                ...state.history,
                {
                  id: `${Date.now()}`,
                  text: `🎉 Unanimous guilty verdict! ${accusedName} was the SPY. Citizens win!`,
                  time: Date.now(),
                  type: 'verdict',
                },
              ],
            },
          };
        } else {
          return {
            newState: {
              ...state,
              phase: 'gameover',
              votes: newVotes,
              winner: 'spy',
              winReason: `Fatal mistake! ${accusedName} was an innocent citizen (${state.roles[state.accusedId!] || 'Citizen'}). The SPY escaped!`,
              revealedLocation: state.selectedLocation,
              history: [
                ...state.history,
                {
                  id: `${Date.now()}`,
                  text: `💀 Wrong conviction! ${accusedName} was innocent. The SPY wins!`,
                  time: Date.now(),
                  type: 'verdict',
                },
              ],
            },
          };
        }
      } else {
        return {
          newState: {
            ...state,
            phase: 'questioning',
            isPaused: false,
            accuserId: null,
            accusedId: null,
            votes: {},
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `Vote failed (${guiltyVotes}/${totalEligible} guilty votes). Accusation dismissed. Resuming round.`,
                time: Date.now(),
                type: 'info',
              },
            ],
          },
        };
      }
    }

    case 'CANCEL_ACCUSATION': {
      if (state.phase !== 'accusation' || state.accuserId !== playerId) {
        return { newState: state, error: 'Cannot cancel accusation.' };
      }
      return {
        newState: {
          ...state,
          phase: 'questioning',
          isPaused: false,
          accuserId: null,
          accusedId: null,
          votes: {},
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `${playerName} withdrew the accusation. Resuming questioning.`,
              time: Date.now(),
              type: 'info',
            },
          ],
        },
      };
    }

    case 'SPY_GUESS': {
      if (!state.spies.includes(playerId)) {
        return { newState: state, error: 'Only a spy can make a location guess.' };
      }

      const isCorrect =
        action.locationName.trim().toLowerCase() === state.selectedLocation.trim().toLowerCase();

      if (isCorrect) {
        return {
          newState: {
            ...state,
            phase: 'gameover',
            winner: 'spy',
            winReason: `The SPY (${playerName}) correctly deduced the location: ${state.selectedLocation}! Spy wins!`,
            revealedLocation: state.selectedLocation,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `🕵️‍♂️ ${playerName} revealed themselves as the SPY and correctly guessed: ${state.selectedLocation}!`,
                time: Date.now(),
                type: 'verdict',
              },
            ],
          },
        };
      } else {
        return {
          newState: {
            ...state,
            phase: 'gameover',
            winner: 'citizens',
            winReason: `The SPY (${playerName}) guessed incorrectly (${action.locationName}). The real location was ${state.selectedLocation}. Citizens win!`,
            revealedLocation: state.selectedLocation,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `🕵️‍♂️ ${playerName} guessed incorrectly (${action.locationName})! Real location was ${state.selectedLocation}. Citizens win!`,
                time: Date.now(),
                type: 'verdict',
              },
            ],
          },
        };
      }
    }

    case 'TIMES_UP': {
      if (state.phase !== 'questioning') return { newState: state };
      return {
        newState: {
          ...state,
          timeRemaining: 0,
          phase: 'gameover',
          winner: 'spy',
          winReason: `Time ran out before the spy was caught! The SPY wins! Location was ${state.selectedLocation}.`,
          revealedLocation: state.selectedLocation,
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `⏰ Time expired! The SPY survived and wins!`,
              time: Date.now(),
              type: 'verdict',
            },
          ],
        },
      };
    }

    case 'TIMER_TICK': {
      if (state.phase !== 'questioning' || state.isPaused) return { newState: state };
      const elapsed = action.secondsElapsed || 1;
      const nextTime = Math.max(0, state.timeRemaining - elapsed);
      if (nextTime <= 0) {
        return handleSpyfallAction(state, { type: 'TIMES_UP' }, playerId, room);
      }
      return {
        newState: {
          ...state,
          timeRemaining: nextTime,
        },
      };
    }

    default:
      return { newState: state };
  }
}

export function handleSpyfallTimerTick(state: SpyfallState): {
  newState: SpyfallState;
  triggeredGameOver?: boolean;
} {
  if (state.phase === 'gameover' || state.isPaused) {
    return { newState: state };
  }

  if (state.phase === 'questioning') {
    const nextTime = state.timeRemaining - 1;
    if (nextTime <= 0) {
      return {
        newState: {
          ...state,
          timeRemaining: 0,
          phase: 'gameover',
          winner: 'spy',
          winReason: `Time ran out before the spy was caught! The SPY wins! Location was ${state.selectedLocation}.`,
          revealedLocation: state.selectedLocation,
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `⏰ Time expired! The SPY survived and wins!`,
              time: Date.now(),
              type: 'verdict',
            },
          ],
        },
        triggeredGameOver: true,
      };
    }

    return {
      newState: {
        ...state,
        timeRemaining: nextTime,
      },
    };
  }

  if (state.phase === 'accusation') {
    const nextVotingTime = state.votingTimeRemaining - 1;
    if (nextVotingTime <= 0) {
      return {
        newState: {
          ...state,
          phase: 'questioning',
          isPaused: false,
          accuserId: null,
          accusedId: null,
          votes: {},
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `Voting time expired. Accusation dismissed.`,
              time: Date.now(),
              type: 'info',
            },
          ],
        },
      };
    }
    return {
      newState: {
        ...state,
        votingTimeRemaining: nextVotingTime,
      },
    };
  }

  return { newState: state };
}

export function sanitizeSpyfallState(
  state: SpyfallState,
  playerId: string
): SpyfallClientState {
  const isSpy = state.spies.includes(playerId);
  const isGameOver = state.phase === 'gameover';

  return {
    timeRemaining: state.timeRemaining,
    isPaused: state.isPaused,
    currentAskerId: state.currentAskerId,
    currentAnswererId: state.currentAnswererId,
    lastNudgeAt: state.lastNudgeAt,
    phase: state.phase,
    accuserId: state.accuserId,
    accusedId: state.accusedId,
    votes: state.votes,
    votingTimeRemaining: state.votingTimeRemaining,
    winner: state.winner,
    winReason: state.winReason,
    revealedLocation: isGameOver ? state.selectedLocation : null,
    history: state.history,
    locations: SPYFALL_LOCATIONS,

    // Secret sanitized player info
    isSpy,
    myRole: isSpy ? 'SPY' : state.roles[playerId] || 'Citizen',
    myLocation: isSpy ? null : state.selectedLocation,
    revealedSpies: isGameOver ? state.spies : undefined,
    revealedRoles: isGameOver ? state.roles : undefined,
  };
}
