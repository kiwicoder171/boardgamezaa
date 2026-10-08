import {
  CheeseThiefAction,
  CheeseThiefPlayer,
  CheeseThiefRole,
  CheeseThiefState,
} from './types';

export function initCheeseThiefState(
  rawPlayers: Array<{ id: string; name: string; avatar?: string }>,
  fallMouseEnabled = false
): CheeseThiefState {
  const playerCount = Math.max(rawPlayers.length, 4);
  const playerList = [...rawPlayers];

  // If fewer than 4 provided in test/dev, generate placeholder bots
  while (playerList.length < 4) {
    const idx = playerList.length + 1;
    playerList.push({
      id: `mouse_bot_${idx}`,
      name: `Mouse ${idx}`,
      avatar: '🐭',
    });
  }

  // Shuffle roles: 1 Thief, 1 Fall Mouse (if enabled and >= 5 players), rest Sleepyheads
  const roles: CheeseThiefRole[] = ['thief'];
  if (fallMouseEnabled && playerList.length >= 5) {
    roles.push('fall_mouse');
  }
  while (roles.length < playerList.length) {
    roles.push('sleepyhead');
  }

  // Fisher-Yates shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  const players: Record<string, CheeseThiefPlayer> = {};
  const playerOrder: string[] = [];

  playerList.forEach((p, idx) => {
    // Roll d6 (1 to 6)
    const dieValue = Math.floor(Math.random() * 6) + 1;
    players[p.id] = {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      seatIndex: idx,
      role: roles[idx],
      isFollower: false,
      dieValue,
      cupLifted: false,
      hasPeeked: false,
      peekedTargetId: null,
      peekedTargetDie: null,
      votedTargetId: null,
      isReady: false,
    };
    playerOrder.push(p.id);
  });

  return {
    phase: 'setup',
    currentHour: 0,
    hourDurationSeconds: 12,
    hourSecondsRemaining: 12,
    dayDiscussionSeconds: 180,
    daySecondsRemaining: 180,
    cheeseStolen: false,
    stolenAtHour: null,
    stolenBy: null,
    followerId: null,
    winner: null,
    winReason: null,
    fallMouseEnabled,
    players,
    playerOrder,
    logs: [
      {
        id: `log_${Date.now()}`,
        text: 'The mice gather around the tavern table. Everyone rolls their secret wake-up die under their cup!',
        timestamp: Date.now(),
      },
    ],
  };
}

