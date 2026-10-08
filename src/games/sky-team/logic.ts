import { SkyTeamState, SkyTeamAction, SkyTeamDie, AirportScenario } from './types';
import { SKY_TEAM_SCENARIOS } from './scenarios';

function rollDie(color: 'blue' | 'orange', id: string): SkyTeamDie {
  return {
    id,
    value: Math.floor(Math.random() * 6) + 1,
    color,
    placed: false,
  };
}

export function initSkyTeamGame(
  players: Array<{ id: string; name: string }>,
  settings?: Record<string, unknown>
): SkyTeamState {
  const airportId = (settings?.airportId as string) || 'yul-montreal';
  const scenario: AirportScenario =
    SKY_TEAM_SCENARIOS.find((s) => s.id === airportId) || SKY_TEAM_SCENARIOS[0];

  const pilotPlayerId = players[0]?.id || 'pilot';
  const copilotPlayerId = players[1]?.id || players[0]?.id || 'copilot';

  const approachTrack = Array.from({ length: scenario.approachTrackLength }, (_, i) => ({
    index: i,
    airplanes: scenario.trafficLayout[i] || 0,
    isRunway: i === scenario.runwayIndex,
    hasFog: scenario.activeModules.lowVisibility && i > 3,
  }));

  const pilotDice = [
    rollDie('blue', 'p1'),
    rollDie('blue', 'p2'),
    rollDie('blue', 'p3'),
    rollDie('blue', 'p4'),
  ];
  const copilotDice = [
    rollDie('orange', 'c1'),
    rollDie('orange', 'c2'),
    rollDie('orange', 'c3'),
    rollDie('orange', 'c4'),
  ];

  return {
    airportId: scenario.id,
    airportName: scenario.name,
    airportCode: scenario.code,
    briefing: scenario.briefing,
    difficulty: scenario.difficulty,

    round: 1,
    altitude: 6000,
    maxRounds: 7,

    currentTurnPlayerId: pilotPlayerId,
    pilotPlayerId,
    copilotPlayerId,

    pilotDice,
    copilotDice,

    tilt: 0,
    maxTiltAllowed: 3,

    blueAeroMarker: 8,
    orangeAeroMarker: 8,
    currentEngineSum: null,
    currentRoundSpeed: null,

    landingGear: [false, false, false],
    flaps: [false, false, false, false],
    brakesLevel: 0,

    coffeeTokens: 1,
    rerollTokens: 1,

    approachTrack,
    currentApproachIndex: 0,

    modules: {
      kerosene: scenario.activeModules.kerosene
        ? {
            current: scenario.startingFuel || 6,
            max: 6,
            burnRatePerRound: 1,
          }
        : undefined,
      wind: scenario.activeModules.wind
        ? {
            headwind: scenario.windValue || 0,
            crosswind: scenario.crosswind || 0,
          }
        : undefined,
      iceBrakes: scenario.activeModules.iceBrakes
        ? {
            slippery: true,
            extraBrakeRequired: 2,
          }
        : undefined,
      intern: scenario.activeModules.intern
        ? {
            available: true,
            trained: false,
          }
        : undefined,
      alarms: scenario.activeModules.alarms
        ? {
            activeAlarms: ['ENGINE_TEMP_HIGH'],
            alarmDeckCount: 4,
          }
        : undefined,
      heavyTurbulence: scenario.activeModules.heavyTurbulence
        ? {
            severity: 1,
          }
        : undefined,
      lowVisibility: scenario.activeModules.lowVisibility
        ? {
            visibleRange: 3,
          }
        : undefined,
    },

    slots: {
      axisPilot: null,
      axisCopilot: null,
      enginesPilot: null,
      enginesCopilot: null,
      radioPilot: null,
      radioCopilot1: null,
      radioCopilot2: null,
      gear1: null,
      gear2: null,
      gear3: null,
      flaps1: null,
      flaps2: null,
      flaps3: null,
      flaps4: null,
      brakes1: null,
      brakes2: null,
      brakes3: null,
      coffee1: null,
      coffee2: null,
      coffee3: null,
    },

    status: 'playing',
    crashReason: null,
    history: [
      {
        id: 'init-1',
        text: `✈️ Cockpit energized! Descent clearance granted for ${scenario.name} (${scenario.code}).`,
        type: 'info',
        timestamp: Date.now(),
      },
      {
        id: 'init-2',
        text: `Altitude 6,000 ft. Radio silence initiated. Place dice alternately!`,
        type: 'info',
        timestamp: Date.now(),
      },
    ],
  };
}

