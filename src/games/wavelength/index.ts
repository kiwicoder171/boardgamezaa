import { GameDefinition, Player, Room } from '@/types/game';
import {
  WavelengthAction,
  WavelengthSettings,
  WavelengthState,
} from './types';
import {
  initWavelengthState,
  wavelengthReducer,
  sanitizeWavelengthState,
  getWavelengthBotAction,
} from './logic';

export const wavelengthGameDefinition: GameDefinition<
  WavelengthState,
  WavelengthAction,
  WavelengthSettings
> = {
  id: 'wavelength',
  name: 'Wavelength',
  description:
    'A social telepathy and spectrum guessing party game! A Psychic gives a clue, and their team turns the dial to read their mind on a binary scale.',
  minPlayers: 2,
  maxPlayers: 10,
  recommendedPlayers: '4 - 8',
  tags: ['Party', 'Social Deduction', 'Deduction', 'Team', 'Co-op'],
  durationMinutes: '15 - 25 min',
  icon: '📡',
  coverGradient: 'from-amber-900 via-zinc-900 to-sky-950',
  rules: {
    summary:
      'Two teams (or one cooperative table) compete to read each other\'s minds! A rotating Psychic sees where a secret bullseye lies on a spectrum card (e.g. "Cold <---> Hot"). They give a clue. Teammates rotate the dial needle to aim at the target, while opponents guess if the target is Left or Right of the needle!',
    sections: [
      {
        title: 'The Psychic & The Clue',
        content:
          'Each round, one player is the Psychic. Only the Psychic can see the hidden colored target wedge on the dial. The Psychic gives a single clue representing where the bullseye is located between the two ends of the spectrum card.',
      },
      {
        title: 'Aiming the Dial (Team Guess)',
        content:
          'The Psychic\'s teammates discuss the clue and rotate the red needle pointer to where they believe the bullseye is located. Once confident, they lock in their dial guess.',
      },
      {
        title: 'Left or Right Counter-Guess',
        content:
          'In Team Battle mode, the opposing team gets to counter-guess: Is the true bullseye to the LEFT or to the RIGHT of the active team\'s needle? If they are correct (and the active team didn\'t hit the 4-point center), they score 1 bonus point!',
      },
      {
        title: 'The Shutter Reveal & Scoring',
        content:
          'The shutter slides open! The active team scores 4 points for hitting the bullseye center, 3 points for the inner zone, 2 points for the outer zone, and 0 points for missing. First team to 10 points wins!',
      },
      {
        title: 'Co-op Party Mode Variant',
        content:
          'In Co-op mode, the whole table plays together across 7 rounds without counter-guessing, aiming for the highest collective score possible (Mind Readers target: 20+ points)!',
      },
    ],
  },
  defaultSettings: {
    mode: 'competitive',
    targetScore: 10,
    timerSeconds: 90,
  },
  settingsSchema: [
    {
      key: 'mode',
      label: 'Game Mode',
      type: 'select',
      description: 'Choose competitive team battle or casual cooperative party play.',
      default: 'competitive',
      options: [
        { label: 'Team Battle (Brain vs Mind)', value: 'competitive' },
        { label: 'Co-op Party (All vs Dial)', value: 'coop' },
      ],
    },
    {
      key: 'targetScore',
      label: 'Target Win Score',
      type: 'number',
      description: 'Points required to claim victory in competitive battle.',
      default: 10,
      min: 6,
      max: 20,
      step: 2,
    },
  ],

  initGame: (players: Player[], settings: WavelengthSettings) => {
    return initWavelengthState(players, settings);
  },

  handleAction: (
    state: WavelengthState,
    action: WavelengthAction,
    playerId: string,
    _room: Room<WavelengthState, WavelengthSettings>
  ) => {
    const { newState, error } = wavelengthReducer(state, action, playerId);
    return { newState, error };
  },

  sanitizeState: (state: WavelengthState, playerId: string) => {
    return sanitizeWavelengthState(state, playerId);
  },

  getBotAction: (state: WavelengthState, botPlayerId: string) => {
    return getWavelengthBotAction(state, botPlayerId);
  },

  checkGameOver: (state: WavelengthState) => {
    if (state.phase === 'gameover') {
      if (state.mode === 'coop') {
        return {
          isOver: true,
          winner: 'Whole Table!',
          summary: `Co-op party finished with a total score of ${state.teams.brain.score} points!`,
        };
      }
      return {
        isOver: true,
        winner: state.winnerTeam === 'brain' ? 'Team Brain' : 'Team Mind',
        summary: `${state.winnerTeam === 'brain' ? 'Team Brain' : 'Team Mind'} achieved telepathic victory!`,
      };
    }
    return null;
  },
};

export * from './types';
export * from './logic';
export * from './cards';
