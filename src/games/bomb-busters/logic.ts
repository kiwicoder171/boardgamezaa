import { Player, Room } from '@/types/game';
import {
  BombBustersAction,
  BombBustersClientState,
  BombBustersSettings,
  BombBustersState,
  WireTile,
  WireValue,
} from './types';
import { BOMB_BUSTERS_MISSIONS, MissionDefinition } from './missions';

export function getMissionById(missionId: number): MissionDefinition {
  return (
    BOMB_BUSTERS_MISSIONS.find((m) => m.id === missionId) ||
    BOMB_BUSTERS_MISSIONS[0]
  );
}

export function initBombBustersGame(
  players: Player[],
  settings: BombBustersSettings
): BombBustersState {
  if (players.length < 2) {
    throw new Error('Bomb Busters requires at least 2 players');
  }

  // 1. Resolve mission definition
  const missionId = settings.missionId || 1;
  const mission = getMissionById(missionId);

  const range = mission.numberRange || 8;
  const copies = mission.wiresPerNumber || 4; // 2 pairs (4 copies) per number
  // Official allowed mistakes: Number of players + 1
  const formulaLives = players.length + 1;
  const lives =
    settings.detonatorLives && settings.detonatorLives > 0
      ? settings.detonatorLives
      : formulaLives;
  const redCount = mission.redWiresCount;
  const yellowDecimals = mission.yellowDecimals || [];

  // Build deck of wire tiles
  const rawDeck: { value: WireValue; color: 'blue' | 'yellow' | 'red' }[] = [];

  // Standard Blue Wires (4 copies / 2 pairs each)
  const validationTrack: Record<number, { cut: number; total: number; isValidated: boolean }> = {};
  for (let num = 1; num <= range; num++) {
    validationTrack[num] = { cut: 0, total: copies, isValidated: false };
    for (let c = 0; c < copies; c++) {
      rawDeck.push({ value: num, color: 'blue' });
    }
  }

  // Yellow Decimal Wires (.1 decimals, e.g. 1.1, 2.1, 3.1)
  if (yellowDecimals.length > 0) {
    yellowDecimals.forEach((dec) => {
      rawDeck.push({ value: dec, color: 'yellow' });
      rawDeck.push({ value: dec, color: 'yellow' });
    });
  } else if (mission.id > 10) {
    // Missions past 10 introduce yellow .1 wires
    const yellowCount = Math.min(range - 1, 3);
    for (let y = 1; y <= yellowCount; y++) {
      const decVal = Number((y + 0.1).toFixed(1));
      rawDeck.push({ value: decVal, color: 'yellow' });
      rawDeck.push({ value: decVal, color: 'yellow' });
    }
  }

  // Red Lethal Trap Wires (.5 decimals, e.g. 1.5, 2.5, 3.5)
  for (let r = 0; r < redCount; r++) {
    const redDec = Number(((r % (range - 1)) + 1 + 0.5).toFixed(1));
    rawDeck.push({ value: redDec, color: 'red' });
  }

  // Shuffle deck
  const shuffled = [...rawDeck].sort(() => Math.random() - 0.5);

  // Deal evenly among players
  const stands: Record<string, WireTile[]> = {};
  players.forEach((p) => {
    stands[p.id] = [];
  });

  shuffled.forEach((wire, idx) => {
    const player = players[idx % players.length];
    stands[player.id].push({
      id: `wire_${player.id}_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      value: wire.value,
      color: wire.color,
      isCut: false,
      infoToken: null,
      clues: [],
    });
  });

  // Sort each player's rack in ascending order (Rule of Bomb Busters)
  // Whole numbers, .1 decimals, and .5 red wires sort by numeric value
  players.forEach((p) => {
    stands[p.id].sort((a, b) => {
      const valA = typeof a.value === 'number' ? a.value : parseFloat(a.value as string);
      const valB = typeof b.value === 'number' ? b.value : parseFloat(b.value as string);
      return valA - valB;
    });
  });

  // Total wires to cut (all non-red wires)
  const totalWiresToCut = rawDeck.filter((w) => w.color !== 'red').length;
  // Shuffle turn order to choose captain (Player 1 is Captain)
  const turnOrder = [...players.map((p) => p.id)].sort(() => Math.random() - 0.5);
  const captainPlayerId = turnOrder[0];

  // Helper Cards with unlock conditions (cutting specific numbers)
  const helperCards = [
    {
      id: 'helper_relay',
      name: 'Tactical Info Relay',
      nameTh: 'โทเคนบอกใบ้เสริม',
      description: 'วาง Info Token พิเศษเพิ่มบนสายไฟของตัวเอง 1 เส้น',
      requiredNumber: Math.min(range, 2),
      isUnlocked: false,
      isUsed: false,
      effect: 'EXTRA_INFO_TOKEN' as const,
    },
    {
      id: 'helper_coolant',
      name: 'Stabilizer Coolant',
      nameTh: 'สารหน่วงชนวน',
      description: 'ฟื้นฟูความเสถียรของชนวนระเบิด (+1 Detonator Stability)',
      requiredNumber: Math.min(range, Math.max(3, Math.floor(range / 2))),
      isUnlocked: false,
      isUsed: false,
      effect: 'RESTORE_STABILITY' as const,
    },
    {
      id: 'helper_probe',
      name: 'Safe X-Ray Probe',
      nameTh: 'เอกซเรย์ส่องตรวจ',
      description: 'ตรวจสอบสายไฟเพื่อน 1 เส้นอย่างปลอดภัยโดยไม่เสี่ยงระเบิด',
      requiredNumber: Math.min(range, range - 1),
      isUnlocked: false,
      isUsed: false,
      effect: 'PEEK_WIRE' as const,
    },
  ];

  const doubleDetectorUsed: Record<string, boolean> = {};
  players.forEach((p) => {
    doubleDetectorUsed[p.id] = false;
  });

  const captainName = players.find((p) => p.id === captainPlayerId)?.name || 'Captain';

  // Pre-place starting Info Token for bots so human players don't wait on them
  players.forEach((p) => {
    if (p.id.startsWith('bot_') || p.id.startsWith('mouse_bot_') || p.id.startsWith('spy_bot_')) {
      const stand = stands[p.id] || [];
      const blueWires = stand.filter((w) => w.color === 'blue' && !w.isCut && w.infoToken === null);
      if (blueWires.length > 0) {
        const pick = blueWires[Math.floor(blueWires.length / 2)];
        pick.infoToken = pick.value;
        pick.clues.push(`Token: #${pick.value}`);
      }
    }
  });

  const allInitialPlaced = turnOrder.every((pid) => {
    const s = stands[pid] || [];
    return s.some((w) => w.infoToken !== null);
  });

  return {
    missionId: mission.id,
    missionName: mission.name,
    missionBriefing: mission.briefing,
    captainPlayerId,
    stands,
    detonatorLives: lives,
    maxDetonatorLives: lives,
    currentTurnPlayerId: turnOrder[0],
    turnOrder,
    totalWiresToCut,
    cutWiresCount: 0,
    phase: allInitialPlaced ? 'in_progress' : 'initial_clue',
    endReason: null,
    validationTrack,
    helperCards,
    doubleDetectorUsed,
    equipment: {
      scannerAvailable: mission.equipment.scanner,
      stabilizerAvailable: mission.equipment.stabilizer,
    },
    numberRange: range,
    history: [
      {
        id: 'start',
        text: `💣 Mission #${mission.id}: "${mission.name}" started! 👑 Captain: ${captainName}. Total ${totalWiresToCut} wires to defuse. Detonator stability: ${lives} cells (${players.length}+1).`,
        time: Date.now(),
        type: 'info',
      },
      {
        id: 'clue_phase',
        text: `💡 SETUP PHASE: Starting with Captain ${captainName}, each operative chooses 1 Blue wire to place their starting Info Token!`,
        time: Date.now() + 1,
        type: 'info',
      },
    ],
  };
}