export function handleSkyTeamAction(
  state: SkyTeamState,
  action: SkyTeamAction
): SkyTeamState {
  if (action.type === 'RESTART_GAME') {
    return initSkyTeamGame(
      [
        { id: state.pilotPlayerId, name: 'Pilot' },
        { id: state.copilotPlayerId, name: 'Co-Pilot' },
      ],
      { airportId: state.airportId }
    );
  }

  if (state.status !== 'playing') {
    return state;
  }

  const s = JSON.parse(JSON.stringify(state)) as SkyTeamState;

  // 1. USE COFFEE
  if (action.type === 'USE_COFFEE') {
    if (s.coffeeTokens <= 0) return s;
    const isPilot = action.playerId === s.pilotPlayerId;
    const pool = isPilot ? s.pilotDice : s.copilotDice;
    const die = pool.find((d) => d.id === action.dieId && !d.placed);
    if (!die) return s;

    const newVal = die.value + action.delta;
    if (newVal < 1 || newVal > 6) return s;

    die.value = newVal;
    s.coffeeTokens -= 1;
    s.history.push({
      id: `coffee-${Date.now()}`,
      text: `☕ ${isPilot ? 'Pilot' : 'Co-Pilot'} used a Coffee Token! Die #${die.id} modified ${
        action.delta > 0 ? '+1' : '-1'
      } to [${newVal}].`,
      type: 'info',
      timestamp: Date.now(),
    });
    return s;
  }

  // 2. USE REROLL
  if (action.type === 'USE_REROLL') {
    if (s.rerollTokens <= 0) return s;
    const isPilot = action.playerId === s.pilotPlayerId;
    const pool = isPilot ? s.pilotDice : s.copilotDice;

    action.dieIds.forEach((id) => {
      const d = pool.find((die) => die.id === id && !die.placed);
      if (d) {
        d.value = Math.floor(Math.random() * 6) + 1;
      }
    });

    s.rerollTokens -= 1;
    s.history.push({
      id: `reroll-${Date.now()}`,
      text: `🎲 ${isPilot ? 'Pilot' : 'Co-Pilot'} expended a Reroll Token on ${
        action.dieIds.length
      } unplaced dice.`,
      type: 'info',
      timestamp: Date.now(),
    });
    return s;
  }

  // 3. CLEAR ALARM
  if (action.type === 'CLEAR_ALARM') {
    if (s.modules.alarms && s.modules.alarms.activeAlarms.includes(action.alarmId)) {
      s.modules.alarms.activeAlarms = s.modules.alarms.activeAlarms.filter(
        (a) => a !== action.alarmId
      );
      s.history.push({
        id: `alarm-${Date.now()}`,
        text: `🚨 Master Caution Alarm [${action.alarmId}] acknowledged and cleared!`,
        type: 'success',
        timestamp: Date.now(),
      });
    }
    return s;
  }

  // 4. PLACE DIE
  if (action.type === 'PLACE_DIE') {
    const isPilot = action.playerId === s.pilotPlayerId;
    const pool = isPilot ? s.pilotDice : s.copilotDice;
    const die = pool.find((d) => d.id === action.dieId && !d.placed);
    if (!die) return s;

    const { slotId } = action;

    // Check Slot Eligibility & Constraints
    const errorMsg = validateSlotPlacement(s, isPilot, die, slotId);
    if (errorMsg) {
      s.history.push({
        id: `err-${Date.now()}`,
        text: `⚠️ Cannot place die on [${slotId}]: ${errorMsg}`,
        type: 'warning',
        timestamp: Date.now(),
      });
      return s;
    }

    // Place die in slot
    die.placed = true;
    die.slotId = slotId;
    (s.slots as Record<string, SkyTeamDie | null>)[slotId] = die;

    // Execute Immediate Slot Effect
    applyImmediateSlotEffect(s, isPilot, die, slotId);

    // Switch turn
    s.currentTurnPlayerId =
      s.currentTurnPlayerId === s.pilotPlayerId ? s.copilotPlayerId : s.pilotPlayerId;

    // Check if round is complete (all 8 dice placed)
    const allPilotPlaced = s.pilotDice.every((d) => d.placed);
    const allCopilotPlaced = s.copilotDice.every((d) => d.placed);

    if (allPilotPlaced && allCopilotPlaced) {
      resolveRoundEnd(s);
    }

    return s;
  }

  return s;
}

