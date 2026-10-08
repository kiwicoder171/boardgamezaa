import {
  WerewolfState,
  WerewolfAction,
  WerewolfPlayer,
  WerewolfRole,
  AlignmentTeam,
  WerewolfSettings,
} from './types';
import { NIGHT_ROLES_ORDER, WEREWOLF_ROLES_CATALOG } from './roles';

export function getRoleDeckForPlayerCount(count: number, mode = 'standard'): WerewolfRole[] {
  if (count <= 3) {
    return ['werewolf', 'seer', 'villager'];
  }
  if (count === 4) {
    return ['werewolf', 'seer', 'bodyguard', 'tanner'];
  }
  if (count === 5) {
    return ['werewolf', 'minion', 'seer', 'bodyguard', 'hunter'];
  }
  if (count === 6) {
    return ['werewolf', 'werewolf', 'seer', 'bodyguard', 'witch', 'tanner'];
  }
  if (count === 7) {
    return ['werewolf', 'werewolf', 'seer', 'bodyguard', 'witch', 'hunter', 'villager'];
  }
  if (count === 8) {
    return [
      'werewolf',
      'werewolf',
      'minion',
      'seer',
      'bodyguard',
      'witch',
      'hunter',
      'tanner',
    ];
  }
  // 9+ players
  const deck: WerewolfRole[] = [
    'werewolf',
    'werewolf',
    'minion',
    'seer',
    'bodyguard',
    'witch',
    'hunter',
    'cupid',
    'tanner',
  ];
  while (deck.length < count) {
    deck.push('villager');
  }
  return deck;
}

export function initWerewolfGame(
  players: Array<{ id: string; name: string; avatar?: string }>,
  settings?: WerewolfSettings
): WerewolfState {
  const roleDeck = getRoleDeckForPlayerCount(
    players.length,
    settings?.expansionPacks || 'standard'
  );
  // Shuffle deck
  const shuffledRoles = [...roleDeck].sort(() => Math.random() - 0.5);

  const werewolfPlayers: WerewolfPlayer[] = players.map((p, idx) => {
    const assignedRole = shuffledRoles[idx] || 'villager';
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar || '👤',
      role: assignedRole,
      originalRole: assignedRole,
      isAlive: true,
      isProtected: false,
    };
  });

  // Calculate active night sequence
  const presentRoles = new Set(werewolfPlayers.map((p) => p.role));
  const activeNightRoles = NIGHT_ROLES_ORDER.filter((r) => presentRoles.has(r));

  return {
    dayNumber: 1,
    phase: 'night',
    activeNightRole: activeNightRoles[0] || 'werewolf',
    nightStepIndex: 0,

    players: werewolfPlayers,

    werewolfKillTarget: null,
    bodyguardProtectTarget: null,
    bodyguardLastProtected: null,
    witchHealTarget: null,
    witchPoisonTarget: null,
    witchPotionsUsed: { heal: false, poison: false },
    seerInspected: {},
    cupidLovers: null,

    votes: {},
    eliminatedLastNight: [],
    eliminatedByDayVote: null,

    winner: null,
    winSummary: null,

    history: [
      {
        id: 'init-1',
        text: '🌑 Night falls over the ancient village. All villagers close your eyes.',
        type: 'night',
        timestamp: Date.now(),
      },
      {
        id: 'init-2',
        text: `🌙 ${WEREWOLF_ROLES_CATALOG[activeNightRoles[0] || 'werewolf'].name}, wake up!`,
        type: 'night',
        timestamp: Date.now(),
      },
    ],
  };
}

