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

  const range = mission.numberRange;
  const copies = mission.wiresPerNumber || 2;
  const lives = mission.detonatorLives;
  const redCount = mission.redWiresCount;
  const yellowDecimals = mission.yellowDecimals || [];

  // Build deck of wire tiles
  const rawDeck: { value: WireValue; color: 'blue' | 'yellow' | 'red' }[] = [];

  // Standard Blue Wires
  const validationTrack: Record<number, { cut: number; total: number; isValidated: boolean }> = {};
  for (let num = 1; num <= range; num++) {
    validationTrack[num] = { cut: 0, total: copies, isValidated: false };
    for (let c = 0; c < copies; c++) {
      rawDeck.push({ value: num, color: 'blue' });
    }
  }

  // Yellow Decimal Wires (e.g. 2.5, 5.5)
  yellowDecimals.forEach((dec) => {
    // 2 copies per yellow decimal
    rawDeck.push({ value: dec, color: 'yellow' });
    rawDeck.push({ value: dec, color: 'yellow' });
  });

  // Red Lethal Trap Wires
  for (let r = 0; r < redCount; r++) {
    rawDeck.push({ value: 'RED', color: 'red' });
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
  // Yellow decimals (e.g. 2.5) sit naturally between 2 and 3.
  // Red wires are placed at the far right (value 999).
  players.forEach((p) => {
    stands[p.id].sort((a, b) => {
      const valA = a.value === 'RED' ? 999 : (a.value as number);
      const valB = b.value === 'RED' ? 999 : (b.value as number);
      return valA - valB;
    });
  });

  // OFFICIAL SETUP RULE: Initial Info Token
  // At the start of the game, each player places 1 Info token in front of a blue wire to reveal it!
  players.forEach((p) => {
    const playerStand = stands[p.id];
    // Find the middle or first blue wire to place the starting Info Token
    const blueWire = playerStand.find((w) => w.color === 'blue' && !w.infoToken);
    if (blueWire) {
      blueWire.infoToken = blueWire.value;
      blueWire.clues.push(`Token: #${blueWire.value}`);
    }
  });

  // Total wires to cut (all non-red wires)
  const totalWiresToCut = (range * copies) + (yellowDecimals.length * 2);
  const turnOrder = players.map((p) => p.id);

  return {
    missionId: mission.id,
    missionName: mission.name,
    missionBriefing: mission.briefing,
    stands,
    detonatorLives: lives,
    maxDetonatorLives: lives,
    currentTurnPlayerId: turnOrder[0],
    turnOrder,
    totalWiresToCut,
    cutWiresCount: 0,
    phase: 'in_progress',
    endReason: null,
    validationTrack,
    equipment: {
      scannerAvailable: mission.equipment.scanner,
      stabilizerAvailable: mission.equipment.stabilizer,
    },
    history: [
      {
        id: 'start',
        text: `💣 Mission #${mission.id}: "${mission.name}" started! Defuse ${totalWiresToCut / 2} wire pairs. Detonator stability: ${lives} cells.`,
        time: Date.now(),
        type: 'info',
      },
      {
        id: 'info_tokens',
        text: `💡 SETUP: Starting Info Tokens placed! Each operative revealed 1 starting wire on their stand.`,
        time: Date.now() + 1,
        type: 'info',
      },
    ],
  };
}