function validateSlotPlacement(
  s: SkyTeamState,
  isPilot: boolean,
  die: SkyTeamDie,
  slotId: string
): string | null {
  const currentSlot = (s.slots as Record<string, SkyTeamDie | null>)[slotId];
  if (currentSlot !== null && currentSlot !== undefined) {
    return 'Slot is already occupied this round!';
  }

  switch (slotId) {
    // Mandatory Axis
    case 'axisPilot':
      if (!isPilot) return 'Axis Pilot slot is reserved for Pilot only!';
      return null;
    case 'axisCopilot':
      if (isPilot) return 'Axis Co-pilot slot is reserved for Co-pilot only!';
      return null;

    // Mandatory Engines
    case 'enginesPilot':
      if (!isPilot) return 'Engines Pilot slot is reserved for Pilot only!';
      return null;
    case 'enginesCopilot':
      if (isPilot) return 'Engines Co-pilot slot is reserved for Co-pilot only!';
      return null;

    // Radio
    case 'radioPilot':
      if (!isPilot) return 'Radio Pilot slot is reserved for Pilot only!';
      return null;
    case 'radioCopilot1':
    case 'radioCopilot2':
      if (isPilot) return 'Radio Co-pilot slots are reserved for Co-pilot only!';
      return null;

    // Landing Gear (Pilot Only, Must be deployed sequentially)
    case 'gear1':
      if (!isPilot) return 'Landing Gear is pilot responsibility!';
      if (s.landingGear[0]) return 'Gear 1 is already deployed!';
      if (die.value !== 1 && die.value !== 2) return 'Gear 1 requires a die value of 1 or 2!';
      return null;
    case 'gear2':
      if (!isPilot) return 'Landing Gear is pilot responsibility!';
      if (!s.landingGear[0]) return 'Must deploy Gear 1 before Gear 2!';
      if (s.landingGear[1]) return 'Gear 2 is already deployed!';
      if (die.value !== 3 && die.value !== 4) return 'Gear 2 requires a die value of 3 or 4!';
      return null;
    case 'gear3':
      if (!isPilot) return 'Landing Gear is pilot responsibility!';
      if (!s.landingGear[1]) return 'Must deploy Gear 2 before Gear 3!';
      if (s.landingGear[2]) return 'Gear 3 is already deployed!';
      if (die.value !== 5 && die.value !== 6) return 'Gear 3 requires a die value of 5 or 6!';
      return null;

    // Flaps (Co-Pilot Only, Must be deployed sequentially)
    case 'flaps1':
      if (isPilot) return 'Wing Flaps are co-pilot responsibility!';
      if (s.flaps[0]) return 'Flap 1 is already deployed!';
      if (die.value !== 1 && die.value !== 2) return 'Flap 1 requires a die value of 1 or 2!';
      return null;
    case 'flaps2':
      if (isPilot) return 'Wing Flaps are co-pilot responsibility!';
      if (!s.flaps[0]) return 'Must deploy Flap 1 before Flap 2!';
      if (s.flaps[1]) return 'Flap 2 is already deployed!';
      if (die.value !== 2 && die.value !== 3) return 'Flap 2 requires a die value of 2 or 3!';
      return null;
    case 'flaps3':
      if (isPilot) return 'Wing Flaps are co-pilot responsibility!';
      if (!s.flaps[1]) return 'Must deploy Flap 2 before Flap 3!';
      if (s.flaps[2]) return 'Flap 3 is already deployed!';
      if (die.value !== 4 && die.value !== 5) return 'Flap 3 requires a die value of 4 or 5!';
      return null;
    case 'flaps4':
      if (isPilot) return 'Wing Flaps are co-pilot responsibility!';
      if (!s.flaps[2]) return 'Must deploy Flap 3 before Flap 4!';
      if (s.flaps[3]) return 'Flap 4 is already deployed!';
      if (die.value !== 5 && die.value !== 6) return 'Flap 4 requires a die value of 5 or 6!';
      return null;

    // Brakes (Pilot Only, Must be activated sequentially)
    case 'brakes1':
      if (!isPilot) return 'Brakes are pilot responsibility!';
      if (s.brakesLevel >= 2) return 'Brake Level 2 is already active!';
      if (die.value !== 2) return 'Brake 1 requires a die value of 2!';
      return null;
    case 'brakes2':
      if (!isPilot) return 'Brakes are pilot responsibility!';
      if (s.brakesLevel < 2) return 'Must activate Brake Level 2 first!';
      if (s.brakesLevel >= 4) return 'Brake Level 4 is already active!';
      if (die.value !== 4) return 'Brake 2 requires a die value of 4!';
      return null;
    case 'brakes3':
      if (!isPilot) return 'Brakes are pilot responsibility!';
      if (s.brakesLevel < 4) return 'Must activate Brake Level 4 first!';
      if (s.brakesLevel >= 6) return 'Brake Level 6 is already active!';
      if (die.value !== 6) return 'Brake 3 requires a die value of 6!';
      return null;

    // Coffee
    case 'coffee1':
    case 'coffee2':
    case 'coffee3':
      return null;

    default:
      return 'Unknown cockpit slot!';
  }
}

