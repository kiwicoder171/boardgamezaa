import { GameDefinition } from '@/types/game';
import { handleBombBustersAction, initBombBustersGame, sanitizeBombBustersState, getBombBustersBotAction } from './logic';
import { BombBustersAction, BombBustersSettings, BombBustersState } from './types';
import { BOMB_BUSTERS_MISSIONS } from './missions';

export const bombBustersGameDefinition: GameDefinition<
  BombBustersState,
  BombBustersAction,
  BombBustersSettings
> = {
  id: 'bomb-busters',
  name: 'Bomb Busters',
  description: 'Cooperative wire-cutting puzzle game! Deduce teammates’ hidden wires and defuse the bomb together before it detonates!',
  minPlayers: 2,
  maxPlayers: 5,
  recommendedPlayers: '2 - 4',
  tags: ['Cooperative', 'Deduction', 'Numbers', 'Puzzle', 'Tension'],
  durationMinutes: '15 min',
  icon: '💣',
  coverGradient: 'from-amber-600 via-rose-700 to-slate-900',
  rules: {
    summary: 'You and your teammates are a bomb disposal squad based on Hisashi Hayashi\'s 2024 tabletop game. Each operative holds secret numbered wire tiles arranged strictly in ascending order on their rack. Work together to identify and cut matching wire pairs before the detonator runs out of stability!',
    sections: [
      {
        title: 'Standing Wire Rack & Ascending Order',
        content: 'Your wires are arranged in strictly ASCENDING order from left to right. This is your primary deduction engine! Yellow decimal wires (e.g. 2.5) sit between whole numbers. Lethal Red Wires always sit at the far right of the stand.',
      },
      {
        title: 'Starting Info Tokens (Official Setup Rule)',
        content: 'At the start of the mission, every operative reveals 1 blue wire on their stand with a public Info Token. Everyone can see these starting numbers!',
      },
      {
        title: 'Duo Cut (Standard Action)',
        content: 'Pick a wire from your own rack, point to a slot on a teammate’s rack, and guess that it has the same value. If it MATCHES, BOTH wires are cut! If it DOES NOT MATCH, the detonator dial advances by 1, and your teammate places an Info Token in front of that wire showing its REAL number for the whole team!',
      },
      {
        title: 'Solo Cut (Independent Pair)',
        content: 'If you hold all remaining wires of a specific number in your hand (e.g. you hold the final pair of 5s), you can perform a Solo Cut on your turn to cut both wires in your stand without needing a teammate!',
      },
      {
        title: 'Lethal Red Wires',
        content: 'BEWARE! If you cut a Red Wire, the bomb EXPLODES IMMEDIATELY, causing instant mission failure.',
      },
      {
        title: '66-Mission Campaign Book',
        content: 'Progress through all 66 missions across 6 Surprise Boxes, introducing Yellow Decimals, quad-wire circuits, and multi-red booby traps!',
      },
    ],
  },
  defaultSettings: {
    missionId: 1,
    difficulty: 'trainee',
    numberRange: 8,
    detonatorLives: 4,
    includeRedWire: false,
  },
  settingsSchema: [
    {
      key: 'missionId',
      label: 'Campaign Mission (Missions 1 to 66)',
      description: 'Select any scenario from the official 66-mission campaign book!',
      type: 'select',
      options: BOMB_BUSTERS_MISSIONS.map((m) => ({
        label: `M#${m.id}: ${m.name} (${m.boxName} • 1-${m.numberRange} ${m.redWiresCount > 0 ? `• ${m.redWiresCount} RED` : ''})`,
        value: m.id,
      })),
      default: 1,
    },
    {
      key: 'detonatorLives',
      label: 'Detonator Stability (Allowed Strikes)',
      description: 'Default is Players - 1 (e.g. 3 strikes for 4 players). 0 stability = boom!',
      type: 'select',
      options: [
        { label: 'Official Rule: Players - 1 strikes', value: 0 },
        { label: '1 Strike (Hardcore)', value: 1 },
        { label: '2 Strikes', value: 2 },
        { label: '3 Strikes', value: 3 },
        { label: '4 Strikes', value: 4 },
        { label: '5 Strikes (Forgiving)', value: 5 },
      ],
      default: 0,
    },
  ],
  initGame: initBombBustersGame,
  handleAction: handleBombBustersAction,
  sanitizeState: sanitizeBombBustersState,
  getBotAction: getBombBustersBotAction,
  checkGameOver: (state) => {
    if (state.phase === 'victory') {
      return {
        isOver: true,
        winner: 'OPERATIVES',
        summary: `🎉 SQUAD VICTORY! Mission #${state.missionId} "${state.missionName}" defused successfully!`,
      };
    }
    if (state.phase === 'exploded') {
      return {
        isOver: true,
        winner: 'BOMB',
        summary: `💥 MISSION FAILED: The bomb detonated on Mission #${state.missionId}!`,
      };
    }
    return null;
  },
};