export function cheeseThiefReducer(
  state: CheeseThiefState,
  action: CheeseThiefAction
): CheeseThiefState {
  switch (action.type) {
    case 'set_ready': {
      if (state.phase !== 'setup') return state;
      const player = state.players[action.playerId];
      if (!player) return state;

      const updatedPlayers = {
        ...state.players,
        [action.playerId]: {
          ...player,
          isReady: !player.isReady,
        },
      };

      const allReady = state.playerOrder.every(
        (id) => updatedPlayers[id]?.isReady
      );

      const nextState: CheeseThiefState = {
        ...state,
        players: updatedPlayers,
      };

      if (allReady) {
        return startNightTransition(nextState);
      }
      return nextState;
    }

    case 'toggle_fall_mouse': {
      if (state.phase !== 'setup') return state;
      return {
        ...state,
        fallMouseEnabled: action.enabled,
      };
    }

    case 'start_night': {
      if (state.phase !== 'setup') return state;
      return startNightTransition(state);
    }

    case 'advance_hour': {
      if (state.phase !== 'night') return state;
      return advanceNightHour(state);
    }

    case 'steal_cheese': {
      if (state.phase !== 'night') return state;
      const player = state.players[action.playerId];
      if (!player || player.role !== 'thief') return state;
      if (player.dieValue !== state.currentHour) return state;
      if (state.cheeseStolen) return state;

      const awakePlayerIds = state.playerOrder.filter(
        (id) => state.players[id].dieValue === state.currentHour
      );

      let followerId = state.followerId;
      const witnessSleepyheads = awakePlayerIds.filter(
        (id) => state.players[id].role === 'sleepyhead'
      );

      // If exactly 1 sleepyhead wakes with the thief, they automatically become the follower
      if (!followerId && witnessSleepyheads.length === 1) {
        followerId = witnessSleepyheads[0];
      }

      const updatedPlayers = { ...state.players };
      if (followerId && updatedPlayers[followerId]) {
        updatedPlayers[followerId] = {
          ...updatedPlayers[followerId],
          isFollower: true,
        };
      }

      return {
        ...state,
        cheeseStolen: true,
        stolenAtHour: state.currentHour,
        stolenBy: player.id,
        followerId,
        players: updatedPlayers,
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            hour: state.currentHour,
            text: `At Hour ${state.currentHour}:00, the Cheese was secretly swiped from the center of the table!`,
            timestamp: Date.now(),
          },
        ],
      };
    }

    case 'peek_cup': {
      if (state.phase !== 'night') return state;
      const player = state.players[action.playerId];
      const target = state.players[action.targetId];
      if (!player || !target || player.id === target.id) return state;
      if (player.role !== 'sleepyhead' && player.role !== 'fall_mouse') return state;
      if (player.dieValue !== state.currentHour) return state;
      if (player.hasPeeked) return state;

      // Check if player is the ONLY one awake at this hour
      const awakePlayerIds = state.playerOrder.filter(
        (id) => state.players[id].dieValue === state.currentHour
      );
      if (awakePlayerIds.length !== 1) {
        // Not alone; cannot peek
        return state;
      }

      return {
        ...state,
        players: {
          ...state.players,
          [player.id]: {
            ...player,
            hasPeeked: true,
            peekedTargetId: target.id,
            peekedTargetDie: target.dieValue,
          },
        },
      };
    }

    case 'choose_follower': {
      if (state.phase !== 'follower_selection' && state.phase !== 'night') return state;
      const player = state.players[action.playerId];
      const target = state.players[action.targetId];
      if (!player || !target || player.id === target.id) return state;
      if (player.role !== 'thief') return state;

      const updatedPlayers = {
        ...state.players,
        [target.id]: {
          ...target,
          isFollower: true,
        },
      };

      return {
        ...state,
        followerId: target.id,
        players: updatedPlayers,
        phase: 'day',
        daySecondsRemaining: state.dayDiscussionSeconds,
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            text: `Dawn breaks! The sun shines on the mouse tavern. The cheese plate is inspected!`,
            timestamp: Date.now(),
          },
        ],
      };
    }

    case 'start_voting': {
      if (state.phase !== 'day') return state;
      return {
        ...state,
        phase: 'voting',
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            text: 'Discussion closed! Point your mouse paws at your primary suspect!',
            timestamp: Date.now(),
          },
        ],
      };
    }

    case 'cast_vote': {
      if (state.phase !== 'voting') return state;
      const voter = state.players[action.playerId];
      const target = state.players[action.targetId];
      if (!voter || !target) return state;

      const updatedPlayers = {
        ...state.players,
        [voter.id]: {
          ...voter,
          votedTargetId: target.id,
        },
      };

      // Auto-cast for simulated bots
      state.playerOrder.forEach((id) => {
        if ((id.startsWith('bot_') || id.startsWith('mouse_bot_')) && !updatedPlayers[id].votedTargetId) {
          const eligibleTargets = state.playerOrder.filter((tId) => tId !== id);
          const randomTarget = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
          updatedPlayers[id] = {
            ...updatedPlayers[id],
            votedTargetId: randomTarget,
          };
        }
      });

      const allVoted = state.playerOrder.every(
        (id) => Boolean(updatedPlayers[id]?.votedTargetId)
      );

      const nextState: CheeseThiefState = {
        ...state,
        players: updatedPlayers,
      };

      if (allVoted) {
        return resolveVoteOutcome(nextState);
      }
      return nextState;
    }

    case 'resolve_votes': {
      if (state.phase !== 'voting') return state;
      return resolveVoteOutcome(state);
    }

    case 'tick_second': {
      if (state.phase === 'night') {
        const remaining = state.hourSecondsRemaining - 1;
        if (remaining <= 0) {
          return advanceNightHour(state);
        }
        return {
          ...state,
          hourSecondsRemaining: remaining,
        };
      }

      if (state.phase === 'follower_selection') {
        const remaining = state.hourSecondsRemaining - 1;
        if (remaining <= 0) {
          // Time expired for follower selection, proceed to day
          return {
            ...state,
            phase: 'day',
            daySecondsRemaining: state.dayDiscussionSeconds,
            logs: [
              ...state.logs,
              {
                id: `log_${Date.now()}`,
                text: 'Dawn breaks over the mouse tavern. The cheese is missing!',
                timestamp: Date.now(),
              },
            ],
          };
        }
        return {
          ...state,
          hourSecondsRemaining: remaining,
        };
      }

      if (state.phase === 'day') {
        const remaining = state.daySecondsRemaining - 1;
        if (remaining <= 0) {
          return {
            ...state,
            phase: 'voting',
            logs: [
              ...state.logs,
              {
                id: `log_${Date.now()}`,
                text: 'Time is up! Point your paws at who stole the cheese!',
                timestamp: Date.now(),
              },
            ],
          };
        }
        return {
          ...state,
          daySecondsRemaining: remaining,
        };
      }

      return state;
    }

    case 'reset_game': {
      return initCheeseThiefState(
        state.playerOrder.map((id) => ({
          id,
          name: state.players[id].name,
          avatar: state.players[id].avatar,
        })),
        state.fallMouseEnabled
      );
    }

    default:
      return state;
  }
}