function applyImmediateSlotEffect(
  s: SkyTeamState,
  isPilot: boolean,
  die: SkyTeamDie,
  slotId: string
) {
  // RADIO: Removes 1 plane at distance = die.value
  if (slotId === 'radioPilot' || slotId === 'radioCopilot1' || slotId === 'radioCopilot2') {
    const targetSpaceIndex = s.currentApproachIndex + die.value;
    const space = s.approachTrack[targetSpaceIndex];
    if (space && space.airplanes > 0) {
      space.airplanes -= 1;
      s.history.push({
        id: `radio-${Date.now()}`,
        text: `📡 Tower Radio: Diverted 1 traffic aircraft at Space #${targetSpaceIndex + 1}!`,
        type: 'radio',
        timestamp: Date.now(),
      });
    } else {
      s.history.push({
        id: `radio-${Date.now()}`,
        text: `📡 Tower Radio: Sector Space #${targetSpaceIndex + 1} was already clear.`,
        type: 'info',
        timestamp: Date.now(),
      });
    }
  }

  // GEAR
  if (slotId === 'gear1') {
    s.landingGear[0] = true;
    s.blueAeroMarker += 1;
    s.history.push({
      id: `gear1-${Date.now()}`,
      text: `⚙️ Landing Gear 1/3 deployed! Aerodynamic drag increased (Min Speed: ${s.blueAeroMarker}).`,
      type: 'success',
      timestamp: Date.now(),
    });
  }
  if (slotId === 'gear2') {
    s.landingGear[1] = true;
    s.blueAeroMarker += 1;
    s.history.push({
      id: `gear2-${Date.now()}`,
      text: `⚙️ Landing Gear 2/3 deployed! Aerodynamic drag increased (Min Speed: ${s.blueAeroMarker}).`,
      type: 'success',
      timestamp: Date.now(),
    });
  }
  if (slotId === 'gear3') {
    s.landingGear[2] = true;
    s.blueAeroMarker += 1;
    s.history.push({
      id: `gear3-${Date.now()}`,
      text: `⚙️ Landing Gear 3/3 FULLY DEPLOYED! All wheels locked in green!`,
      type: 'success',
      timestamp: Date.now(),
    });
  }

  // FLAPS
  if (slotId === 'flaps1') {
    s.flaps[0] = true;
    s.orangeAeroMarker += 1;
    s.history.push({
      id: `flaps1-${Date.now()}`,
      text: `🪶 Flaps 1/4 deployed! Lift profile adjusted (Max Speed: ${s.orangeAeroMarker}).`,
      type: 'success',
      timestamp: Date.now(),
    });
  }
  if (slotId === 'flaps2') {
    s.flaps[1] = true;
    s.orangeAeroMarker += 1;
    s.history.push({
      id: `flaps2-${Date.now()}`,
      text: `🪶 Flaps 2/4 deployed! (Max Speed: ${s.orangeAeroMarker}).`,
      type: 'success',
      timestamp: Date.now(),
    });
  }
  if (slotId === 'flaps3') {
    s.flaps[2] = true;
    s.orangeAeroMarker += 1;
    s.history.push({
      id: `flaps3-${Date.now()}`,
      text: `🪶 Flaps 3/4 deployed! (Max Speed: ${s.orangeAeroMarker}).`,
      type: 'success',
      timestamp: Date.now(),
    });
  }
  if (slotId === 'flaps4') {
    s.flaps[3] = true;
    s.orangeAeroMarker += 1;
    s.history.push({
      id: `flaps4-${Date.now()}`,
      text: `🪶 Flaps 4/4 FULLY EXTENDED! Full approach lift configured!`,
      type: 'success',
      timestamp: Date.now(),
    });
  }

  // BRAKES
  if (slotId === 'brakes1') {
    s.brakesLevel = 2;
    s.history.push({
      id: `brake1-${Date.now()}`,
      text: `🛑 Brake Level 1 engaged (Brake capacity: 2).`,
      type: 'info',
      timestamp: Date.now(),
    });
  }
  if (slotId === 'brakes2') {
    s.brakesLevel = 4;
    s.history.push({
      id: `brake2-${Date.now()}`,
      text: `🛑 Brake Level 2 engaged (Brake capacity: 4).`,
      type: 'info',
      timestamp: Date.now(),
    });
  }
  if (slotId === 'brakes3') {
    s.brakesLevel = 6;
    s.history.push({
      id: `brake3-${Date.now()}`,
      text: `🛑 Brake Level 3 MAX ENGAGED! Full hydraulic runway stopping power ready (Capacity: 6).`,
      type: 'success',
      timestamp: Date.now(),
    });
  }

  // COFFEE
  if (slotId === 'coffee1' || slotId === 'coffee2' || slotId === 'coffee3') {
    if (s.coffeeTokens < 3) {
      s.coffeeTokens += 1;
      s.history.push({
        id: `brew-${Date.now()}`,
        text: `☕ Fresh espresso brewed! +1 Coffee Token added to tray (${s.coffeeTokens}/3).`,
        type: 'info',
        timestamp: Date.now(),
      });
    }
  }
}

