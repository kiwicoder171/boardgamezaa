import { Player, Room } from '@/types/game';
import {
  CoupAction,
  CoupActionType,
  CoupCard,
  CoupClientState,
  CoupLog,
  CoupRole,
  CoupSettings,
  CoupState,
  PendingAction,
  PlayerCoupState,
} from './types';
import { generateCoupDeck, ROLE_METADATA } from './cards';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function initCoupState(
  players: Player[],
  _settings?: CoupSettings
): CoupState {
  if (players.length < 2) {
    throw new Error('Coup requires at least 2 players');
  }

  const shuffledDeck = shuffle(generateCoupDeck());
  const playerStates: Record<string, PlayerCoupState> = {};

  players.forEach((p) => {
    // Deal 2 cards per player
    const hand = shuffledDeck.splice(0, 2);
    playerStates[p.id] = {
      playerId: p.id,
      coins: 2, // Standard starting treasury
      cards: hand,
      isEliminated: false,
    };
  });

  const turnOrder = players.map((p) => p.id);

  const logs: CoupLog[] = [
    {
      timestamp: Date.now(),
      text: `Royal Court assembled with ${players.length} operatives! Each received 2 secret influence cards & 2 coins.`,
      textTh: `ศาลหลวงเริ่มต้นขึ้นด้วยผู้เล่น ${players.length} คน! ทุกคนได้รับไพ่อิทธิพล 2 ใบและเหรียญ 2 เหรียญ`,
      type: 'system',
    },
  ];

  return {
    phase: 'action_selection',
    currentTurnPlayerId: turnOrder[0],
    turnOrder,
    courtDeck: shuffledDeck,
    discardGraveyard: [],
    treasuryCoins: 50 - players.length * 2,
    players: playerStates,
    pendingAction: null,
    pendingBlock: null,
    pendingLoss: null,
    exchangeCards: null,
    winnerId: null,
    logs,
  };
}