function startNightTransition(state: CheeseThiefState): CheeseThiefState {
  return {
    ...state,
    phase: 'night',
    currentHour: 1,
    hourSecondsRemaining: state.hourDurationSeconds,
    logs: [
      ...state.logs,
      {
        id: `log_${Date.now()}`,
        hour: 1,
        text: 'Night falls over the mice tavern. Ssshhh... All eyes closed. Clock strikes 1:00 AM!',
        timestamp: Date.now(),
      },
    ],
  };
}

function advanceNightHour(state: CheeseThiefState): CheeseThiefState {
  if (state.currentHour < 6) {
    const nextHour = state.currentHour + 1;
    return {
      ...state,
      currentHour: nextHour,
      hourSecondsRemaining: state.hourDurationSeconds,
      logs: [
        ...state.logs,
        {
          id: `log_${Date.now()}`,
          hour: nextHour,
          text: `Clock strikes ${nextHour}:00 AM! Mice with die ${nextHour} open your eyes!`,
          timestamp: Date.now(),
        },
      ],
    };
  }

  // Finished hour 6. Check follower status
  const thief = Object.values(state.players).find((p) => p.role === 'thief');
  if (thief && !state.followerId) {
    // If thief has not chosen a follower yet, give 10 seconds follower selection window
    return {
      ...state,
      phase: 'follower_selection',
      currentHour: 7,
      hourSecondsRemaining: 10,
      logs: [
        ...state.logs,
        {
          id: `log_${Date.now()}`,
          text: 'Hour 6 ends. The Cheese Thief sneaks in the dark to recruit a secret follower...',
          timestamp: Date.now(),
        },
      ],
    };
  }

  // Go directly to day
  return {
    ...state,
    phase: 'day',
    currentHour: 7,
    daySecondsRemaining: state.dayDiscussionSeconds,
    logs: [
      ...state.logs,
      {
        id: `log_${Date.now()}`,
        text: 'Dawn breaks over the mouse tavern! All mice wake up. Look at the cheese plate!',
        timestamp: Date.now(),
      },
    ],
  };
}