export function handleWerewolfAction(
  state: WerewolfState,
  action: WerewolfAction
): WerewolfState {
  if (action.type === 'RESTART_GAME') {
    return initWerewolfGame(state.players);
  }

  if (state.phase === 'game_over') return state;

  const s = JSON.parse(JSON.stringify(state)) as WerewolfState;
  const actor = s.players.find((p) => p.id === action.playerId);

  // 1. NIGHT WOLF KILL
  if (action.type === 'NIGHT_WOLF_KILL') {
    if (s.phase !== 'night' || s.activeNightRole !== 'werewolf') return s;
    if (!actor || (actor.role !== 'werewolf' && actor.role !== 'wolf_pup')) return s;

    s.werewolfKillTarget = action.targetId;
    const victim = s.players.find((p) => p.id === action.targetId);
    s.history.push({
      id: `wolf-${Date.now()}`,
      text: `🐺 The Werewolf pack selected ${victim?.name || 'a villager'} as tonight's victim.`,
      type: 'night',
      timestamp: Date.now(),
    });
    return advanceNightStep(s);
  }

  // 2. NIGHT SEER INSPECT
  if (action.type === 'NIGHT_SEER_INSPECT') {
    if (s.phase !== 'night' || s.activeNightRole !== 'seer') return s;
    if (!actor || actor.role !== 'seer') return s;

    const target = s.players.find((p) => p.id === action.targetId);
    if (target) {
      const isEvil = target.role === 'werewolf' || target.role === 'wolf_pup';
      s.seerInspected[actor.id] = {
        targetId: target.id,
        role: target.role,
        isEvil,
      };
      s.history.push({
        id: `seer-${Date.now()}`,
        text: `🔮 The Seer gazed into the crystal ball and inspected ${target.name}.`,
        type: 'seer',
        timestamp: Date.now(),
      });
    }
    return advanceNightStep(s);
  }

  // 3. NIGHT BODYGUARD PROTECT
  if (action.type === 'NIGHT_BODYGUARD_PROTECT') {
    if (s.phase !== 'night' || s.activeNightRole !== 'bodyguard') return s;
    if (!actor || actor.role !== 'bodyguard') return s;
    if (action.targetId === s.bodyguardLastProtected) return s;

    s.bodyguardProtectTarget = action.targetId;
    s.bodyguardLastProtected = action.targetId;
    s.history.push({
      id: `guard-${Date.now()}`,
      text: `🛡️ The Bodyguard stood sentinel over a villager's door tonight.`,
      type: 'night',
      timestamp: Date.now(),
    });
    return advanceNightStep(s);
  }

  // 4. NIGHT WITCH ACT
  if (action.type === 'NIGHT_WITCH_ACT') {
    if (s.phase !== 'night' || s.activeNightRole !== 'witch') return s;
    if (!actor || actor.role !== 'witch') return s;

    if (action.heal && !s.witchPotionsUsed.heal && s.werewolfKillTarget) {
      s.witchHealTarget = s.werewolfKillTarget;
      s.witchPotionsUsed.heal = true;
    }
    if (action.poisonTargetId && !s.witchPotionsUsed.poison) {
      s.witchPoisonTarget = action.poisonTargetId;
      s.witchPotionsUsed.poison = true;
    }

    s.history.push({
      id: `witch-${Date.now()}`,
      text: `🧙‍♀️ The Witch brewed mysterious potions under the midnight sky.`,
      type: 'night',
      timestamp: Date.now(),
    });
    return advanceNightStep(s);
  }

  // 5. CUPID BIND
  if (action.type === 'NIGHT_CUPID_BIND') {
    if (s.phase !== 'night' || s.activeNightRole !== 'cupid') return s;
    s.cupidLovers = [action.lover1Id, action.lover2Id];
    s.players.forEach((p) => {
      if (p.id === action.lover1Id || p.id === action.lover2Id) {
        p.isLover = true;
      }
    });
    s.history.push({
      id: `cupid-${Date.now()}`,
      text: `💘 Cupid struck two villagers with love arrows!`,
      type: 'night',
      timestamp: Date.now(),
    });
    return advanceNightStep(s);
  }

  // 6. SKIP NIGHT STEP
  if (action.type === 'SKIP_NIGHT_STEP') {
    return advanceNightStep(s);
  }

  // 7. PROCEED TO VOTING
  if (action.type === 'PROCEED_TO_VOTING') {
    if (s.phase === 'day_discussion') {
      s.phase = 'day_voting';
      s.votes = {};
      s.history.push({
        id: `voting-${Date.now()}`,
        text: `⚖️ Town Hall discussion concluded! Villagers, cast your votes for trial!`,
        type: 'vote',
        timestamp: Date.now(),
      });
    }
    return s;
  }

  // 8. CAST VOTE
  if (action.type === 'CAST_VOTE') {
    if (s.phase !== 'day_voting') return s;
    if (!actor || !actor.isAlive) return s;

    s.votes[actor.id] = action.targetId;
    const target = s.players.find((p) => p.id === action.targetId);
    s.history.push({
      id: `voted-${Date.now()}`,
      text: `🗳️ ${actor.name} cast their vote against ${target?.name || 'someone'}.`,
      type: 'vote',
      timestamp: Date.now(),
    });

    // If all living players have voted, resolve automatically
    const aliveCount = s.players.filter((p) => p.isAlive).length;
    if (Object.keys(s.votes).length >= aliveCount) {
      resolveDayVotes(s);
    }
    return s;
  }

  // 9. RESOLVE DAY VOTES
  if (action.type === 'RESOLVE_DAY_VOTES') {
    if (s.phase === 'day_voting') {
      resolveDayVotes(s);
    }
    return s;
  }

  // 10. HUNTER REVENGE
  if (action.type === 'HUNTER_REVENGE') {
    if (s.phase !== 'hunter_revenge') return s;
    if (action.playerId !== s.hunterActivePlayerId) return s;

    const target = s.players.find((p) => p.id === action.targetId && p.isAlive);
    if (target) {
      target.isAlive = false;
      s.history.push({
        id: `hunter-revenge-${Date.now()}`,
        text: `🏹 As the Hunter falls, their final arrow pierces ${target.name}!`,
        type: 'death',
        timestamp: Date.now(),
      });

      // Check lovers
      checkLoversHeartbreak(s, target.id);
    }

    s.hunterActivePlayerId = undefined;
    checkWinConditions(s);

    if ((s.phase as string) !== 'game_over') {
      startNextNight(s);
    }
    return s;
  }

  return s;
}

