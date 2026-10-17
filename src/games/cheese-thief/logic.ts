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
      isReady: p.id.startsWith('bot_') || p.id.startsWith('mouse_bot_'),
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
      if (state.phase !== 'night') return state;
      const player = state.players[action.playerId];
      const target = state.players[action.targetId];
      if (!player || !target || player.id === target.id) return state;
      if (player.role !== 'thief') return state;
      if (target.dieValue !== player.dieValue) return state;

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
        logs: [
          ...state.logs,
          {
            id: `log_${Date.now()}`,
            text: `The Cheese Thief chose a follower among the awake witnesses!`,
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

function processBotNightActions(state: CheeseThiefState): CheeseThiefState {
  let s: CheeseThiefState = { ...state, players: { ...state.players } };
  const awakeBots = s.playerOrder
    .map((id) => s.players[id])
    .filter(
      (p) =>
        (p.id.startsWith('bot_') || p.id.startsWith('mouse_bot_')) &&
        p.dieValue === s.currentHour
    );

  if (awakeBots.length === 0) return s;

  // 1. If thief bot is awake and cheese not yet stolen
  const thiefBot = awakeBots.find((p) => p.role === 'thief');
  if (thiefBot && !s.cheeseStolen) {
    const allAwakeIds = s.playerOrder.filter(
      (id) => s.players[id].dieValue === s.currentHour
    );
    const witnessSleepyheads = allAwakeIds.filter(
      (id) => s.players[id].role === 'sleepyhead'
    );
    let followerId = s.followerId;
    if (!followerId && witnessSleepyheads.length === 1) {
      followerId = witnessSleepyheads[0];
    }
    const updatedPlayers = { ...s.players };
    if (followerId && updatedPlayers[followerId]) {
      updatedPlayers[followerId] = {
        ...updatedPlayers[followerId],
        isFollower: true,
      };
    }
    s = {
      ...s,
      cheeseStolen: true,
      stolenAtHour: s.currentHour,
      stolenBy: thiefBot.id,
      followerId,
      players: updatedPlayers,
      logs: [
        ...s.logs,
        {
          id: `log_${Date.now()}`,
          hour: s.currentHour,
          text: `At Hour ${s.currentHour}:00, the Cheese was secretly swiped from the center of the table!`,
          timestamp: Date.now(),
        },
      ],
    };
  }

  // 2. If sleepyhead bot is alone awake, peek at a random other player
  const allAwakeCount = s.playerOrder.filter(
    (id) => s.players[id].dieValue === s.currentHour
  ).length;
  if (allAwakeCount === 1) {
    const aloneBot = awakeBots[0];
    if (aloneBot && !aloneBot.hasPeeked && aloneBot.role !== 'thief') {
      const candidates = s.playerOrder.filter((id) => id !== aloneBot.id);
      if (candidates.length > 0) {
        const targetId = candidates[Math.floor(Math.random() * candidates.length)];
        const target = s.players[targetId];
        s.players[aloneBot.id] = {
          ...aloneBot,
          hasPeeked: true,
          peekedTargetId: targetId,
          peekedTargetDie: target ? target.dieValue : null,
        };
      }
    }
  }

  return s;
}

function startNightTransition(state: CheeseThiefState): CheeseThiefState {
  const next = {
    ...state,
    phase: 'night' as const,
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
  return processBotNightActions(next);
}

function advanceNightHour(state: CheeseThiefState): CheeseThiefState {
  let s = { ...state };

  // 1. If cheese was not stolen yet and current hour was the thief's hour, auto-steal it now!
  const thief = Object.values(s.players).find((p) => p.role === 'thief');
  if (thief && thief.dieValue === s.currentHour && !s.cheeseStolen) {
    const awakePlayerIds = s.playerOrder.filter(
      (id) => s.players[id].dieValue === s.currentHour
    );
    const witnessSleepyheads = awakePlayerIds.filter(
      (id) => s.players[id].role === 'sleepyhead'
    );
    let followerId = s.followerId;
    if (!followerId && witnessSleepyheads.length > 0) {
      followerId = witnessSleepyheads[0];
    }
    const updatedPlayers = { ...s.players };
    if (followerId && updatedPlayers[followerId]) {
      updatedPlayers[followerId] = {
        ...updatedPlayers[followerId],
        isFollower: true,
      };
    }
    s = {
      ...s,
      cheeseStolen: true,
      stolenAtHour: s.currentHour,
      stolenBy: thief.id,
      followerId,
      players: updatedPlayers,
      logs: [
        ...s.logs,
        {
          id: `log_${Date.now()}`,
          hour: s.currentHour,
          text: `At Hour ${s.currentHour}:00, the Cheese was secretly swiped from the platter!`,
          timestamp: Date.now(),
        },
      ],
    };
  }

  // 2. Advance to next hour (1..6)
  if (s.currentHour < 6) {
    const nextHour = s.currentHour + 1;
    const next = {
      ...s,
      currentHour: nextHour,
      hourSecondsRemaining: s.hourDurationSeconds,
      logs: [
        ...s.logs,
        {
          id: `log_${Date.now()}`,
          hour: nextHour,
          text: `Clock strikes ${nextHour}:00 AM! Mice with die ${nextHour} open your eyes!`,
          timestamp: Date.now(),
        },
      ],
    };
    return processBotNightActions(next);
  }

  // 3. Finished hour 6. Dawn breaks directly into Day Phase (Discussion)!
  // Official Rule: Followers are ONLY players who woke up at the same hour as the Thief!
  return {
    ...s,
    phase: 'day',
    currentHour: 7,
    daySecondsRemaining: s.dayDiscussionSeconds,
    logs: [
      ...s.logs,
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
  } else if (
    (thief && mostVotedIds.includes(thief.id)) ||
    (state.followerId && mostVotedIds.includes(state.followerId))
  ) {
    // 2. Sleepyhead victory: The Cheese Thief OR their Follower received the most votes!
    winner = 'sleepyheads';
    const caughtRole = (thief && mostVotedIds.includes(thief.id))
      ? `the Cheese Thief (${thief.name})`
      : `the Thief's Accomplice (${state.players[state.followerId!]?.name || 'Follower'})`;
    winReason = `The Sleepyheads successfully caught ${caughtRole}! The cheese is saved!`;
  } else {
    // 3. Cheese Thief & Follower victory: Neither the Thief nor the Follower was caught!
    winner = 'thief';
    const follower = state.followerId ? state.players[state.followerId] : null;
    const followerMsg = follower
      ? ` and Accomplice ${follower.name}`
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
  const isViewerAwake =
    state.phase === 'night' && viewer?.dieValue === state.currentHour;

  const sanitizedPlayers: Record<string, CheeseThiefPlayer> = {};

  for (const id of state.playerOrder) {
    const p = state.players[id];
    const isSelf = id === viewerId;

    // Secret die visibility:
    // - Always see your own die.
    // - If viewer peeked at this player, viewer sees their die.
    // - If viewer is awake at currentHour, and player p is ALSO awake at currentHour:
    //   Both mice make eye contact! The viewer sees that p is awake at currentHour!
    // - Otherwise masked as 0.
    const isAwakeTogether = isViewerAwake && p.dieValue === state.currentHour;
    const canSeeDie =
      isSelf ||
      (viewer?.peekedTargetId === id && viewer.peekedTargetDie !== null) ||
      isAwakeTogether;
    const visibleDie = canSeeDie ? p.dieValue : 0;

    // Role visibility:
    // - Always see own role.
    // - Other players' roles are masked as 'unknown' before game_over so players know roles are hidden.
    const visibleRole: CheeseThiefRole = isSelf ? p.role : 'unknown';

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
      votedTargetId: isSelf ? p.votedTargetId : p.votedTargetId ? '__voted__' : null,
      peekedTargetId: isSelf ? p.peekedTargetId : null,
      peekedTargetDie: isSelf ? p.peekedTargetDie : null,
    };
  }

  // Sanitize logs during night: only show heist swiped logs to the thief or awake witnesses at that hour
  const sanitizedLogs = state.logs.filter((log) => {
    if (log.hour !== undefined && log.text.includes('swiped')) {
      if (viewer?.role === 'thief' || viewer?.dieValue === log.hour) {
        return true;
      }
      return false;
    }
    return true;
  });

  // Central cheese visibility:
  // - Setup / Day / Voting / GameOver: visible to everyone
  // - Night: only visible if viewer is the Thief or currently awake at their dice hour
  const canSeeCheeseAtCenter =
    state.phase !== 'night' ||
    isViewerThief ||
    isViewerAwake;

  const sanitizedCheeseStolen = canSeeCheeseAtCenter ? state.cheeseStolen : false;
  const sanitizedStolenAtHour = canSeeCheeseAtCenter ? state.stolenAtHour : null;

  return {
    ...state,
    cheeseStolen: sanitizedCheeseStolen,
    stolenAtHour: sanitizedStolenAtHour,
    stolenBy: isViewerThief ? state.stolenBy : null,
    followerId:
      isViewerThief || isViewerFollower
        ? state.followerId
        : null,
    players: sanitizedPlayers,
    logs: sanitizedLogs,
  };
}

export function getCheeseThiefBotAction(
  state: CheeseThiefState,
  botPlayerId: string
): CheeseThiefAction | null {
  const bot = state.players[botPlayerId];
  if (!bot) return null;

  // 1. Setup Phase: Ready up
  if (state.phase === 'setup' && !bot.isReady) {
    return { type: 'set_ready', playerId: botPlayerId };
  }

  // 2. Voting Phase: Cast vote for another player
  if (state.phase === 'voting' && !bot.votedTargetId) {
    const candidates = state.playerOrder.filter((id) => id !== botPlayerId);
    if (candidates.length > 0) {
      const targetId = candidates[Math.floor(Math.random() * candidates.length)];
      return { type: 'cast_vote', playerId: botPlayerId, targetId };
    }
  }

  // 3. Night Phase:
  if (state.phase === 'night' && bot.dieValue === state.currentHour) {
    // If Thief and cheese not stolen
    if (bot.role === 'thief' && !state.cheeseStolen) {
      return { type: 'steal_cheese', playerId: botPlayerId };
    }

    // If Sleepyhead alone awake and has not peeked
    const awakeCount = state.playerOrder.filter(
      (id) => state.players[id].dieValue === state.currentHour
    ).length;
    if (awakeCount === 1 && !bot.hasPeeked && bot.role !== 'thief') {
      const candidates = state.playerOrder.filter((id) => id !== botPlayerId);
      if (candidates.length > 0) {
        const targetId = candidates[Math.floor(Math.random() * candidates.length)];
        return { type: 'peek_cup', playerId: botPlayerId, targetId };
      }
    }
  }

  return null;
}