export function handleCoupAction(
  state: BombBustersStateProxy,
  action: CoupAction,
  actingPlayerId: string,
  _room: Room<any, any>
): { newState: CoupState; error?: string } {
  const s = state as unknown as CoupState;

  switch (action.type) {
    case 'DECLARE_ACTION': {
      if (s.phase !== 'action_selection') {
        return { newState: s, error: 'Cannot declare an action at this time.' };
      }
      if (s.currentTurnPlayerId !== actingPlayerId) {
        return { newState: s, error: 'It is not your turn.' };
      }

      const actor = s.players[actingPlayerId];
      if (!actor || actor.isEliminated) {
        return { newState: s, error: 'Eliminated players cannot act.' };
      }

      // Mandatory Coup Rule: 10 or more coins
      if (actor.coins >= 10 && action.actionType !== 'COUP') {
        return { newState: s, error: 'You have 10 or more coins and MUST perform a Coup!' };
      }

      // Action validation
      if (action.actionType === 'COUP') {
        if (actor.coins < 7) {
          return { newState: s, error: 'Coup requires 7 coins.' };
        }
        if (!action.targetId || action.targetId === actingPlayerId) {
          return { newState: s, error: 'You must target another player with Coup.' };
        }
        const target = s.players[action.targetId];
        if (!target || target.isEliminated) {
          return { newState: s, error: 'Invalid target player.' };
        }

        // Deduct 7 coins
        actor.coins -= 7;
        s.treasuryCoins += 7;

        s.logs.push({
          timestamp: Date.now(),
          text: `👑 Coup! Player executed a Coup against Player ${action.targetId}!`,
          textTh: `👑 โค่นอำนาจ! ผู้เล่นเปิดฉากทำ Coup ใส่ผู้เล่นเป้าหมาย!`,
          type: 'action',
        });

        // Target must choose influence to lose
        return {
          newState: triggerInfluenceLoss(s, action.targetId, 'Coup'),
        };
      }

      if (action.actionType === 'INCOME') {
        actor.coins += 1;
        s.treasuryCoins -= 1;
        s.logs.push({
          timestamp: Date.now(),
          text: `🪙 Income: Took 1 coin from treasury.`,
          textTh: `🪙 รับเงิน: เก็บ 1 เหรียญจากคลัง`,
          type: 'action',
        });
        return { newState: advanceTurn(s) };
      }

      if (action.actionType === 'ASSASSINATE') {
        if (actor.coins < 3) {
          return { newState: s, error: 'Assassination requires 3 coins.' };
        }
        if (!action.targetId || action.targetId === actingPlayerId) {
          return { newState: s, error: 'You must target another player to assassinate.' };
        }
        actor.coins -= 3;
        s.treasuryCoins += 3;
      }

      let claimedRole: CoupRole | undefined;
      if (action.actionType === 'TAX') claimedRole = 'duke';
      if (action.actionType === 'ASSASSINATE') claimedRole = 'assassin';
      if (action.actionType === 'STEAL') claimedRole = 'captain';
      if (action.actionType === 'EXCHANGE') claimedRole = 'ambassador';

      s.pendingAction = {
        type: action.actionType,
        actorId: actingPlayerId,
        claimedRole,
        targetId: action.targetId,
        passedPlayerIds: [actingPlayerId],
        expiresAt: Date.now() + 12000,
      };
      s.phase = 'action_reaction';

      s.logs.push({
        timestamp: Date.now(),
        text: `Declared ${action.actionType}${claimedRole ? ` (Claiming ${ROLE_METADATA[claimedRole].name})` : ''}!`,
        textTh: `ประกาศกระทำ ${action.actionType}${claimedRole ? ` (อ้างตัวเป็น ${ROLE_METADATA[claimedRole].nameTh})` : ''}!`,
        type: 'action',
      });

      return { newState: s };
    }

    case 'CHALLENGE_ACTION': {
      if (s.phase !== 'action_reaction' || !s.pendingAction) {
        return { newState: s, error: 'No action to challenge.' };
      }
      if (actingPlayerId === s.pendingAction.actorId) {
        return { newState: s, error: 'Cannot challenge your own action.' };
      }

      const challengerId = actingPlayerId;
      const actorId = s.pendingAction.actorId;
      const claimedRole = s.pendingAction.claimedRole;

      if (!claimedRole) {
        return { newState: s, error: 'This action does not claim a role and cannot be challenged.' };
      }

      const actor = s.players[actorId];
      const hasClaimedCard = actor.cards.some((c) => !c.isRevealed && c.role === claimedRole);

      s.logs.push({
        timestamp: Date.now(),
        text: `⚔️ Challenge! Challenger questioned the claim of ${ROLE_METADATA[claimedRole].name}!`,
        textTh: `⚔️ ท้าทาย! มีผู้เล่นขอเปิดโปงคำอ้างบทบาท ${ROLE_METADATA[claimedRole].nameTh}!`,
        type: 'challenge',
      });

      if (hasClaimedCard) {
        // Actor was telling the truth!
        // 1. Actor reveals card, shuffles it into deck, draws replacement
        const cardIdx = actor.cards.findIndex((c) => !c.isRevealed && c.role === claimedRole);
        const card = actor.cards[cardIdx];
        s.courtDeck.push({ ...card, id: `card_${claimedRole}_${Date.now()}` });
        s.courtDeck = shuffle(s.courtDeck);
        const newCard = s.courtDeck.pop()!;
        actor.cards[cardIdx] = newCard;

        s.logs.push({
          timestamp: Date.now(),
          text: `Truth! The player revealed their ${ROLE_METADATA[claimedRole].name} and drew a new card. Challenger loses 1 influence!`,
          textTh: `พูดจริง! ผู้เล่นเปิดการ์ด ${ROLE_METADATA[claimedRole].nameTh} จริงและจั่วใบใหม่ ผู้ท้าทายต้องเสียไพ่อิทธิพล 1 ใบ!`,
          type: 'challenge',
        });

        // 2. Challenger loses 1 influence
        // If the action was Assassinate and challenger was the target -> Double Kill pending!
        const isDoubleKill =
          s.pendingAction.type === 'ASSASSINATE' && s.pendingAction.targetId === challengerId;

        const nextState = triggerInfluenceLoss(
          s,
          challengerId,
          'Failed Challenge',
          isDoubleKill
            ? { playerId: challengerId, cause: 'Assassination' }
            : undefined
        );

        // If not double kill, action proceeds to resolve or be blocked
        if (!isDoubleKill) {
          return { newState: proceedWithActionAfterChallenge(nextState) };
        }
        return { newState: nextState };
      } else {
        // Actor was bluffing!
        s.logs.push({
          timestamp: Date.now(),
          text: `Bluff caught! The player did not have ${ROLE_METADATA[claimedRole].name}. Action canceled!`,
          textTh: `จับโกหกได้! ผู้เล่นไม่มีการ์ด ${ROLE_METADATA[claimedRole].nameTh} จริง การกระทำถูกยกเลิก!`,
          type: 'challenge',
        });

        s.pendingAction = null;
        return {
          newState: triggerInfluenceLoss(s, actorId, 'Caught Bluffing'),
        };
      }
    }

    case 'DECLARE_BLOCK': {
      if (s.phase !== 'action_reaction' || !s.pendingAction) {
        return { newState: s, error: 'No action to block.' };
      }
      const act = s.pendingAction;

      // Validate block eligibility
      if (act.type === 'FOREIGN_AID') {
        if (action.claimedRole !== 'duke') {
          return { newState: s, error: 'Only Duke can block Foreign Aid.' };
        }
      } else if (act.type === 'ASSASSINATE') {
        if (actingPlayerId !== act.targetId) {
          return { newState: s, error: 'Only the assassinated target can block with Contessa.' };
        }
        if (action.claimedRole !== 'contessa') {
          return { newState: s, error: 'Only Contessa can block Assassination.' };
        }
      } else if (act.type === 'STEAL') {
        if (actingPlayerId !== act.targetId) {
          return { newState: s, error: 'Only the stolen target can block.' };
        }
        if (action.claimedRole !== 'captain' && action.claimedRole !== 'ambassador') {
          return { newState: s, error: 'Only Captain or Ambassador can block Stealing.' };
        }
      } else {
        return { newState: s, error: 'This action cannot be blocked.' };
      }

      s.pendingBlock = {
        blockerId: actingPlayerId,
        claimedRole: action.claimedRole,
        passedPlayerIds: [actingPlayerId],
        expiresAt: Date.now() + 10000,
      };
      s.phase = 'block_reaction';

      s.logs.push({
        timestamp: Date.now(),
        text: `🛡️ Block! Player claimed ${ROLE_METADATA[action.claimedRole].name} to block the action!`,
        textTh: `🛡️ สกัดกั้น! ผู้เล่นอ้างตัวเป็น ${ROLE_METADATA[action.claimedRole].nameTh} เพื่อขัดขวาง!`,
        type: 'block',
      });

      return { newState: s };
    }

    case 'CHALLENGE_BLOCK': {
      if (s.phase !== 'block_reaction' || !s.pendingBlock || !s.pendingAction) {
        return { newState: s, error: 'No block to challenge.' };
      }
      if (actingPlayerId === s.pendingBlock.blockerId) {
        return { newState: s, error: 'Cannot challenge your own block.' };
      }

      const challengerId = actingPlayerId;
      const blockerId = s.pendingBlock.blockerId;
      const claimedRole = s.pendingBlock.claimedRole;
      const blocker = s.players[blockerId];

      const hasBlockCard = blocker.cards.some((c) => !c.isRevealed && c.role === claimedRole);

      if (hasBlockCard) {
        // Blocker was truthful!
        const cardIdx = blocker.cards.findIndex((c) => !c.isRevealed && c.role === claimedRole);
        const card = blocker.cards[cardIdx];
        s.courtDeck.push({ ...card, id: `card_${claimedRole}_${Date.now()}` });
        s.courtDeck = shuffle(s.courtDeck);
        const newCard = s.courtDeck.pop()!;
        blocker.cards[cardIdx] = newCard;

        s.logs.push({
          timestamp: Date.now(),
          text: `Block verified! Blocker held ${ROLE_METADATA[claimedRole].name}. Challenger loses 1 influence!`,
          textTh: `การป้องกันถูกต้อง! ผู้ป้องกันมี ${ROLE_METADATA[claimedRole].nameTh} จริง ผู้ท้าทายเสียไพ่อิทธิพล 1 ใบ!`,
          type: 'challenge',
        });

        s.pendingAction = null;
        s.pendingBlock = null;
        return {
          newState: triggerInfluenceLoss(s, challengerId, 'Failed Block Challenge'),
        };
      } else {
        // Blocker was bluffing!
        s.logs.push({
          timestamp: Date.now(),
          text: `Block failed! Blocker did not have ${ROLE_METADATA[claimedRole].name}. Action proceeds!`,
          textTh: `การสกัดกั้นล้มเหลว! ผู้ป้องกันโกหก การกระทำเดิมจะดำเนินต่อไป!`,
          type: 'challenge',
        });

        // Blocker loses influence
        const actionToResolve = s.pendingAction;
        s.pendingBlock = null;
        const nextState = triggerInfluenceLoss(s, blockerId, 'Failed Block Bluff');
        return { newState: resolveActionEffect(nextState, actionToResolve) };
      }
    }

    case 'PASS_ACTION_REACTION': {
      if (s.phase !== 'action_reaction' || !s.pendingAction) {
        return { newState: s };
      }
      if (!s.pendingAction.passedPlayerIds.includes(actingPlayerId)) {
        s.pendingAction.passedPlayerIds.push(actingPlayerId);
      }

      const aliveOpponents = s.turnOrder.filter(
        (id) => !s.players[id].isEliminated && id !== s.pendingAction?.actorId
      );

      const allPassed = aliveOpponents.every((id) =>
        s.pendingAction?.passedPlayerIds.includes(id)
      );

      if (allPassed) {
        return { newState: resolveActionEffect(s, s.pendingAction) };
      }
      return { newState: s };
    }

    case 'PASS_BLOCK_REACTION': {
      if (s.phase !== 'block_reaction' || !s.pendingBlock) {
        return { newState: s };
      }
      if (!s.pendingBlock.passedPlayerIds.includes(actingPlayerId)) {
        s.pendingBlock.passedPlayerIds.push(actingPlayerId);
      }

      const aliveOpponents = s.turnOrder.filter(
        (id) => !s.players[id].isEliminated && id !== s.pendingBlock?.blockerId
      );

      const allPassed = aliveOpponents.every((id) =>
        s.pendingBlock?.passedPlayerIds.includes(id)
      );

      if (allPassed) {
        // Block succeeds! Action is blocked completely
        s.logs.push({
          timestamp: Date.now(),
          text: `Action successfully blocked by ${ROLE_METADATA[s.pendingBlock.claimedRole].name}!`,
          textTh: `การกระทำถูกขัดขวางสำเร็จโดย ${ROLE_METADATA[s.pendingBlock.claimedRole].nameTh}!`,
          type: 'block',
        });
        s.pendingAction = null;
        s.pendingBlock = null;
        return { newState: advanceTurn(s) };
      }
      return { newState: s };
    }

    case 'CHOOSE_INFLUENCE_LOSS': {
      if (s.phase !== 'choose_loss' || !s.pendingLoss) {
        return { newState: s, error: 'No influence loss pending.' };
      }
      if (s.pendingLoss.playerId !== actingPlayerId) {
        return { newState: s, error: 'It is not your turn to choose a card to lose.' };
      }

      const p = s.players[actingPlayerId];
      const targetCard = p.cards.find((c) => c.id === action.cardId && !c.isRevealed);
      if (!targetCard) {
        return { newState: s, error: 'Invalid card selected.' };
      }

      targetCard.isRevealed = true;
      s.discardGraveyard.push(targetCard);

      s.logs.push({
        timestamp: Date.now(),
        text: `💀 Lost influence: Revealed ${ROLE_METADATA[targetCard.role].name}!`,
        textTh: `💀 สูญเสียอิทธิพล: เปิดเผยการ์ด ${ROLE_METADATA[targetCard.role].nameTh}!`,
        type: 'loss',
      });

      // Check if player is completely eliminated
      const activeCardsCount = p.cards.filter((c) => !c.isRevealed).length;
      if (activeCardsCount === 0) {
        p.isEliminated = true;
        s.logs.push({
          timestamp: Date.now(),
          text: `☠️ Player ${p.playerId} has been eliminated from the royal court!`,
          textTh: `☠️ ผู้เล่น ${p.playerId} สูญเสียอิทธิพลทั้งหมดและตกรอบ!`,
          type: 'loss',
        });
      }

      // Check for secondary pending loss (e.g. Assassin Double Kill)
      if (s.pendingLoss.secondaryLossPending && !p.isEliminated) {
        const sec = s.pendingLoss.secondaryLossPending;
        s.pendingLoss = {
          playerId: sec.playerId,
          cause: sec.cause,
        };
        return { newState: s };
      }

      s.pendingLoss = null;

      // Check victory
      const alivePlayers = s.turnOrder.filter((id) => !s.players[id].isEliminated);
      if (alivePlayers.length <= 1) {
        s.phase = 'game_over';
        s.winnerId = alivePlayers[0] || null;
        s.logs.push({
          timestamp: Date.now(),
          text: `👑 Coup Champion crowned! Operative ${s.winnerId} has conquered the court!`,
          textTh: `👑 ชัยชนะเด็ดขาด! ผู้เล่น ${s.winnerId} เป็นผู้รอดชีวิตคนสุดท้ายและครองอำนาจ!`,
          type: 'system',
        });
        return { newState: s };
      }

      return { newState: advanceTurn(s) };
    }

    case 'CONFIRM_EXCHANGE': {
      if (s.phase !== 'exchange_selection' || !s.exchangeCards) {
        return { newState: s, error: 'No card exchange pending.' };
      }
      if (s.exchangeCards.playerId !== actingPlayerId) {
        return { newState: s, error: 'You are not the operative exchanging cards.' };
      }

      const p = s.players[actingPlayerId];
      const unrevealedCount = p.cards.filter((c) => !c.isRevealed).length;

      if (action.keepCardIds.length !== unrevealedCount) {
        return { newState: s, error: `You must select exactly ${unrevealedCount} cards to keep.` };
      }

      const allAvailable = s.exchangeCards.cards;
      const kept = allAvailable.filter((c) => action.keepCardIds.includes(c.id));
      const returned = allAvailable.filter((c) => !action.keepCardIds.includes(c.id));

      // Update player hand with kept unrevealed cards + already revealed cards
      const deadCards = p.cards.filter((c) => c.isRevealed);
      p.cards = [...kept, ...deadCards];

      // Return unused cards to court deck and shuffle
      s.courtDeck.push(...returned);
      s.courtDeck = shuffle(s.courtDeck);

      s.exchangeCards = null;
      s.logs.push({
        timestamp: Date.now(),
        text: `📜 Ambassador exchange completed!`,
        textTh: `📜 แลกเปลี่ยนการ์ดเอกอัครราชทูตเสร็จสิ้น!`,
        type: 'action',
      });

      return { newState: advanceTurn(s) };
    }

    case 'BOT_AUTO_TURN': {
      const botId = action.botId;
      const botAction = getCoupBotAction(s, botId);
      if (!botAction) return { newState: s };
      return handleCoupAction(state, botAction, botId, _room);
    }

    case 'RESTART_GAME': {
      const dummyPlayers = s.turnOrder.map((id) => ({
        id,
        name: `Player ${id}`,
        socketId: id,
        avatar: '🎭',
        isHost: false,
        isReady: true,
        connected: true,
      }));
      return { newState: initCoupState(dummyPlayers) };
    }

    default:
      return { newState: s };
  }
}

