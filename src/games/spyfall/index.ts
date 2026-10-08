import { GameDefinition } from '@/types/game';
import { handleSpyfallAction, handleSpyfallTimerTick, initSpyfallGame, sanitizeSpyfallState } from './logic';
import { SpyfallAction, SpyfallSettings, SpyfallState } from './types';
import { LOCATION_PACKS } from './data';

export const spyfallGameDefinition: GameDefinition<SpyfallState, SpyfallAction, SpyfallSettings> = {
  id: 'spyfall',
  name: 'Spyfall',
  description: 'Unmask the secret spy among your friends, or bluff your way through without getting caught!',
  minPlayers: 3,
  maxPlayers: 12,
  recommendedPlayers: '4 - 8',
  tags: ['Social Deduction', 'Bluffing', 'Timer', 'Party'],
  durationMinutes: '8 min',
  icon: '🕵️',
  coverGradient: 'from-amber-500 via-rose-600 to-indigo-900',
  rules: {
    summary: 'One player is a secret SPY who has no idea where everyone is. All other players know the location and each have a unique role. Players take turns asking clever questions to sniff out the spy without giving away the location!',
    sections: [
      {
        title: 'The Goal',
        content: 'Citizens win if they unanimously vote out the spy, or if the spy guesses the location incorrectly. The Spy wins if they survive the full timer, trick the citizens into convicting an innocent player, or correctly guess the secret location at any time!',
      },
      {
        title: 'Questioning Phase',
        content: 'The starter chooses someone to ask a question. The question can be anything ("Is it hot here?", "What are you wearing?"). After answering, that person becomes the next asker and can ask anyone (except the person who just asked them).',
      },
      {
        title: 'Accusations',
        content: 'At any point, any player can accuse someone of being the spy. All players (except the accused) vote. If unanimous guilty, the accused is convicted!',
      },
      {
        title: 'Spy Guess',
        content: 'If you are the Spy, you can stop the game at any moment to reveal yourself and guess the secret location from the list. If you get it right, you win instantly!',
      },
      {
        title: 'Personal Scratchpad',
        content: 'You can click on any location card on the board to cross it out or highlight it on your screen to track your deductive reasoning!',
      },
    ],
  },
  defaultSettings: {
    roundMinutes: 8,
    spyCount: 1,
    locationPack: 'all',
  },
  settingsSchema: [
    {
      key: 'roundMinutes',
      label: 'Round Time (Minutes)',
      description: 'Timer duration for questioning',
      type: 'number',
      min: 3,
      max: 15,
      step: 1,
      default: 8,
    },
    {
      key: 'spyCount',
      label: 'Number of Spies',
      description: 'Number of secret spies in the round',
      type: 'select',
      options: [
        { label: '1 Spy (Standard)', value: 1 },
        { label: '2 Spies (For large groups 6+)', value: 2 },
      ],
      default: 1,
    },
    {
      key: 'locationPack',
      label: 'Location Theme Pack',
      description: 'Choose which pool of locations to play with',
      type: 'select',
      options: LOCATION_PACKS.map((pack) => ({
        label: pack.name,
        value: pack.id,
      })),
      default: 'all',
    },
  ],
  initGame: initSpyfallGame,
  handleAction: handleSpyfallAction,
  sanitizeState: sanitizeSpyfallState,
  onTimerTick: handleSpyfallTimerTick,
  checkGameOver: (state) => {
    if (state.phase === 'gameover') {
      return {
        isOver: true,
        winner: state.winner || undefined,
        summary: state.winReason || undefined,
      };
    }
    return null;
  },
};