function resolveVoteOutcome(state: CheeseThiefState): CheeseThiefState {
  // Tally votes
  const voteCounts: Record<string, number> = {};
  state.playerOrder.forEach((id) => (voteCounts[id] = 0));

  state.playerOrder.forEach((voterId) => {
    const targetId = state.players[voterId].votedTargetId;
    if (targetId && voteCounts[targetId] !== undefined) {
      voteCounts[targetId]++;
    }
  });

  // Find max votes
  let maxVotes = -1;
  state.playerOrder.forEach((id) => {
    if (voteCounts[id] > maxVotes) {
      maxVotes = voteCounts[id];
    }
  });

  const mostVotedIds = state.playerOrder.filter(
    (id) => voteCounts[id] === maxVotes
  );

  const thief = Object.values(state.players).find((p) => p.role === 'thief');
  const fallMouse = Object.values(state.players).find(
    (p) => p.role === 'fall_mouse'
  );

  let winner: 'sleepyheads' | 'thief' | 'fall_mouse' = 'thief';
  let winReason = '';

  // 1. Fall Mouse Check: Wins alone if strictly highest vote getter
  if (
    state.fallMouseEnabled &&
    fallMouse &&
    mostVotedIds.length === 1 &&
    mostVotedIds[0] === fallMouse.id
  ) {
    winner = 'fall_mouse';
    winReason = `The Fall Mouse (${fallMouse.name}) deceived everyone into voting for them and won alone!`;
  } else if (thief && mostVotedIds.includes(thief.id)) {
    // 2. Sleepyhead victory: The Cheese Thief was among the most voted!
    winner = 'sleepyheads';
    winReason = `The Sleepyheads correctly identified the Cheese Thief (${thief.name})! The cheese is saved!`;
  } else {
    // 3. Cheese Thief & Follower victory: The Thief avoided being the top accused!
    winner = 'thief';
    const follower = state.followerId ? state.players[state.followerId] : null;
    const followerMsg = follower
      ? ` and Follower ${follower.name}`
      : '';
    winReason = `The Cheese Thief (${thief?.name || 'Thief'})${followerMsg} framed innocent mice and escaped with the golden cheese!`;
  }

  return {
    ...state,
    phase: 'game_over',
    winner,
    winReason,
    logs: [
      ...state.logs,
      {
        id: `log_${Date.now()}`,
        text: `The vote has resolved: ${winReason}`,
        timestamp: Date.now(),
      },
    ],
  };
}

/**
 * Anti-cheat state sanitizer:
 * Mask other players' roles and secret dice values according to visibility rules.
 */
export function sanitizeCheeseThiefState(
  state: CheeseThiefState,
  viewerId: string
): CheeseThiefState {
  if (state.phase === 'game_over') {
    return state; // Full reveal on game over
  }

  const viewer = state.players[viewerId];
  const isViewerThief = viewer?.role === 'thief';
  const isViewerFollower = viewer?.isFollower ?? false;

  const sanitizedPlayers: Record<string, CheeseThiefPlayer> = {};

  for (const id of state.playerOrder) {
    const p = state.players[id];
    const isSelf = id === viewerId;

    // Secret die visibility:
    // - Always see your own die.
    // - If viewer peeked at this player, viewer can see their die.
    // - Otherwise masked as 0.
    const canSeeDie =
      isSelf || (viewer?.peekedTargetId === id && viewer.peekedTargetDie !== null);
    const visibleDie = canSeeDie ? p.dieValue : 0;

    // Role visibility:
    // - Always see own role.
    // - Never see others' roles before game_over.
    const visibleRole: CheeseThiefRole = isSelf ? p.role : 'sleepyhead';

    // Follower visibility:
    // - Follower knows they are follower.
    // - Thief knows who the follower is.
    // - Others don't know who the follower is.
    const visibleFollower =
      (isSelf && isViewerFollower) || (isViewerThief && p.isFollower);

    sanitizedPlayers[id] = {
      ...p,
      role: visibleRole,
      isFollower: visibleFollower,
      dieValue: visibleDie,
      votedTargetId: isSelf ? p.votedTargetId : null,
      peekedTargetId: isSelf ? p.peekedTargetId : null,
      peekedTargetDie: isSelf ? p.peekedTargetDie : null,
    };
  }

  return {
    ...state,
    stolenBy: isViewerThief ? state.stolenBy : null,
    followerId:
      isViewerThief || isViewerFollower
        ? state.followerId
        : null,
    players: sanitizedPlayers,
  };
}