function resolveRoundEnd(s: SkyTeamState) {
  // Check Mandatory Slots
  if (!s.slots.axisPilot || !s.slots.axisCopilot) {
    s.status = 'crashed';
    s.crashReason = 'CRASH! Failed to allocate dice to Artificial Horizon (Axis)!';
    s.history.push({ id: `c-${Date.now()}`, text: s.crashReason, type: 'crash', timestamp: Date.now() });
    return;
  }

  if (!s.slots.enginesPilot || !s.slots.enginesCopilot) {
    s.status = 'crashed';
    s.crashReason = 'CRASH! Failed to allocate dice to Aircraft Engines!';
    s.history.push({ id: `c-${Date.now()}`, text: s.crashReason, type: 'crash', timestamp: Date.now() });
    return;
  }

  // 1. RESOLVE AXIS (TILT)
  const axisDiff = s.slots.axisPilot.value - s.slots.axisCopilot.value;
  const crosswind = s.modules.wind?.crosswind || 0;
  s.tilt += axisDiff + crosswind;

  s.history.push({
    id: `axis-res-${Date.now()}`,
    text: `📐 Axis Horizon: Pilot (${s.slots.axisPilot.value}) - Co-Pilot (${
      s.slots.axisCopilot.value
    }) = ${axisDiff >= 0 ? '+' : ''}${axisDiff}. Current tilt: ${s.tilt > 0 ? '+' : ''}${s.tilt}°.`,
    type: 'info',
    timestamp: Date.now(),
  });

  if (Math.abs(s.tilt) > s.maxTiltAllowed) {
    s.status = 'crashed';
    s.crashReason = `CRASH! The aircraft exceeded maximum stall bank angle (tilt ${s.tilt}°) and entered a spin!`;
    s.history.push({ id: `c-${Date.now()}`, text: s.crashReason, type: 'crash', timestamp: Date.now() });
    return;
  }

  // 2. RESOLVE ENGINES & SPEED
  const engineSum = s.slots.enginesPilot.value + s.slots.enginesCopilot.value;
  const headwind = s.modules.wind?.headwind || 0;
  const effectiveSum = engineSum - headwind;
  s.currentEngineSum = effectiveSum;

  let speed = 0;
  if (effectiveSum < s.blueAeroMarker) {
    speed = 0;
  } else if (effectiveSum <= s.orangeAeroMarker) {
    speed = 1;
  } else {
    speed = 2;
  }
  s.currentRoundSpeed = speed;

  s.history.push({
    id: `eng-res-${Date.now()}`,
    text: `⚡ Engines: Sum [${effectiveSum}] vs Markers (Min: ${s.blueAeroMarker}, Max: ${
      s.orangeAeroMarker
    }) ➔ Speed: ${speed} space(s).`,
    type: 'info',
    timestamp: Date.now(),
  });

  // Advance on Approach Track
  s.currentApproachIndex += speed;
  const targetSpace = s.approachTrack[s.currentApproachIndex];

  if (!targetSpace) {
    s.status = 'crashed';
    s.crashReason = 'CRASH! Overshot the approach sector and exceeded runway coordinates!';
    s.history.push({ id: `c-${Date.now()}`, text: s.crashReason, type: 'crash', timestamp: Date.now() });
    return;
  }

  // Check Mid-Air Collision with Air Traffic
  if (targetSpace.airplanes > 0) {
    s.status = 'crashed';
    s.crashReason = `CRASH! Mid-air collision with ${targetSpace.airplanes} aircraft in Sector #${
      s.currentApproachIndex + 1
    }!`;
    s.history.push({ id: `c-${Date.now()}`, text: s.crashReason, type: 'crash', timestamp: Date.now() });
    return;
  }

  // 3. FUEL MODULE CHECK
  if (s.modules.kerosene) {
    s.modules.kerosene.current -= s.modules.kerosene.burnRatePerRound;
    if (s.modules.kerosene.current < 0) {
      s.status = 'crashed';
      s.crashReason = 'CRASH! Kerosene exhaustion — flameout on both turbofans!';
      s.history.push({ id: `c-${Date.now()}`, text: s.crashReason, type: 'crash', timestamp: Date.now() });
      return;
    }
  }

  // 4. ALTITUDE DROP
  s.altitude -= 1000;
  s.round += 1;

  // 5. TOUCHDOWN VERIFICATION (Altitude 0 / Round 7 end)
  if (s.altitude <= 0) {
    const isRunway = targetSpace.isRunway;
    const isLevel = s.tilt === 0;
    const allGear = s.landingGear.every(Boolean);
    const allFlaps = s.flaps.every(Boolean);
    const requiredBrake = s.modules.iceBrakes?.slippery ? s.brakesLevel - 2 : s.brakesLevel;
    const brakesHold = requiredBrake > (s.currentRoundSpeed || 0);

    if (isRunway && isLevel && allGear && allFlaps && brakesHold && targetSpace.airplanes === 0) {
      s.status = 'won';
      s.history.push({
        id: `win-${Date.now()}`,
        text: `🎉 TOUCHDOWN REVERSERS DEPLOYED! Perfect landing at ${s.airportName} (${s.airportCode})! Mission accomplished!`,
        type: 'success',
        timestamp: Date.now(),
      });
      return;
    } else {
      const failures: string[] = [];
      if (!isRunway) failures.push(`Touched down short/long of runway (Space #${s.currentApproachIndex + 1})`);
      if (!isLevel) failures.push(`Wing struck ground (tilt was ${s.tilt}°)`);
      if (!allGear) failures.push('Belly landing: Landing Gear not fully deployed');
      if (!allFlaps) failures.push('Aerodynamic stall: Flaps not fully extended');
      if (!brakesHold) failures.push('Runway excursion: Insufficient brake pressure for landing speed');

      s.status = 'crashed';
      s.crashReason = `CRASH ON TOUCHDOWN! ${failures.join(' • ')}`;
      s.history.push({ id: `c-${Date.now()}`, text: s.crashReason, type: 'crash', timestamp: Date.now() });
      return;
    }
  }

  // Setup Next Round
  // Reset round slots (keep landing gear, flaps, brakes switches permanently active)
  s.slots.axisPilot = null;
  s.slots.axisCopilot = null;
  s.slots.enginesPilot = null;
  s.slots.enginesCopilot = null;
  s.slots.radioPilot = null;
  s.slots.radioCopilot1 = null;
  s.slots.radioCopilot2 = null;
  s.slots.coffee1 = null;
  s.slots.coffee2 = null;
  s.slots.coffee3 = null;

  // Roll fresh dice for both crew members
  s.pilotDice = [
    rollDie('blue', `p${s.round}-1`),
    rollDie('blue', `p${s.round}-2`),
    rollDie('blue', `p${s.round}-3`),
    rollDie('blue', `p${s.round}-4`),
  ];
  s.copilotDice = [
    rollDie('orange', `c${s.round}-1`),
    rollDie('orange', `c${s.round}-2`),
    rollDie('orange', `c${s.round}-3`),
    rollDie('orange', `c${s.round}-4`),
  ];

  // Rotate starting player each round
  s.currentTurnPlayerId = s.round % 2 === 1 ? s.pilotPlayerId : s.copilotPlayerId;

  s.history.push({
    id: `round-${Date.now()}`,
    text: `🛬 Altitude descending to ${s.altitude.toLocaleString()} ft (Round ${s.round}/7). New dice rolled behind flight screens!`,
    type: 'info',
    timestamp: Date.now(),
  });
}

export function sanitizeSkyTeamState(
  state: SkyTeamState,
  viewingPlayerId: string
): SkyTeamState {
  const sanitized = JSON.parse(JSON.stringify(state)) as SkyTeamState;

  // Anti-cheat sanitization: Players only see their own unplaced rolled dice!
  // Pilot cannot see Co-pilot's unplaced dice, and Co-pilot cannot see Pilot's unplaced dice.
  if (viewingPlayerId === sanitized.pilotPlayerId) {
    sanitized.copilotDice = sanitized.copilotDice.map((d) =>
      d.placed ? d : { ...d, value: 0 }
    );
  } else if (viewingPlayerId === sanitized.copilotPlayerId) {
    sanitized.pilotDice = sanitized.pilotDice.map((d) =>
      d.placed ? d : { ...d, value: 0 }
    );
  } else {
    // Spectator
    sanitized.pilotDice = sanitized.pilotDice.map((d) =>
      d.placed ? d : { ...d, value: 0 }
    );
    sanitized.copilotDice = sanitized.copilotDice.map((d) =>
      d.placed ? d : { ...d, value: 0 }
    );
  }

  return sanitized;
}