type BombBustersStateProxy = any;

function triggerInfluenceLoss(
  state: CoupState,
  playerId: string,
  cause: string,
  secondaryLossPending?: { playerId: string; cause: string }
): CoupState {
  const p = state.players[playerId];
  const unrevealed = p.cards.filter((c) => !c.isRevealed);

  if (unrevealed.length === 1) {
    // Only 1 card remains: auto-reveal it!
    unrevealed[0].isRevealed = true;
    p.isEliminated = true;
    state.discardGraveyard.push(unrevealed[0]);

    state.logs.push({
      timestamp: Date.now(),
      text: `💀 Elimination: Player revealed their final card (${ROLE_METADATA[unrevealed[0].role].name}) and was eliminated!`,
      textTh: `💀 ตกรอบ: ผู้เล่นเปิดการ์ดใบสุดท้าย (${ROLE_METADATA[unrevealed[0].role].nameTh}) และตกรอบจากศาลหลวง!`,
      type: 'loss',
    });

    const alive = state.turnOrder.filter((id) => !state.players[id].isEliminated);
    if (alive.length <= 1) {
      state.phase = 'game_over';
      state.winnerId = alive[0] || null;
      return state;
    }
    return advanceTurn(state);
  } else if (unrevealed.length > 1) {
    state.phase = 'choose_loss';
    state.pendingLoss = {
      playerId,
      cause,
      secondaryLossPending,
    };
    return state;
  }
  return advanceTurn(state);
}