function advanceNightStep(s: WerewolfState): WerewolfState {
  const livingRoles = new Set(s.players.filter((p) => p.isAlive).map((p) => p.role));
  const activeNightRoles = NIGHT_ROLES_ORDER.filter((r) => livingRoles.has(r));

  s.nightStepIndex += 1;

  if (s.nightStepIndex < activeNightRoles.length) {
    s.activeNightRole = activeNightRoles[s.nightStepIndex];
    s.history.push({
      id: `wake-${Date.now()}`,
      text: `🌙 ${WEREWOLF_ROLES_CATALOG[s.activeNightRole].name}, wake up!`,
      type: 'night',
      timestamp: Date.now(),
    });
    return s;
  }

  // All night actions complete -> resolve night!
  return resolveNight(s);
}

function resolveNight(s: WerewolfState): WerewolfState {
  s.eliminatedLastNight = [];

  // Werewolf victim check
  if (s.werewolfKillTarget) {
    const isProtected = s.bodyguardProtectTarget === s.werewolfKillTarget;
    const isHealed = s.witchHealTarget === s.werewolfKillTarget;

    if (!isProtected && !isHealed) {
      const victim = s.players.find((p) => p.id === s.werewolfKillTarget);
      if (victim && victim.isAlive) {
        victim.isAlive = false;
        s.eliminatedLastNight.push(victim.id);
      }
    }
  }

  // Witch poison victim check
  if (s.witchPoisonTarget) {
    const poisonVictim = s.players.find((p) => p.id === s.witchPoisonTarget);
    if (poisonVictim && poisonVictim.isAlive) {
      poisonVictim.isAlive = false;
      s.eliminatedLastNight.push(poisonVictim.id);
    }
  }

  // Lovers heartbreak check
  s.eliminatedLastNight.forEach((deadId) => {
    checkLoversHeartbreak(s, deadId);
  });

  // Reset night variables
  s.werewolfKillTarget = null;
  s.bodyguardProtectTarget = null;
  s.witchHealTarget = null;
  s.witchPoisonTarget = null;
  s.activeNightRole = null;

  // Check Hunter
  const deadHunter = s.players.find(
    (p) => s.eliminatedLastNight.includes(p.id) && p.role === 'hunter'
  );

  // Announce morning
  s.history.push({
    id: `dawn-${Date.now()}`,
    text: `☀️ Dawn breaks over the village! The church bells toll for Day ${s.dayNumber}.`,
    type: 'day',
    timestamp: Date.now(),
  });

  if (s.eliminatedLastNight.length === 0) {
    s.history.push({
      id: `peace-${Date.now()}`,
      text: `🕊️ A peaceful night! No villagers were killed!`,
      type: 'day',
      timestamp: Date.now(),
    });
  } else {
    const deadNames = s.players
      .filter((p) => s.eliminatedLastNight.includes(p.id))
      .map((p) => `${p.name} (${WEREWOLF_ROLES_CATALOG[p.role].name})`);
    s.history.push({
      id: `deaths-${Date.now()}`,
      text: `💀 Tragedy struck! Fallen villagers: ${deadNames.join(', ')}.`,
      type: 'death',
      timestamp: Date.now(),
    });
  }

  // Check win condition
  checkWinConditions(s);

  if (s.phase !== 'game_over') {
    if (deadHunter) {
      s.phase = 'hunter_revenge';
      s.hunterActivePlayerId = deadHunter.id;
      s.history.push({
        id: `hunter-trigger-${Date.now()}`,
        text: `🏹 Hunter ${deadHunter.name} has one final arrow before death!`,
        type: 'death',
        timestamp: Date.now(),
      });
    } else {
      s.phase = 'day_discussion';
    }
  }

  return s;
}

