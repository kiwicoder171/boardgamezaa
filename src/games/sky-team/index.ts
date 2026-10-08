import { GameDefinition, Player, Room } from '@/types/game';
import { SkyTeamState, SkyTeamAction } from './types';
import { initSkyTeamGame, handleSkyTeamAction, sanitizeSkyTeamState } from './logic';
import { SKY_TEAM_SCENARIOS } from './scenarios';

export interface SkyTeamSettings {
  airportId: string;
}

export const skyTeamGameDefinition: GameDefinition<
  SkyTeamState,
  SkyTeamAction,
  SkyTeamSettings
> = {
  id: 'sky-team',
  name: 'Sky Team',
  description:
    'Cooperative Cockpit Dice Placement (Spiel des Jahres 2024). Silently coordinate with your partner to land an airliner at airports worldwide!',
  minPlayers: 2,
  maxPlayers: 2,
  recommendedPlayers: '2 (Co-op Duo)',
  tags: ['Cooperative', 'Dice Placement', 'Aviation', 'Limited Communication', 'Spiel des Jahres'],
  durationMinutes: '20 min',
  icon: '✈️',
  coverGradient: 'from-sky-700 via-blue-900 to-slate-950',
  rules: {
    summary:
      'In Sky Team, you and your co-pilot take control of a commercial airliner on its final approach. Each round, you roll dice behind your private screens and must place them on the shared cockpit panel in total silence without communicating numbers!',
    sections: [
      {
        title: 'Radio Silence & Dice Rolls',
        content:
          'Before rolling, you may discuss high-level strategy. Once the 4 dice are rolled behind your screens, COMPLETE SILENCE is mandatory! You take turns placing 1 die at a time on the cockpit.',
      },
      {
        title: 'Mandatory Systems (Axis & Engines)',
        content:
          'Every round, both players MUST place 1 die on the Artificial Horizon (Axis) and 1 die on the Engines (Throttle). The difference on Axis tilts the plane. The sum on Engines determines if you fly 0, 1, or 2 spaces.',
      },
      {
        title: 'Landing Gear & Flaps Checklist',
        content:
          'Pilot deploys the 3 landing gear switches [1-2, 3-4, 5-6]. Co-Pilot deploys the 4 flap switches [1-2, 2-3, 4-5, 5-6]. All must be green before touchdown!',
      },
      {
        title: 'Tower Radio & Air Traffic',
        content:
          'Place dice on Radio to clear airplane tokens from the approach corridor before your plane moves into those spaces, avoiding mid-air collisions!',
      },
      {
        title: 'Touchdown Criteria (Altitude 0)',
        content:
          'To win: Plane must reach the exact runway space with zero air traffic, landing gear and flaps all green, tilt perfectly level (0°), and engine speed lower than deployed brakes!',
      },
    ],
  },
  defaultSettings: {
    airportId: 'yul-montreal',
  },
  settingsSchema: [
    {
      key: 'airportId',
      label: 'Destination Airport & Scenario',
      type: 'select',
      description: 'Choose which airport approach and module pack to fly!',
      default: 'yul-montreal',
      options: SKY_TEAM_SCENARIOS.map((s) => ({
        label: `${s.flag} ${s.code} - ${s.name} (${s.difficulty})`,
        value: s.id,
      })),
    },
  ],

  initGame: (players: Player[], settings: SkyTeamSettings) =>
    initSkyTeamGame(players, settings as unknown as Record<string, unknown>),

  handleAction: (
    state: SkyTeamState,
    action: SkyTeamAction,
    playerId: string,
    _room: Room<SkyTeamState, SkyTeamSettings>
  ) => {
    const newState = handleSkyTeamAction(state, action);
    return { newState };
  },

  sanitizeState: (state: SkyTeamState, playerId: string) =>
    sanitizeSkyTeamState(state, playerId),

  checkGameOver: (state: SkyTeamState) => {
    if (state.status === 'won') {
      return {
        isOver: true,
        winner: 'Flight Crew',
        summary: `TOUCHDOWN SUCCESSFUL! Safely landed at ${state.airportName} (${state.airportCode})!`,
      };
    }
    if (state.status === 'crashed') {
      return {
        isOver: true,
        summary: state.crashReason || 'Aircraft Crashed!',
      };
    }
    return null;
  },
};
