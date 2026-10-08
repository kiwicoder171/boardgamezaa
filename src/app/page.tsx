'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_AVATARS, getUserProfile, saveUserProfile, UserProfile } from '@/lib/storage';
import { getAllGames } from '@/games/registry';
import { soundFX } from '@/lib/sounds';
import {
  Code2,
  Gamepad2,
  PlusCircle,
  Users,
  Sparkles,
  ArrowRight,
  BookOpen,
  Check,
  Layers,
  Terminal,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    avatar: '🎲',
  });
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'play' | 'guide'>('play');
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  useEffect(() => {
    const user = getUserProfile();
    setProfile(user);
  }, []);

  const handleNameChange = (name: string) => {
    setProfile((prev) => ({ ...prev, name }));
    saveUserProfile(name, profile.avatar);
  };

  const handleAvatarSelect = (avatar: string) => {
    soundFX.playClick();
    setProfile((prev) => ({ ...prev, avatar }));
    saveUserProfile(profile.name, avatar);
    setAvatarPickerOpen(false);
  };

  const handleCreateRoom = async () => {
    if (isCreating) return;
    setIsCreating(true);
    soundFX.playStart();

    try {
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: profile, gameId: 'spyfall' }),
      });
      const data = await res.json();
      if (data.code) {
        router.push(`/room/${data.code}`);
      }
    } catch (err) {
      console.error(err);
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!cleanCode) return;
    soundFX.playClick();
    router.push(`/room/${cleanCode}`);
  };

  const games = getAllGames();

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Background ambient decorative glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-600/15 via-purple-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎲</span>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                BoardgameZaa
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                Hub Platform
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('play')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'play'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              Play Games
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-4 h-4 text-emerald-400" />
              Developer Guide
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        {activeTab === 'play' ? (
          <>
            {/* Hero Section */}
            <div className="text-center space-y-3 pt-4 sm:pt-8">
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                Your Friend-Group{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                  Board Game Center
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Create a lobby, share a link with your friends, pick what game you want to play
                today, and code your own custom games whenever you want!
              </p>
            </div>

            {/* Profile & Room Creation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Profile Card */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-200">Your Player Profile</h3>
                  <span className="text-[11px] text-slate-500">Saved in browser</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <button
                      onClick={() => setAvatarPickerOpen(!avatarPickerOpen)}
                      className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-3xl shadow-inner transition transform hover:scale-105"
                      title="Click to change avatar"
                    >
                      {profile.avatar}
                    </button>
                    <span className="absolute -bottom-1 -right-1 text-[10px] bg-indigo-600 text-white rounded-full px-1">
                      ✎
                    </span>
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Nickname
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      maxLength={18}
                      placeholder="Enter your name..."
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Avatar Picker Drawer */}
                {avatarPickerOpen && (
                  <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/80 flex flex-wrap gap-2 justify-center animate-in fade-in">
                    {DEFAULT_AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAvatarSelect(emoji)}
                        className={`text-2xl p-2 rounded-xl transition ${
                          profile.avatar === emoji
                            ? 'bg-indigo-600/40 border border-indigo-400'
                            : 'hover:bg-slate-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lobby Entry Card: Create or Join */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-200">Start or Join a Room</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Host a game night or jump into an existing lobby.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    disabled={isCreating}
                    onClick={handleCreateRoom}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-2xl text-sm transition shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>Create New Room</span>
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-500">
                      or join with code
                    </span>
                    <div className="flex-grow border-t border-slate-800"></div>
                  </div>

                  <form onSubmit={handleJoinRoom} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="ROOM CODE (e.g. ABCD)"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white font-mono tracking-widest text-center uppercase focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!roomCodeInput.trim()}
                      className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 font-bold text-xs rounded-xl border border-slate-700 transition"
                    >
                      Join
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Game Catalog Section */}
            <div className="space-y-5 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Available & Upcoming Games
                  </h2>
                  <p className="text-xs text-slate-400">
                    All games are playable directly in-browser with zero download or installation.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Spyfall (Playable) */}
                {games.map((g) => (
                  <div
                    key={g.id}
                    className="relative bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-4 ring-1 ring-indigo-500/20"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-4xl p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                          {g.icon}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Ready to Play
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-white mt-4">{g.name}</h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {g.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {g.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>👥 {g.minPlayers} - {g.maxPlayers} players</span>
                      <span>⏱️ {g.durationMinutes}</span>
                    </div>
                  </div>
                ))}

                {/* The Resistance: Avalon (Planned / In Development) */}
                <div className="relative bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between gap-4 opacity-85">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-4xl p-3 bg-slate-800/40 rounded-2xl border border-slate-700/60">
                        ⚔️
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-full">
                        Next in Line
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-white mt-4">The Resistance: Avalon</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Loyal servants of Arthur vs Minions of Mordred. Quests, voting, Merlin, and
                      the Assassin strike.
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {['Social Deduction', 'Hidden Roles', 'Strategy'].map((t) => (
                        <span key={t} className="text-[10px] bg-slate-800/60 text-slate-500 px-2 py-0.5 rounded-md">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                    <span>👥 5 - 10 players</span>
                    <span>⏱️ 30 min</span>
                  </div>
                </div>

                {/* Werewolf (Next in Queue) */}
                <div className="relative bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between gap-4 opacity-85">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-4xl p-3 bg-slate-800/40 rounded-2xl border border-slate-700/60">
                        🐺
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-full">
                        Up Next
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-white mt-4">Ultimate Werewolf</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Social deduction party classic with all expansion roles (Seer, Tanner, Witch, Doppelganger, Minion).
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {['Social Deduction', 'Hidden Roles', 'Bluffing', 'Expansions'].map((t) => (
                        <span key={t} className="text-[10px] bg-slate-800/60 text-slate-500 px-2 py-0.5 rounded-md">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                    <span>👥 4 - 20 players</span>
                    <span>⏱️ 15 min</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Developer Guide Section */
          <div className="space-y-8 animate-in fade-in">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                <Code2 className="w-3.5 h-3.5" />
                <span>Extensible Game Engine</span>
              </div>
              <h2 className="text-3xl font-black text-white">
                How to Code and Add Your Own Boardgame
              </h2>
              <p className="text-sm text-slate-400 max-w-2xl">
                The BoardgameZaa architecture is designed so you can create a new folder under{' '}
                <code className="text-indigo-300">src/games/</code>, define your game logic, and it
                immediately becomes playable in the lobby!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="font-bold text-white text-base">Create Game Folder</h3>
                <p className="text-xs text-slate-400">
                  Create <code className="text-indigo-300">src/games/bomb-busters/</code> with:{' '}
                  <code className="text-slate-300">index.ts</code>,{' '}
                  <code className="text-slate-300">logic.ts</code>, and{' '}
                  <code className="text-slate-300">BoardComponent.tsx</code>.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
                  2
                </div>
                <h3 className="font-bold text-white text-base">Implement Game Contract</h3>
                <p className="text-xs text-slate-400">
                  Implement <code className="text-purple-300">initGame()</code>,{' '}
                  <code className="text-purple-300">handleAction()</code>, and{' '}
                  <code className="text-purple-300">sanitizeState()</code> to hide secret info
                  from opponents.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  3
                </div>
                <h3 className="font-bold text-white text-base">Register in 2 Lines</h3>
                <p className="text-xs text-slate-400">
                  Import your game in <code className="text-emerald-300">src/games/registry.ts</code>{' '}
                  and add the board in <code className="text-emerald-300">GameRenderer.tsx</code>.
                  It will show up instantly in the lobby selector!
                </p>
              </div>
            </div>

            {/* Code Example Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-slate-300">
                    src/games/bomb-busters/index.ts (Example Plugin Template)
                  </span>
                </div>
              </div>

              <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-4 bg-slate-900/60 rounded-2xl leading-relaxed">
{`export const bombBustersGameDefinition: GameDefinition = {
  id: 'bomb-busters',
  name: 'Bomb Busters',
  description: 'Cooperative wire-cutting puzzle game',
  minPlayers: 2,
  maxPlayers: 5,
  tags: ['Cooperative', 'Puzzle', 'Numbers'],
  durationMinutes: '15 min',
  icon: '💣',
  coverGradient: 'from-amber-600 to-rose-700',
  defaultSettings: { timerSeconds: 60, difficulty: 'normal' },
  settingsSchema: [
    { key: 'difficulty', label: 'Difficulty', type: 'select', 
      options: [{ label: 'Normal', value: 'normal' }, { label: 'Hard', value: 'hard' }], 
      default: 'normal' }
  ],
  initGame: (players, settings) => {
    // Deal wire tiles to players, set initial bomb fuse...
    return { bombState: 100, wiresRemaining: 48, ... };
  },
  handleAction: (state, action, playerId) => {
    // Handle action: CUT_WIRE, GUESS_NUMBER, etc.
    return { newState: updatedState };
  },
  sanitizeState: (state, playerId) => {
    // Mask other players' secret numbers!
    return maskedStateForPlayer;
  }
};`}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        BoardgameZaa © 2026 • Built for playing games with friends online
      </footer>
    </div>
  );
}