function resolveDayVotes(s: WerewolfState) {
  // Count votes
  const tallies: Record<string, number> = {};
  Object.entries(s.votes).forEach(([voterId, targetId]) => {
    const voter = s.players.find((p) => p.id === voterId);
    const weight = voter?.isMayor ? 2 : 1;
    tallies[targetId] = (tallies[targetId] || 0) + weight;
  });

  // Find highest voted
  let maxVotes = 0;
  let executedTargetId: string | null = null;
  let isTie = false;

  Object.entries(tallies).forEach(([targetId, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      executedTargetId = targetId;
      isTie = false;
    } else if (count === maxVotes) {
      isTie = true;
    }
  });

  if (isTie || !executedTargetId || maxVotes === 0) {
    s.history.push({
      id: `vote-tie-${Date.now()}`,
      text: `⚖️ The village vote was tied! No one was executed today.`,
      type: 'vote',
      timestamp: Date.now(),
    });
    startNextNight(s);
    return;
  }

  const executed = s.players.find((p) => p.id === executedTargetId);
  if (!executed) {
    startNextNight(s);
    return;
  }

  executed.isAlive = false;
  s.eliminatedByDayVote = executed.id;

  s.history.push({
    id: `executed-${Date.now()}`,
    text: `⚰️ The village has spoken! ${executed.name} was executed! They were a ${
      WEREWOLF_ROLES_CATALOG[executed.role].name
    }.`,
    type: 'death',
    timestamp: Date.now(),
  });

  // TANNER WIN CONDITION!
  if (executed.role === 'tanner') {
    s.phase = 'game_over';
    s.winner = 'tanner';
    s.winSummary = `💀 THE TANNER WINS! ${executed.name} successfully convinced the village to execute them!`;
    s.history.push({ id: `tanner-win-${Date.now()}`, text: s.winSummary, type: 'win', timestamp: Date.now() });
    return;
  }

  // Check lovers
  checkLoversHeartbreak(s, executed.id);

  // Check Hunter
  if (executed.role === 'hunter') {
    s.phase = 'hunter_revenge';
    s.hunterActivePlayerId = executed.id;
    s.history.push({
      id: `hunter-trigger-${Date.now()}`,
      text: `🏹 Hunter ${executed.name} takes aim with their dying breath!`,
      type: 'death',
      timestamp: Date.now(),
    });
    return;
  }

  // Check win condition
  checkWinConditions(s);

  if (s.phase !== 'game_over') {
    startNextNight(s);
  }
}

function startNextNight(s: WerewolfState) {
  s.dayNumber += 1;
  s.phase = 'night';
  s.nightStepIndex = 0;
  s.votes = {};

  const livingRoles = new Set(s.players.filter((p) => p.isAlive).map((p) => p.role));
  const activeNightRoles = NIGHT_ROLES_ORDER.filter((r) => livingRoles.has(r));

  s.activeNightRole = activeNightRoles[0] || 'werewolf';

  s.history.push({
    id: `night-${Date.now()}`,
    text: `🌑 Night falls once more over the village (Night ${s.dayNumber}).`,
    type: 'night',
    timestamp: Date.now(),
  });

  if (s.activeNightRole) {
    s.history.push({
      id: `wake-${Date.now()}`,
      text: `🌙 ${WEREWOLF_ROLES_CATALOG[s.activeNightRole].name}, wake up!`,
      type: 'night',
      timestamp: Date.now(),
    });
  }
}