function getNextActivePlayerId(state: BombBustersState, currentId: string): string {
  const currentIdx = state.turnOrder.indexOf(currentId);
  for (let i = 1; i <= state.turnOrder.length; i++) {
    const nextId = state.turnOrder[(currentIdx + i) % state.turnOrder.length];
    const stand = state.stands[nextId];
    // Check if player has at least 1 uncut wire
    const hasUncutWires = stand && stand.some((w) => !w.isCut);
    if (hasUncutWires) {
      return nextId;
    }
  }
  return currentId;
}

function checkHelperCardsUnlock(state: BombBustersState, cutNumber: number) {
  state.helperCards.forEach((card) => {
    if (card.requiredNumber === cutNumber && !card.isUnlocked) {
      card.isUnlocked = true;
      state.history.push({
        id: `unlock_${Date.now()}_${card.id}`,
        text: `✨ HELPER CARD UNLOCKED! "${card.nameTh} (${card.name})" is now available for deployment!`,
        time: Date.now(),
        type: 'info',
      });
    }
  });
}

export function handleBombBustersAction(
  state: BombBustersState,
  action: BombBustersAction & { _asPlayerId?: string },
  playerId: string,
  room: Room<BombBustersState, BombBustersSettings>
): { newState: BombBustersState; events?: string[]; error?: string } {
  const effectivePlayerId =
    playerId === room.hostId && action._asPlayerId ? action._asPlayerId : playerId;
  const player = room.players.find((p) => p.id === effectivePlayerId);
  const playerName = player?.name || 'Operative';

  if (state.phase !== 'in_progress' && state.phase !== 'initial_clue') {
    return { newState: state, error: 'The mission has already concluded.' };
  }

  if (state.phase === 'initial_clue') {
    if (action.type !== 'PLACE_INFO_TOKEN' && action.type !== 'BOT_AUTO_TURN') {
      return { newState: state, error: 'Please place your starting clue token before cutting wires.' };
    }
  } else {
    if (
      state.currentTurnPlayerId !== effectivePlayerId &&
      action.type !== 'USE_STABILIZER' &&
      action.type !== 'BOT_AUTO_TURN'
    ) {
      return { newState: state, error: 'It is not your turn to cut wires.' };
    }
  }

  switch (action.type) {
    case 'BOT_AUTO_TURN': {
      const botId = action.botId;
      if (state.currentTurnPlayerId !== botId) {
        return { newState: state };
      }
      const botAction = getBombBustersBotAction(state, botId);
      if (!botAction) {
        return handleBombBustersAction(state, { type: 'PASS_TURN' }, botId, room);
      }
      return handleBombBustersAction(state, botAction, botId, room);
    }

    case 'CUT_WIRE': {
      const myStand = state.stands[effectivePlayerId];
      const targetStand = state.stands[action.targetPlayerId];

      if (!myStand || !targetStand) {
        return { newState: state, error: 'Invalid operative stand.' };
      }
      if (action.targetPlayerId === effectivePlayerId) {
        return { newState: state, error: 'You must pair your wire with a teammate, or use Solo Cut if you hold both!' };
      }

      const myWire = myStand.find((w) => w.id === action.myWireId);
      const targetWire = targetStand.find((w) => w.id === action.targetWireId);

      if (!myWire || myWire.isCut) {
        return { newState: state, error: 'Selected wire of yours is already cut or missing.' };
      }
      if (!targetWire || targetWire.isCut) {
        return { newState: state, error: 'Target wire is already cut or missing.' };
      }

      const targetPlayer = room.players.find((p) => p.id === action.targetPlayerId);
      const targetName = targetPlayer?.name || 'Teammate';

      const nextTurnPlayerId = getNextActivePlayerId(state, effectivePlayerId);

      // 1. Check if RED wire triggered (Lethal Trap)
      if (targetWire.color === 'red' || myWire.color === 'red') {
        targetWire.isCut = true;
        return {
          newState: {
            ...state,
            phase: 'exploded',
            endReason: `💥 CATASTROPHIC FAILURE! The lethal RED WIRE was cut! The explosive detonated immediately!`,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `💥 DISASTER! ${playerName} accidentally cut the RED WIRE on ${targetName}'s stand! KABOOM!`,
                time: Date.now(),
                type: 'boom',
              },
            ],
          },
        };
      }

      // 2. Matching values or matching yellow wire check
      const matches =
        myWire.value === targetWire.value ||
        (myWire.color === 'yellow' && targetWire.color === 'yellow');

      if (matches) {
        // SUCCESSFUL DUO CUT!
        const newCutCount = state.cutWiresCount + 2;

        const updatedStands = {
          ...state.stands,
          [effectivePlayerId]: (state.stands[effectivePlayerId] || []).map((w) =>
            w.id === myWire.id ? { ...w, isCut: true } : w
          ),
          [action.targetPlayerId]: (state.stands[action.targetPlayerId] || []).map((w) =>
            w.id === targetWire.id ? { ...w, isCut: true } : w
          ),
        };

        // Update validation track
        const updatedValidation = { ...state.validationTrack };
        const valNum = Math.floor(Number(myWire.value));
        if (updatedValidation[valNum]) {
          const cutSoFar = updatedValidation[valNum].cut + 2;
          updatedValidation[valNum] = {
            ...updatedValidation[valNum],
            cut: cutSoFar,
            isValidated: cutSoFar >= updatedValidation[valNum].total,
          };
        }

        checkHelperCardsUnlock(state, valNum);
        const isDefused = newCutCount >= state.totalWiresToCut;

        return {
          newState: {
            ...state,
            stands: updatedStands,
            cutWiresCount: newCutCount,
            validationTrack: updatedValidation,
            currentTurnPlayerId: nextTurnPlayerId,
            phase: isDefused ? 'victory' : 'in_progress',
            endReason: isDefused ? `🎉 BOMB DEFUSED! All circuits were disarmed cleanly without detonating!` : null,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `✂️ MATCH CONFIRMED! ${playerName} and ${targetName} matched wire #${myWire.value}! Both wires safely cut! (${newCutCount}/${state.totalWiresToCut} wires cut)`,
                time: Date.now(),
                type: 'success',
              },
            ],
          },
        };
      } else {
        // WRONG GUESS!
        // OFFICIAL RULE: Detonator stability decreases by 1, and the teammate places an INFO TOKEN showing the real value!
        const nextDetonator = state.detonatorLives - 1;
        const updatedStands = {
          ...state.stands,
          [action.targetPlayerId]: (state.stands[action.targetPlayerId] || []).map((w) =>
            w.id === targetWire.id
              ? {
                  ...w,
                  infoToken: targetWire.value,
                  clues: [...w.clues, `Token: #${targetWire.value}`, `≠${myWire.value}`],
                }
              : w
          ),
        };

        const isExploded = nextDetonator <= 0;

        return {
          newState: {
            ...state,
            stands: updatedStands,
            detonatorLives: Math.max(0, nextDetonator),
            currentTurnPlayerId: nextTurnPlayerId,
            phase: isExploded ? 'exploded' : 'in_progress',
            endReason: isExploded ? `💥 DETONATOR EXPLODED! Stability dropped to 0!` : null,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `⚠️ MISSED CALL! ${playerName} guessed #${myWire.value}, but ${targetName}'s wire was #${targetWire.value}! Revealed with Info Token #${targetWire.value}. Stability: ${nextDetonator}.`,
                time: Date.now(),
                type: isExploded ? 'boom' : 'error',
              },
            ],
          },
        };
      }
    }

    case 'SOLO_CUT': {
      // Official Rule:
      // Case 1: Player holds all 4 copies in hand -> cut all 4
      // Case 2: 1 pair was already cut on board -> player cuts remaining pair in hand
      const myStand = state.stands[effectivePlayerId];
      if (!myStand) return { newState: state, error: 'Stand not found.' };

      const wireIds = [action.wireId1, action.wireId2, action.wireId3, action.wireId4].filter(Boolean) as string[];
      if (wireIds.length !== 2 && wireIds.length !== 4) {
        return { newState: state, error: 'Solo Cut requires either 2 wires (with 1 pair already cut) or all 4 wires of that value.' };
      }

      const selectedWires = wireIds.map((id) => myStand.find((w) => w.id === id));
      if (selectedWires.some((w) => !w || w.isCut)) {
        return { newState: state, error: 'One or more selected wires are missing or already cut.' };
      }

      const firstVal = selectedWires[0]!.value;
      if (selectedWires.some((w) => w!.value !== firstVal)) {
        return { newState: state, error: 'Solo Cut wires must all share the exact same value.' };
      }
      if (selectedWires.some((w) => w!.color === 'red')) {
        return { newState: state, error: 'You cannot cut red wires.' };
      }

      const valNum = Math.floor(Number(firstVal));
      const track = state.validationTrack[valNum];

      const isValidFourCut = wireIds.length === 4;
      const isValidTwoCut = wireIds.length === 2 && track && track.cut >= 2;

      if (!isValidFourCut && !isValidTwoCut) {
        return {
          newState: state,
          error: `Solo Cut not allowed! You can only Solo Cut 2 wires if 1 pair of #${valNum} was already cut on the board, or 4 wires if you hold all 4 in hand!`,
        };
      }

      const updatedStands = {
        ...state.stands,
        [effectivePlayerId]: (state.stands[effectivePlayerId] || []).map((w) =>
          wireIds.includes(w.id) ? { ...w, isCut: true } : w
        ),
      };

      const newCutCount = state.cutWiresCount + wireIds.length;
      const updatedValidation = { ...state.validationTrack };
      if (updatedValidation[valNum]) {
        const cutSoFar = updatedValidation[valNum].cut + wireIds.length;
        updatedValidation[valNum] = {
          ...updatedValidation[valNum],
          cut: cutSoFar,
          isValidated: cutSoFar >= updatedValidation[valNum].total,
        };
      }

      checkHelperCardsUnlock(state, valNum);
      const nextTurnPlayerId = getNextActivePlayerId(state, effectivePlayerId);
      const isDefused = newCutCount >= state.totalWiresToCut;

      return {
        newState: {
          ...state,
          stands: updatedStands,
          cutWiresCount: newCutCount,
          validationTrack: updatedValidation,
          currentTurnPlayerId: nextTurnPlayerId,
          phase: isDefused ? 'victory' : 'in_progress',
          endReason: isDefused ? `🎉 BOMB DEFUSED! All circuits were disarmed cleanly!` : null,
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `🎯 SOLO CUT! ${playerName} cleared ${wireIds.length} wires of #${firstVal} independently! (${newCutCount}/${state.totalWiresToCut} cut)`,
              time: Date.now(),
              type: 'success',
            },
          ],
        },
      };
    }

    case 'USE_DOUBLE_DETECTOR': {
      if (state.doubleDetectorUsed[effectivePlayerId]) {
        return { newState: state, error: 'You have already used your Double Detector skill this mission (1 use per mission).' };
      }
      if (action.targetPlayerId === effectivePlayerId) {
        return { newState: state, error: 'You must target a teammate\'s stand for Double Detector.' };
      }
      const targetStand = state.stands[action.targetPlayerId];
      if (!targetStand) return { newState: state, error: 'Target stand not found.' };

      const uncutTargetWires = targetStand.filter((w) => !w.isCut);
      const idx1 = uncutTargetWires.findIndex((w) => w.id === action.wireId1);
      const idx2 = uncutTargetWires.findIndex((w) => w.id === action.wireId2);

      if (idx1 === -1 || idx2 === -1) {
        return { newState: state, error: 'Selected wires must be uncut wires on target\'s stand.' };
      }
      if (Math.abs(idx1 - idx2) !== 1) {
        return { newState: state, error: 'Double Detector requires selecting 2 ADJACENT wires on teammate\'s stand.' };
      }

      const w1 = uncutTargetWires[idx1];
      const w2 = uncutTargetWires[idx2];
      const targetPlayer = room.players.find((p) => p.id === action.targetPlayerId);
      const targetName = targetPlayer?.name || 'Teammate';

      const match1 = w1.value === action.guessedValue;
      const match2 = w2.value === action.guessedValue;

      const updatedDoubleDetector = { ...state.doubleDetectorUsed, [effectivePlayerId]: true };

      if (match1 && match2) {
        // 9.1: Both match! Cut both wires!
        w1.isCut = true;
        w2.isCut = true;
        const newCutCount = state.cutWiresCount + 2;
        const updatedValidation = { ...state.validationTrack };
        const valNum = Math.floor(Number(action.guessedValue));
        if (updatedValidation[valNum]) {
          const cutSoFar = updatedValidation[valNum].cut + 2;
          updatedValidation[valNum] = {
            ...updatedValidation[valNum],
            cut: cutSoFar,
            isValidated: cutSoFar >= updatedValidation[valNum].total,
          };
        }
        checkHelperCardsUnlock(state, valNum);
        const isDefused = newCutCount >= state.totalWiresToCut;
        const nextTurnPlayerId = getNextActivePlayerId(state, effectivePlayerId);

        return {
          newState: {
            ...state,
            cutWiresCount: newCutCount,
            validationTrack: updatedValidation,
            doubleDetectorUsed: updatedDoubleDetector,
            currentTurnPlayerId: nextTurnPlayerId,
            phase: isDefused ? 'victory' : 'in_progress',
            endReason: isDefused ? `🎉 BOMB DEFUSED! All circuits were disarmed cleanly!` : null,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `⚡ DOUBLE DETECTOR PERFECT HIT! ${playerName} guessed #${action.guessedValue} and matched BOTH adjacent wires on ${targetName}'s stand! Cut both!`,
                time: Date.now(),
                type: 'success',
              },
            ],
          },
        };
      } else if (match1 || match2) {
        // 9.2: Exactly 1 matches! Reveal the matching wire with Info Token!
        const matchedWire = match1 ? w1 : w2;
        matchedWire.infoToken = matchedWire.value;
        matchedWire.clues.push(`DoubleDetector: #${matchedWire.value}`);
        const nextTurnPlayerId = getNextActivePlayerId(state, effectivePlayerId);

        return {
          newState: {
            ...state,
            doubleDetectorUsed: updatedDoubleDetector,
            currentTurnPlayerId: nextTurnPlayerId,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `🔍 DOUBLE DETECTOR: 1 of 2 wires matched #${action.guessedValue}! Revealed Info Token on ${targetName}'s rack. Detonator stability remains safe!`,
                time: Date.now(),
                type: 'info',
              },
            ],
          },
        };
      } else {
        // 9.3: Neither matches! Detonator loses 1 life!
        const nextLives = state.detonatorLives - 1;
        const isExploded = nextLives <= 0;
        const nextTurnPlayerId = getNextActivePlayerId(state, effectivePlayerId);

        return {
          newState: {
            ...state,
            detonatorLives: Math.max(0, nextLives),
            doubleDetectorUsed: updatedDoubleDetector,
            currentTurnPlayerId: nextTurnPlayerId,
            phase: isExploded ? 'exploded' : 'in_progress',
            endReason: isExploded ? `💥 DETONATOR EXPLODED! Stability dropped to 0!` : null,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `⚠️ DOUBLE DETECTOR MISS! Neither adjacent wire was #${action.guessedValue}! Detonator lost 1 stability cell (${nextLives} remaining).`,
                time: Date.now(),
                type: isExploded ? 'boom' : 'error',
              },
            ],
          },
        };
      }
    }

    case 'USE_HELPER_CARD': {
      const card = state.helperCards.find((c) => c.id === action.cardId);
      if (!card) return { newState: state, error: 'Helper card not found.' };
      if (!card.isUnlocked) return { newState: state, error: 'This card is still locked! Cut wire #' + card.requiredNumber + ' to unlock.' };
      if (card.isUsed) return { newState: state, error: 'This card has already been consumed.' };

      let logText = '';
      if (card.effect === 'RESTORE_STABILITY') {
        state.detonatorLives = Math.min(state.maxDetonatorLives, state.detonatorLives + 1);
        logText = `🔋 HELPER CARD: ${playerName} deployed "${card.nameTh}" and restored +1 Detonator Stability!`;
      } else if (card.effect === 'EXTRA_INFO_TOKEN') {
        const myStand = state.stands[effectivePlayerId];
        const targetWire = myStand?.find((w) => w.id === action.targetWireId);
        if (!targetWire || targetWire.isCut) {
          return { newState: state, error: 'Select an uncut wire from your stand to place an extra Info Token.' };
        }
        targetWire.infoToken = targetWire.value;
        targetWire.clues.push(`CardToken: #${targetWire.value}`);
        logText = `💡 HELPER CARD: ${playerName} deployed "${card.nameTh}" to place an extra Info Token on wire #${targetWire.value}!`;
      } else if (card.effect === 'PEEK_WIRE') {
        logText = `🔍 HELPER CARD: ${playerName} deployed "${card.nameTh}"!`;
      }

      card.isUsed = true;
      return {
        newState: {
          ...state,
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: logText,
              time: Date.now(),
              type: 'success',
            },
          ],
        },
      };
    }

    case 'REVEAL_RED_WIRES': {
      const myStand = state.stands[effectivePlayerId];
      if (!myStand) return { newState: state, error: 'Stand not found.' };

      const hasUncutNonRed = myStand.some((w) => !w.isCut && w.color !== 'red');
      if (hasUncutNonRed) {
        return { newState: state, error: 'You can only safely reveal red wires when all other wires in your stand are already cut!' };
      }

      let revealedCount = 0;
      myStand.forEach((w) => {
        if (w.color === 'red' && !w.isCut) {
          w.isCut = true;
          w.infoToken = w.value;
          revealedCount++;
        }
      });

      const nextTurnPlayerId = getNextActivePlayerId(state, effectivePlayerId);
      return {
        newState: {
          ...state,
          currentTurnPlayerId: nextTurnPlayerId,
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `🛡️ SAFE RED WIRE REVEAL! ${playerName} cleared all operative wires and safely neutralized ${revealedCount} RED WIRE(S)!`,
              time: Date.now(),
              type: 'info',
            },
          ],
        },
      };
    }

    case 'USE_SCANNER': {
      if (!state.equipment.scannerAvailable) {
        return { newState: state, error: 'Sonar Scanner tool has already been depleted.' };
      }
      const targetStand = state.stands[action.targetPlayerId];
      if (!targetStand) return { newState: state, error: 'Target not found.' };

      const targetPlayer = room.players.find((p) => p.id === action.targetPlayerId);
      const targetName = targetPlayer?.name || 'Teammate';

      // Find matching wires and tag them
      let matches = 0;
      targetStand.forEach((w) => {
        if (!w.isCut && w.value === action.scannedValue) {
          matches++;
          w.clues.push(`Sonar: =${action.scannedValue}`);
        }
      });

      return {
        newState: {
          ...state,
          equipment: {
            ...state.equipment,
            scannerAvailable: false,
          },
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `📡 SONAR SCANNER: ${playerName} scanned ${targetName} for #${action.scannedValue}: Confirmed ${matches} wire(s)!`,
              time: Date.now(),
              type: 'info',
            },
          ],
        },
      };
    }

    case 'USE_STABILIZER': {
      if (!state.equipment.stabilizerAvailable) {
        return { newState: state, error: 'Detonator Stabilizer already consumed.' };
      }
      if (state.detonatorLives >= state.maxDetonatorLives) {
        return { newState: state, error: 'Detonator stability is already at maximum.' };
      }

      return {
        newState: {
          ...state,
          detonatorLives: state.detonatorLives + 1,
          equipment: {
            ...state.equipment,
            stabilizerAvailable: false,
          },
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `🔋 STABILIZER: ${playerName} reinforced detonator stability (+1 fuse cell)!`,
              time: Date.now(),
              type: 'success',
            },
          ],
        },
      };
    }

    case 'PLACE_INFO_TOKEN': {
      if (state.phase !== 'initial_clue') {
        return {
          newState: state,
          error: 'Info Tokens can only be manually placed during the initial clue setup phase.',
        };
      }

      const myStand = state.stands[effectivePlayerId];
      if (!myStand) return { newState: state, error: 'Stand not found.' };

      const targetWire = myStand.find((w) => w.id === action.wireId);
      if (!targetWire) return { newState: state, error: 'Wire not found on your stand.' };
      if (targetWire.isCut) return { newState: state, error: 'Wire is already cut.' };
      const alreadyPlaced = myStand.some((w) => w.infoToken !== null);
      if (alreadyPlaced) {
        return { newState: state, error: 'You have already placed your starting Info Token for this mission.' };
      }

      if (targetWire.color !== 'blue') {
        return { newState: state, error: 'Starting Info Token must be placed on a standard Blue wire.' };
      }

      const updatedStands = {
        ...state.stands,
        [effectivePlayerId]: (state.stands[effectivePlayerId] || []).map((w) =>
          w.id === targetWire.id
            ? {
                ...w,
                infoToken: targetWire.value,
                clues: [...w.clues, `Token: #${targetWire.value}`],
              }
            : w
        ),
      };

      const currentTurnIndex = state.turnOrder.indexOf(effectivePlayerId);
      // Check if all players have now placed their starting Info token
      const allPlaced = state.turnOrder.every((pid) => {
        const s = updatedStands[pid] || [];
        return s.some((w) => w.infoToken !== null);
      });

      if (allPlaced) {
        const captainName = room.players.find((p) => p.id === state.captainPlayerId)?.name || 'Captain';
        return {
          newState: {
            ...state,
            stands: updatedStands,
            phase: 'in_progress',
            currentTurnPlayerId: state.captainPlayerId,
            history: [
              ...state.history,
              {
                id: `${Date.now()}_clue`,
                text: `💡 SETUP: ${playerName} placed starting Info Token #${targetWire.value}!`,
                time: Date.now(),
                type: 'info',
              },
              {
                id: `${Date.now()}_ready`,
                text: `🚀 ALL OPERATIVES HAVE DEPLOYED STARTING CLUES! Captain ${captainName} begins the defusal mission!`,
                time: Date.now() + 1,
                type: 'success',
              },
            ],
          },
        };
      } else {
        const nextTurnPlayerId = state.turnOrder[(currentTurnIndex + 1) % state.turnOrder.length];
        const nextPlayerName = room.players.find((p) => p.id === nextTurnPlayerId)?.name || 'Next operative';
        return {
          newState: {
            ...state,
            stands: updatedStands,
            currentTurnPlayerId: nextTurnPlayerId,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `💡 SETUP: ${playerName} placed starting Info Token #${targetWire.value}! Waiting for remaining squad operatives.`,
                time: Date.now(),
                type: 'info',
              },
            ],
          },
        };
      }
    }

    case 'OPERATIVE_CALL': {
      // Used when a player (e.g. who has all wires cut, or as a tactical deduction) calls out a number directly
      const targetStand = state.stands[action.targetPlayerId];
      if (!targetStand) return { newState: state, error: 'Target stand not found.' };

      const targetWire = targetStand.find((w) => w.id === action.targetWireId);
      if (!targetWire || targetWire.isCut) {
        return { newState: state, error: 'Target wire is already cut or missing.' };
      }

      const targetPlayer = room.players.find((p) => p.id === action.targetPlayerId);
      const targetName = targetPlayer?.name || 'Teammate';

      const currentTurnIndex = state.turnOrder.indexOf(effectivePlayerId);
      const nextTurnPlayerId = state.turnOrder[(currentTurnIndex + 1) % state.turnOrder.length];

      if (targetWire.value === 'RED') {
        targetWire.isCut = true;
        return {
          newState: {
            ...state,
            phase: 'exploded',
            endReason: `💥 CATASTROPHIC FAILURE! The lethal RED WIRE was cut by operative call! KABOOM!`,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `💥 DISASTER! ${playerName} triggered the RED WIRE on ${targetName}'s stand!`,
                time: Date.now(),
                type: 'boom',
              },
            ],
          },
        };
      }

      if (targetWire.value === action.guessedValue) {
        // Correct deduction call!
        targetWire.isCut = true;
        const newCutCount = state.cutWiresCount + 1;

        const updatedValidation = { ...state.validationTrack };
        const valNum = Number(targetWire.value);
        if (updatedValidation[valNum]) {
          const cutSoFar = updatedValidation[valNum].cut + 1;
          updatedValidation[valNum] = {
            ...updatedValidation[valNum],
            cut: cutSoFar,
            isValidated: cutSoFar >= updatedValidation[valNum].total,
          };
        }

        const isDefused = newCutCount >= state.totalWiresToCut;

        return {
          newState: {
            ...state,
            cutWiresCount: newCutCount,
            validationTrack: updatedValidation,
            currentTurnPlayerId: nextTurnPlayerId,
            phase: isDefused ? 'victory' : 'in_progress',
            endReason: isDefused ? `🎉 BOMB DEFUSED! All circuits were disarmed cleanly!` : null,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `🎯 CALL CONFIRMED! ${playerName} correctly identified wire #${action.guessedValue} on ${targetName}'s stand! (${newCutCount}/${state.totalWiresToCut} wires cut)`,
                time: Date.now(),
                type: 'success',
              },
            ],
          },
        };
      } else {
        // Missed call!
        const nextDetonator = state.detonatorLives - 1;
        targetWire.infoToken = targetWire.value;
        targetWire.clues.push(`Token: #${targetWire.value}`);
        targetWire.clues.push(`≠${action.guessedValue}`);

        const isExploded = nextDetonator <= 0;

        return {
          newState: {
            ...state,
            detonatorLives: Math.max(0, nextDetonator),
            currentTurnPlayerId: nextTurnPlayerId,
            phase: isExploded ? 'exploded' : 'in_progress',
            endReason: isExploded ? `💥 DETONATOR EXPLODED! Stability dropped to 0!` : null,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `⚠️ MISS! ${playerName} guessed #${action.guessedValue}, but ${targetName}'s wire was #${targetWire.value}! Info Token placed. Stability: ${nextDetonator}.`,
                time: Date.now(),
                type: isExploded ? 'boom' : 'error',
              },
            ],
          },
        };
      }
    }

    case 'PASS_TURN': {
      const currentTurnIndex = state.turnOrder.indexOf(effectivePlayerId);
      const nextTurnPlayerId = state.turnOrder[(currentTurnIndex + 1) % state.turnOrder.length];

      return {
        newState: {
          ...state,
          currentTurnPlayerId: nextTurnPlayerId,
          history: [
            ...state.history,
            {
              id: `${Date.now()}`,
              text: `⏭️ ${playerName} passed turn to the next operative.`,
              time: Date.now(),
              type: 'info',
            },
          ],
        },
      };
    }

    default:
      return { newState: state };
  }
}