function proceedWithActionAfterChallenge(state: CoupState): CoupState {
  if (!state.pendingAction) return advanceTurn(state);

  // If action was Assassinate or Steal, it may still be blockable by the target
  const act = state.pendingAction;
  if (act.type === 'ASSASSINATE' || act.type === 'STEAL') {
    state.phase = 'action_reaction';
    state.pendingAction = {
      ...act,
      passedPlayerIds: [act.actorId],
    };
    return state;
  }
  return resolveActionEffect(state, act);
}

function resolveActionEffect(state: CoupState, act: PendingAction): CoupState {
  const actor = state.players[act.actorId];
  state.pendingAction = null;
  state.pendingBlock = null;

  switch (act.type) {
    case 'TAX': {
      actor.coins += 3;
      state.treasuryCoins -= 3;
      state.logs.push({
        timestamp: Date.now(),
        text: `💰 Tax collected: +3 coins!`,
        textTh: `💰 เก็บภาษีสำเร็จ: ได้รับ +3 เหรียญ!`,
        type: 'action',
      });
      return advanceTurn(state);
    }

    case 'FOREIGN_AID': {
      actor.coins += 2;
      state.treasuryCoins -= 2;
      state.logs.push({
        timestamp: Date.now(),
        text: `🤝 Foreign Aid granted: +2 coins!`,
        textTh: `🤝 ได้รับเงินช่วยเหลือสำเร็จ: +2 เหรียญ!`,
        type: 'action',
      });
      return advanceTurn(state);
    }

    case 'ASSASSINATE': {
      if (!act.targetId) return advanceTurn(state);
      state.logs.push({
        timestamp: Date.now(),
        text: `🗡️ Assassination struck target! Target must forfeit 1 influence card!`,
        textTh: `🗡️ การลอบสังหารสำเร็จ! เป้าหมายต้องสละไพ่อิทธิพล 1 ใบ!`,
        type: 'action',
      });
      return triggerInfluenceLoss(state, act.targetId, 'Assassination');
    }

    case 'STEAL': {
      if (!act.targetId) return advanceTurn(state);
      const target = state.players[act.targetId];
      const stealAmount = Math.min(2, target.coins);
      target.coins -= stealAmount;
      actor.coins += stealAmount;
      state.logs.push({
        timestamp: Date.now(),
        text: `⚓ Stole ${stealAmount} coin(s) from target!`,
        textTh: `⚓ ปล้นเหรียญได้ ${stealAmount} เหรียญจากเป้าหมาย!`,
        type: 'action',
      });
      return advanceTurn(state);
    }

    case 'EXCHANGE': {
      // Draw 2 cards from deck for Ambassador
      const drawn = state.courtDeck.splice(0, 2);
      const unrevealedOwn = actor.cards.filter((c) => !c.isRevealed);
      state.exchangeCards = {
        playerId: act.actorId,
        cards: [...unrevealedOwn, ...drawn],
      };
      state.phase = 'exchange_selection';
      return state;
    }

    default:
      return advanceTurn(state);
  }
}