function checkLoversHeartbreak(s: WerewolfState, deadId: string) {
  if (s.cupidLovers && (s.cupidLovers[0] === deadId || s.cupidLovers[1] === deadId)) {
    const partnerId = s.cupidLovers[0] === deadId ? s.cupidLovers[1] : s.cupidLovers[0];
    const partner = s.players.find((p) => p.id === partnerId && p.isAlive);
    if (partner) {
      partner.isAlive = false;
      s.history.push({
        id: `lover-${Date.now()}`,
        text: `💔 Heartbroken by their lover's death, ${partner.name} perished of grief!`,
        type: 'death',
        timestamp: Date.now(),
      });
    }
  }
}

function checkWinConditions(s: WerewolfState) {
  const living = s.players.filter((p) => p.isAlive);
  const wolves = living.filter((p) => p.role === 'werewolf' || p.role === 'wolf_pup');
  const villagers = living.filter((p) => p.role !== 'werewolf' && p.role !== 'wolf_pup');

  // Check Lovers Solo Win (if only the 2 lovers survive)
  if (living.length === 2 && s.cupidLovers && living.every((p) => s.cupidLovers?.includes(p.id))) {
    s.phase = 'game_over';
    s.winner = 'lovers';
    s.winSummary = `💘 TRUE LOVE PREVAILS! The two lovers are the sole survivors of the village!`;
    s.history.push({ id: `win-${Date.now()}`, text: s.winSummary, type: 'win', timestamp: Date.now() });
    return;
  }

  // Villagers win if all wolves are dead
  if (wolves.length === 0) {
    s.phase = 'game_over';
    s.winner = 'villagers';
    s.winSummary = `🎉 VILLAGERS WIN! All evil Werewolves have been successfully rooted out and eliminated!`;
    s.history.push({ id: `win-${Date.now()}`, text: s.winSummary, type: 'win', timestamp: Date.now() });
    return;
  }

  // Werewolves win if wolves >= villagers
  if (wolves.length >= villagers.length) {
    s.phase = 'game_over';
    s.winner = 'werewolves';
    s.winSummary = `🐺 WEREWOLVES WIN! The pack has overpowered the remaining villagers! The village falls to darkness!`;
    s.history.push({ id: `win-${Date.now()}`, text: s.winSummary, type: 'win', timestamp: Date.now() });
    return;
  }
}

export function sanitizeWerewolfState(
  state: WerewolfState,
  viewingPlayerId: string
): WerewolfState {
  const sanitized = JSON.parse(JSON.stringify(state)) as WerewolfState;
  const viewer = sanitized.players.find((p) => p.id === viewingPlayerId);

  // If game is over, or viewer is dead, reveal all roles!
  if (sanitized.phase === 'game_over' || (viewer && !viewer.isAlive)) {
    return sanitized;
  }

  const isWolfViewer = viewer && (viewer.role === 'werewolf' || viewer.role === 'wolf_pup');
  const isMinionViewer = viewer && viewer.role === 'minion';
  const isMasonViewer = viewer && viewer.role === 'mason';
  const seerRecord = viewer ? sanitized.seerInspected[viewer.id] : undefined;

  sanitized.players = sanitized.players.map((p) => {
    // Viewer always sees their own role
    if (p.id === viewingPlayerId) return p;

    // Werewolves see each other
    if (isWolfViewer && (p.role === 'werewolf' || p.role === 'wolf_pup')) {
      return p;
    }

    // Minion sees Werewolves
    if (isMinionViewer && (p.role === 'werewolf' || p.role === 'wolf_pup')) {
      return p;
    }

    // Masons see each other
    if (isMasonViewer && p.role === 'mason') {
      return p;
    }

    // Seer sees their inspected target
    if (seerRecord && seerRecord.targetId === p.id) {
      return p;
    }

    // Everyone else's role is masked
    return {
      ...p,
      role: 'villager', // masked
    };
  });

  return sanitized;
}