export function sanitizeBombBustersState(
  state: BombBustersState,
  playerId: string
): BombBustersClientState {
  const isGameOver = state.phase === 'victory' || state.phase === 'exploded';

  const sanitizedStands: Record<string, any[]> = {};

  Object.entries(state.stands).forEach(([pId, wires]) => {
    const isOwner = pId === playerId;

    sanitizedStands[pId] = wires.map((wire) => {
      const hasInfoToken = wire.infoToken !== null;
      // Absolute Fog-of-War:
      // A wire's value is visible ONLY IF:
      // 1. The game has concluded (victory or exploded)
      // 2. The viewer is the owner of this stand
      // 3. The wire has already been cut
      // 4. An Info Token has been placed on this wire
      // BOTS AND TEAMMATES ARE COMPLETELY MASKED from all human players!
      const canSeeValue = isGameOver || isOwner || wire.isCut || hasInfoToken;

      return {
        id: wire.id,
        value: canSeeValue ? wire.value : null,
        color: canSeeValue ? wire.color : 'blue',
        isCut: wire.isCut,
        infoToken: wire.infoToken,
        clues: wire.clues,
      };
    });
  });

  return {
    missionId: state.missionId,
    missionName: state.missionName,
    missionBriefing: state.missionBriefing,
    captainPlayerId: state.captainPlayerId,
    stands: sanitizedStands,
    detonatorLives: state.detonatorLives,
    maxDetonatorLives: state.maxDetonatorLives,
    currentTurnPlayerId: state.currentTurnPlayerId,
    turnOrder: state.turnOrder,
    totalWiresToCut: state.totalWiresToCut,
    cutWiresCount: state.cutWiresCount,
    phase: state.phase,
    endReason: state.endReason,
    validationTrack: state.validationTrack,
    helperCards: state.helperCards,
    doubleDetectorUsed: state.doubleDetectorUsed,
    equipment: state.equipment,
    history: state.history,
    numberRange: state.numberRange || 12,
    allRevealed: isGameOver,
  };
}