function advanceTurn(state: CoupState): CoupState {
  state.phase = 'action_selection';
  state.pendingAction = null;
  state.pendingBlock = null;

  // Next alive player
  const currentIdx = state.turnOrder.indexOf(state.currentTurnPlayerId);
  for (let i = 1; i <= state.turnOrder.length; i++) {
    const nextIdx = (currentIdx + i) % state.turnOrder.length;
    const pid = state.turnOrder[nextIdx];
    if (!state.players[pid].isEliminated) {
      state.currentTurnPlayerId = pid;
      break;
    }
  }

  return state;
}

/**
 * Anti-cheat state sanitization:
 * Masks secret cards from rivals so nobody can inspect network payloads to cheat.
 */
export function sanitizeCoupState(
  state: CoupState,
  viewerPlayerId: string
): CoupClientState {
  const isGameOver = state.phase === 'game_over';

  const sanitizedPlayers: Record<string, any> = {};
  Object.keys(state.players).forEach((id) => {
    const p = state.players[id];
    const isOwner = id === viewerPlayerId;

    sanitizedPlayers[id] = {
      playerId: p.playerId,
      coins: p.coins,
      isEliminated: p.isEliminated,
      cards: p.cards.map((c) => ({
        id: c.id,
        role: isGameOver || isOwner || c.isRevealed ? c.role : null,
        isRevealed: c.isRevealed,
      })),
    };
  });

  // Only the active Ambassador can see exchange cards
  const sanitizedExchange =
    state.exchangeCards && state.exchangeCards.playerId === viewerPlayerId
      ? state.exchangeCards
      : null;

  return {
    phase: state.phase,
    currentTurnPlayerId: state.currentTurnPlayerId,
    turnOrder: state.turnOrder,
    courtDeckCount: state.courtDeck.length,
    discardGraveyard: state.discardGraveyard,
    treasuryCoins: state.treasuryCoins,
    players: sanitizedPlayers,
    pendingAction: state.pendingAction,
    pendingBlock: state.pendingBlock,
    pendingLoss: state.pendingLoss,
    exchangeCards: sanitizedExchange,
    winnerId: state.winnerId,
    logs: state.logs,
  };
}

