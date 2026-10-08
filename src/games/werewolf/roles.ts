import { RoleConfig, WerewolfRole } from './types';

export const WEREWOLF_ROLES_CATALOG: Record<WerewolfRole, RoleConfig> = {
  werewolf: {
    id: 'werewolf',
    name: 'Werewolf',
    team: 'werewolves',
    description:
      'Wakes up each night with fellow Werewolves to choose an innocent Villager to devour.',
    icon: '🐺',
    badgeColor: 'bg-rose-950 text-rose-300 border-rose-700',
    nightOrder: 10,
    wakePrompt: 'Werewolves, wake up! Look at each other, and choose a villager to eliminate.',
  },
  wolf_pup: {
    id: 'wolf_pup',
    name: 'Wolf Pup',
    team: 'werewolves',
    description:
      'Part of the Werewolf pack. If the Wolf Pup is eliminated, the Werewolves get 2 kills the following night!',
    icon: '🐾',
    badgeColor: 'bg-red-950 text-red-300 border-red-700',
    nightOrder: 10,
    wakePrompt: 'Wolf Pup wakes with the Werewolf pack.',
  },
  minion: {
    id: 'minion',
    name: 'Minion',
    team: 'werewolves',
    description:
      'Knows who the Werewolves are, but Werewolves do not know who the Minion is. Wins if Werewolves win.',
    icon: '🦹',
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-700',
    nightOrder: 5,
    wakePrompt: 'Minion, wake up and see who the Werewolves are.',
  },
  seer: {
    id: 'seer',
    name: 'Seer',
    team: 'villagers',
    description:
      'Wakes up each night to gaze into the crystal ball and discover if one player is on the Werewolf team.',
    icon: '🔮',
    badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
    nightOrder: 20,
    wakePrompt: 'Seer, wake up! Choose a player to inspect their true alignment.',
  },
  bodyguard: {
    id: 'bodyguard',
    name: 'Bodyguard',
    team: 'villagers',
    description:
      'Wakes up each night to protect 1 player from being killed. Cannot protect the same player two nights in a row.',
    icon: '🛡️',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    nightOrder: 30,
    wakePrompt: 'Bodyguard, wake up! Choose someone to shield from attack tonight.',
  },
  witch: {
    id: 'witch',
    name: 'Witch',
    team: 'villagers',
    description:
      'Has 2 powerful potions: 1 Revive Potion (to save the werewolf victim) and 1 Poison Potion (to eliminate anyone).',
    icon: '🧙‍♀️',
    badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-700',
    nightOrder: 40,
    wakePrompt: 'Witch, wake up! You may use your Revive or Poison potion tonight.',
  },
  cupid: {
    id: 'cupid',
    name: 'Cupid',
    team: 'villagers',
    description:
      'On Night 1, binds 2 players as secret Lovers. If one lover dies, the other immediately dies of heartbreak!',
    icon: '💘',
    badgeColor: 'bg-pink-950 text-pink-300 border-pink-700',
    nightOrder: 2,
    wakePrompt: 'Cupid, wake up! Choose two players to fall deeply in love.',
  },
  hunter: {
    id: 'hunter',
    name: 'Hunter',
    team: 'villagers',
    description:
      'If eliminated (by night attack or daytime trial), fires a dying arrow to eliminate any player of their choice.',
    icon: '🏹',
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-700',
    nightOrder: 0,
  },
  mayor: {
    id: 'mayor',
    name: 'Mayor',
    team: 'villagers',
    description:
      'Elected leader of the village. Their vote counts as 2 votes in the event of a tie during trials.',
    icon: '📜',
    badgeColor: 'bg-yellow-950 text-yellow-300 border-yellow-700',
    nightOrder: 0,
  },
  mason: {
    id: 'mason',
    name: 'Mason',
    team: 'villagers',
    description:
      'Member of a secret guild. On Night 1, all Masons wake up and see each other to know who is trusted.',
    icon: '🧱',
    badgeColor: 'bg-stone-950 text-stone-300 border-stone-700',
    nightOrder: 4,
    wakePrompt: 'Masons, wake up and look at your fellow guild members.',
  },
  robber: {
    id: 'robber',
    name: 'Robber',
    team: 'villagers',
    description:
      'Swaps roles with another player in the night and secretly views their new role.',
    icon: '🤹',
    badgeColor: 'bg-teal-950 text-teal-300 border-teal-700',
    nightOrder: 22,
    wakePrompt: 'Robber, wake up! You may swap your role with another player and view it.',
  },
  troublemaker: {
    id: 'troublemaker',
    name: 'Troublemaker',
    team: 'villagers',
    description:
      'Swaps two other players’ roles in the dead of night without looking at them!',
    icon: '🌪️',
    badgeColor: 'bg-violet-950 text-violet-300 border-violet-700',
    nightOrder: 24,
    wakePrompt: 'Troublemaker, wake up! Choose two players to swap their roles.',
  },
  insomniac: {
    id: 'insomniac',
    name: 'Insomniac',
    team: 'villagers',
    description:
      'Wakes up at the very end of the night to check if their role has been altered by a trickster.',
    icon: '🥱',
    badgeColor: 'bg-slate-900 text-slate-300 border-slate-600',
    nightOrder: 50,
    wakePrompt: 'Insomniac, wake up and look at your current card.',
  },
  tanner: {
    id: 'tanner',
    name: 'Tanner',
    team: 'tanner',
    description:
      'Despises village life! Wins ONLY if the village votes to execute them during the day trial!',
    icon: '💀',
    badgeColor: 'bg-zinc-950 text-zinc-300 border-zinc-700',
    nightOrder: 0,
  },
  villager: {
    id: 'villager',
    name: 'Villager',
    team: 'villagers',
    description:
      'A simple honest villager. Sleeps peacefully through the night, but uses deduction and voting by day.',
    icon: '👨‍🌾',
    badgeColor: 'bg-blue-950 text-blue-300 border-blue-700',
    nightOrder: 0,
  },
};

export const NIGHT_ROLES_ORDER: WerewolfRole[] = [
  'cupid',
  'mason',
  'minion',
  'werewolf',
  'seer',
  'robber',
  'troublemaker',
  'bodyguard',
  'witch',
  'insomniac',
];