/**
 * Autonomous Server-Side Bot AI for Bomb Busters:
 * Operates with the server's true state without exposing unmasked wires to clients.
 */
export function getBombBustersBotAction(
  state: BombBustersState,
  botPlayerId: string
): BombBustersAction | null {
  const botStand = state.stands[botPlayerId];
  if (!botStand) return null;

  const uncutBotWires = botStand.filter((w) => !w.isCut && w.color !== 'red');
  const uncutRedWires = botStand.filter((w) => !w.isCut && w.color === 'red');
  // If in INITIAL CLUE setup phase, bot places starting Info Token on a blue wire
  if (state.phase === 'initial_clue') {
    const blueWires = uncutBotWires.filter((w) => w.color === 'blue' && w.infoToken === null);
    if (blueWires.length > 0) {
      const pick = blueWires[Math.floor(blueWires.length / 2)];
      return {
        type: 'PLACE_INFO_TOKEN',
        wireId: pick.id,
      };
    }
  }

  // If bot has ONLY red wires remaining, safely reveal them!
  if (uncutBotWires.length === 0 && uncutRedWires.length > 0) {
    return { type: 'REVEAL_RED_WIRES' };
  }

  // If helper card is unlocked and can restore stability, use it
  const unlockedCoolant = state.helperCards.find(
    (c) => c.isUnlocked && !c.isUsed && c.effect === 'RESTORE_STABILITY' && state.detonatorLives < state.maxDetonatorLives
  );
  if (unlockedCoolant) {
    return { type: 'USE_HELPER_CARD', cardId: unlockedCoolant.id };
  }

  // If bot has no uncut wires remaining, make an operative call or pass
  if (uncutBotWires.length === 0) {
    for (const [pId, wires] of Object.entries(state.stands)) {
      if (pId === botPlayerId) continue;
      const targetWire = wires.find((w) => !w.isCut && w.infoToken !== null);
      if (targetWire) {
        return {
          type: 'OPERATIVE_CALL',
          targetPlayerId: pId,
          targetWireId: targetWire.id,
          guessedValue: Number(targetWire.infoToken),
        };
      }
    }
    return { type: 'PASS_TURN' };
  }

  // 1. Guaranteed Duo Cut: Check if any teammate has an Info Token matching one of bot's wires
  for (const bWire of uncutBotWires) {
    if (typeof bWire.value !== 'number') continue;
    for (const [pId, wires] of Object.entries(state.stands)) {
      if (pId === botPlayerId) continue;
      const targetWire = wires.find(
        (w) => !w.isCut && w.infoToken === bWire.value
      );
      if (targetWire) {
        return {
          type: 'CUT_WIRE',
          myWireId: bWire.id,
          targetPlayerId: pId,
          targetWireId: targetWire.id,
        };
      }
    }
  }

  // 2. Solo Cut: If bot holds 2 copies of identical value and no other player holds it
  const valueCounts: Record<number, WireTile[]> = {};
  uncutBotWires.forEach((w) => {
    if (typeof w.value === 'number') {
      if (!valueCounts[w.value]) valueCounts[w.value] = [];
      valueCounts[w.value].push(w);
    }
  });
  for (const [val, group] of Object.entries(valueCounts)) {
    if (group.length >= 2) {
      const v = Number(val);
      const track = state.validationTrack[v];
      if (track && track.cut + group.length >= track.total) {
        return {
          type: 'SOLO_CUT',
          wireId1: group[0].id,
          wireId2: group[1].id,
        };
      }
    }
  }

  // 3. Deduction Duo Cut: find candidate wire that hasn't been ruled out
  for (const bWire of uncutBotWires) {
    if (typeof bWire.value !== 'number') continue;
    for (const [pId, wires] of Object.entries(state.stands)) {
      if (pId === botPlayerId) continue;
      const candidate = wires.find(
        (w) => !w.isCut && !w.clues.includes(`≠${bWire.value}`)
      );
      if (candidate) {
        return {
          type: 'CUT_WIRE',
          myWireId: bWire.id,
          targetPlayerId: pId,
          targetWireId: candidate.id,
        };
      }
    }
  }

  return { type: 'PASS_TURN' };
}