/**
 * Intelligent Bot AI for Coup:
 * Evaluates bluff rates, challenges based on public dead cards, and responds to threats.
 */
export function getCoupBotAction(
  state: CoupState,
  botPlayerId: string
): CoupAction | null {
  const bot = state.players[botPlayerId];
  if (!bot || bot.isEliminated) return null;

  const unrevealedCards = bot.cards.filter((c) => !c.isRevealed);
  const myRoles = unrevealedCards.map((c) => c.role);

  // 1. Choose influence loss when prompted
  if (state.phase === 'choose_loss' && state.pendingLoss?.playerId === botPlayerId) {
    // Sacrifice card: prefer keeping Duke or Contessa over Ambassador
    const discardOrder: CoupRole[] = ['ambassador', 'captain', 'assassin', 'contessa', 'duke'];
    let chosenCard = unrevealedCards[0];
    for (const r of discardOrder) {
      const match = unrevealedCards.find((c) => c.role === r);
      if (match) {
        chosenCard = match;
        break;
      }
    }
    return {
      type: 'CHOOSE_INFLUENCE_LOSS',
      playerId: botPlayerId,
      cardId: chosenCard.id,
    };
  }

  // 2. Exchange selection
  if (state.phase === 'exchange_selection' && state.exchangeCards?.playerId === botPlayerId) {
    const cards = state.exchangeCards.cards;
    const priority: CoupRole[] = ['duke', 'assassin', 'contessa', 'captain', 'ambassador'];
    const sorted = [...cards].sort((a, b) => priority.indexOf(a.role) - priority.indexOf(b.role));
    const keep = sorted.slice(0, unrevealedCards.length).map((c) => c.id);
    return {
      type: 'CONFIRM_EXCHANGE',
      playerId: botPlayerId,
      keepCardIds: keep,
    };
  }

  // 3. Reaction to declared action
  if (state.phase === 'action_reaction' && state.pendingAction) {
    const act = state.pendingAction;
    if (act.actorId === botPlayerId) return null;

    // Challenge check: if 3 copies of claimed role are in graveyard + my hand, 100% challenge!
    if (act.claimedRole) {
      const deadCopies = state.discardGraveyard.filter((c) => c.role === act.claimedRole).length;
      const myCopies = myRoles.filter((r) => r === act.claimedRole).length;
      if (deadCopies + myCopies >= 3) {
        return { type: 'CHALLENGE_ACTION', playerId: botPlayerId };
      }

      // Small chance to challenge suspicious Tax bluffs if late in the game
      if (act.claimedRole === 'duke' && deadCopies + myCopies >= 2 && Math.random() < 0.4) {
        return { type: 'CHALLENGE_ACTION', playerId: botPlayerId };
      }
    }

    // Block check:
    if (act.type === 'ASSASSINATE' && act.targetId === botPlayerId) {
      if (myRoles.includes('contessa')) {
        return { type: 'DECLARE_BLOCK', playerId: botPlayerId, claimedRole: 'contessa' };
      }
      // Bluff Contessa 35% of the time to survive
      if (Math.random() < 0.35) {
        return { type: 'DECLARE_BLOCK', playerId: botPlayerId, claimedRole: 'contessa' };
      }
    }

    if (act.type === 'STEAL' && act.targetId === botPlayerId) {
      if (myRoles.includes('captain')) {
        return { type: 'DECLARE_BLOCK', playerId: botPlayerId, claimedRole: 'captain' };
      }
      if (myRoles.includes('ambassador')) {
        return { type: 'DECLARE_BLOCK', playerId: botPlayerId, claimedRole: 'ambassador' };
      }
      // Bluff block 25% of the time
      if (Math.random() < 0.25) {
        return { type: 'DECLARE_BLOCK', playerId: botPlayerId, claimedRole: 'captain' };
      }
    }

    if (act.type === 'FOREIGN_AID') {
      if (myRoles.includes('duke')) {
        return { type: 'DECLARE_BLOCK', playerId: botPlayerId, claimedRole: 'duke' };
      }
      if (Math.random() < 0.2) {
        return { type: 'DECLARE_BLOCK', playerId: botPlayerId, claimedRole: 'duke' };
      }
    }

    // Otherwise pass reaction
    if (!act.passedPlayerIds.includes(botPlayerId)) {
      return { type: 'PASS_ACTION_REACTION', playerId: botPlayerId };
    }
  }

  // 4. Reaction to declared block
  if (state.phase === 'block_reaction' && state.pendingBlock) {
    const blk = state.pendingBlock;
    if (blk.blockerId === botPlayerId) return null;

    const deadCopies = state.discardGraveyard.filter((c) => c.role === blk.claimedRole).length;
    const myCopies = myRoles.filter((r) => r === blk.claimedRole).length;

    // Guaranteed challenge if all 3 copies accounted for
    if (deadCopies + myCopies >= 3) {
      return { type: 'CHALLENGE_BLOCK', playerId: botPlayerId };
    }

    if (!blk.passedPlayerIds.includes(botPlayerId)) {
      return { type: 'PASS_BLOCK_REACTION', playerId: botPlayerId };
    }
  }

  // 5. Active Action Selection
  if (state.phase === 'action_selection' && state.currentTurnPlayerId === botPlayerId) {
    // Other alive players
    const targets = state.turnOrder.filter(
      (id) => id !== botPlayerId && !state.players[id].isEliminated
    );
    // Sort targets by most coins (highest threat)
    targets.sort((a, b) => state.players[b].coins - state.players[a].coins);
    const topThreat = targets[0] || botPlayerId;

    // 10+ coins: MUST Coup!
    if (bot.coins >= 10 || bot.coins >= 7) {
      return {
        type: 'DECLARE_ACTION',
        playerId: botPlayerId,
        actionType: 'COUP',
        targetId: topThreat,
      };
    }

    // If Assassin role and >= 3 coins, strike!
    if (bot.coins >= 3 && myRoles.includes('assassin')) {
      return {
        type: 'DECLARE_ACTION',
        playerId: botPlayerId,
        actionType: 'ASSASSINATE',
        targetId: topThreat,
      };
    }

    // If Duke, take Tax (+3)
    if (myRoles.includes('duke')) {
      return {
        type: 'DECLARE_ACTION',
        playerId: botPlayerId,
        actionType: 'TAX',
      };
    }

    // If Captain and a target has coins, Steal!
    if (myRoles.includes('captain') && state.players[topThreat]?.coins >= 1) {
      return {
        type: 'DECLARE_ACTION',
        playerId: botPlayerId,
        actionType: 'STEAL',
        targetId: topThreat,
      };
    }

    // If Ambassador, Exchange!
    if (myRoles.includes('ambassador') && Math.random() < 0.5) {
      return {
        type: 'DECLARE_ACTION',
        playerId: botPlayerId,
        actionType: 'EXCHANGE',
      };
    }

    // Bluff Tax 30% of the time
    if (Math.random() < 0.3) {
      return {
        type: 'DECLARE_ACTION',
        playerId: botPlayerId,
        actionType: 'TAX',
      };
    }

    // Fallback: Foreign Aid or Income
    if (Math.random() < 0.5) {
      return {
        type: 'DECLARE_ACTION',
        playerId: botPlayerId,
        actionType: 'FOREIGN_AID',
      };
    }

    return {
      type: 'DECLARE_ACTION',
      playerId: botPlayerId,
      actionType: 'INCOME',
    };
  }

  return null;
}