export function handleBombBustersAction(
  state: BombBustersState,
  action: BombBustersAction,
  playerId: string,
  room: Room<BombBustersState, BombBustersSettings>
): { newState: BombBustersState; events?: string[]; error?: string } {
  const player = room.players.find((p) => p.id === playerId);
  const playerName = player?.name || 'Operative';

  if (state.phase !== 'in_progress') {
    return { newState: state, error: 'The mission has already concluded.' };
  }

  if (state.currentTurnPlayerId !== playerId && action.type !== 'USE_STABILIZER') {
    return { newState: state, error: 'It is not your turn to cut wires.' };
  }

  switch (action.type) {
    case 'CUT_WIRE': {
      const myStand = state.stands[playerId];
      const targetStand = state.stands[action.targetPlayerId];

      if (!myStand || !targetStand) {
        return { newState: state, error: 'Invalid operative stand.' };
      }
      if (action.targetPlayerId === playerId) {
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

      // Advance turn clockwise
      const currentTurnIndex = state.turnOrder.indexOf(playerId);
      const nextTurnPlayerId = state.turnOrder[(currentTurnIndex + 1) % state.turnOrder.length];

      // 1. Check if RED wire triggered
      if (targetWire.value === 'RED' || myWire.value === 'RED') {
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

      // 2. Matching values check
      if (myWire.value === targetWire.value) {
        // SUCCESSFUL DUO CUT!
        myWire.isCut = true;
        targetWire.isCut = true;
        const newCutCount = state.cutWiresCount + 2;

        // Update validation track
        const updatedValidation = { ...state.validationTrack };
        const valNum = Number(myWire.value);
        if (updatedValidation[valNum]) {
          const cutSoFar = updatedValidation[valNum].cut + 2;
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
            endReason: isDefused ? `🎉 BOMB DEFUSED! All circuits were disarmed cleanly without detonating!` : null,
            history: [
              ...state.history,
              {
                id: `${Date.now()}`,
                text: `✂️ DUO CUT SUCCESS! ${playerName} and ${targetName} matched wire #${myWire.value}! (${newCutCount}/${state.totalWiresToCut} wires cut)`,
                time: Date.now(),
                type: 'success',
              },
            ],
          },
        };
      } else {
        // WRONG GUESS!
        // OFFICIAL RULE: Detonator advances by 1, and the teammate places an INFO TOKEN showing the real value!
        const nextDetonator = state.detonatorLives - 1;
        targetWire.infoToken = targetWire.value;
        targetWire.clues.push(`Token: #${targetWire.value}`);
        targetWire.clues.push(`≠${myWire.value}`);

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
                text: `⚠️ MISS! ${playerName} guessed #${myWire.value}, but ${targetName}'s wire is #${targetWire.value}! Info Token placed. Stability: ${nextDetonator}.`,
                time: Date.now(),
                type: isExploded ? 'boom' : 'error',
              },
            ],
          },
        };
      }
    }

    case 'SOLO_CUT': {
      // Official Rule: Player cuts 2 matching wires in their own stand if they hold all remaining copies of that value
      const myStand = state.stands[playerId];
      if (!myStand) return { newState: state, error: 'Stand not found.' };

      const wire1 = myStand.find((w) => w.id === action.wireId1);
      const wire2 = myStand.find((w) => w.id === action.wireId2);

      if (!wire1 || !wire2 || wire1.id === wire2.id) {
        return { newState: state, error: 'Select two distinct uncut wires from your stand.' };
      }
      if (wire1.isCut || wire2.isCut) {
        return { newState: state, error: 'One or both of the selected wires are already cut.' };
      }
      if (wire1.value !== wire2.value) {
        return { newState: state, error: 'Solo Cut requires two wires of identical value!' };
      }
      if (wire1.value === 'RED' || wire2.value === 'RED') {
        return { newState: state, error: 'You cannot cut red wires!' };
      }

      // Check that no other player holds an uncut wire of this value
      let otherPlayerHasIt = false;
      Object.entries(state.stands).forEach(([pId, wires]) => {
        if (pId !== playerId) {
          if (wires.some((w) => !w.isCut && w.value === wire1.value)) {
            otherPlayerHasIt = true;
          }
        }
      });

      if (otherPlayerHasIt) {
        return {
          newState: state,
          error: `Solo Cut not allowed! A teammate still holds wire #${wire1.value}. Solo Cut is only legal when you hold all remaining copies!`,
        };
      }

      // Perform the Solo Cut
      wire1.isCut = true;
      wire2.isCut = true;
      const newCutCount = state.cutWiresCount + 2;

      // Update validation track
      const updatedValidation = { ...state.validationTrack };
      const valNum = Number(wire1.value);
      if (updatedValidation[valNum]) {
        const cutSoFar = updatedValidation[valNum].cut + 2;
        updatedValidation[valNum] = {
          ...updatedValidation[valNum],
          cut: cutSoFar,
          isValidated: cutSoFar >= updatedValidation[valNum].total,
        };
      }

      const currentTurnIndex = state.turnOrder.indexOf(playerId);
      const nextTurnPlayerId = state.turnOrder[(currentTurnIndex + 1) % state.turnOrder.length];
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
              text: `🎯 SOLO CUT! ${playerName} held the final pair of #${wire1.value} and cut both independently! (${newCutCount}/${state.totalWiresToCut} wires cut)`,
              time: Date.now(),
              type: 'success',
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
      // Official Rule: A wire value is visible if:
      // 1. The game is over
      // 2. The player is the owner of the stand
      // 3. The wire is cut
      // 4. An INFO TOKEN has been placed on it (starting token or miss token!)
      const hasInfoToken = wire.infoToken !== null;
      const canSeeValue = isGameOver || isOwner || wire.isCut || hasInfoToken;

      return {
        id: wire.id,
        value: canSeeValue ? wire.value : null,
        color: wire.color,
        isCut: wire.isCut,
        infoToken: wire.infoToken, // Info token is public to all players!
        clues: wire.clues,
      };
    });
  });

  return {
    missionId: state.missionId,
    missionName: state.missionName,
    missionBriefing: state.missionBriefing,
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
    equipment: state.equipment,
    history: state.history,
    allRevealed: isGameOver,
  };
}
