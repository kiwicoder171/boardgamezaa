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
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  Flame,
  Award,
  Compass,
} from 'lucide-react';
import { Card3DTilt } from '@/components/ui/Card3DTilt';

// Thematic Visual Design Metadata matching real tabletop physical materials & mood
const GAME_THEMES: Record<
  string,
  {
    genre: string;
    fontFamily: string;
    accentColor: string;
    containerClass: string;
    badgeClass: string;
    materials: string[];
    quickRule: string;
    tactileHighlight: string;
  }
> = {
  'sky-team': {
    genre: 'Co-op Aviation',
    fontFamily: 'font-scifi',
    accentColor: '#38bdf8',
    containerClass: 'bg-[#121110] border border-[#382416] hover:border-[#38bdf8]/50 text-[#ffedd7]',
    badgeClass: 'bg-[#38bdf8]/15 text-[#7dd3fc] border-[#38bdf8]/30',
    materials: ['✈️ Dual Control Racks', '🎲 8 Custom Flight Dice', '🧭 Tilt Artificial Horizon', '☕ Coffee Tokens'],
    quickRule: 'Pilot & Co-Pilot assign secret dice without speaking to balance axis tilt, throttle airspeed, and clear traffic.',
    tactileHighlight: 'Aeronautical altimeter instrumentation and custom wooden dice',
  },
  'werewolf': {
    genre: 'Gothic Deduction',
    fontFamily: 'font-fantasy',
    accentColor: '#c084fc',
    containerClass: 'bg-[#150f16] border border-[#382416] hover:border-[#c084fc]/50 text-[#ffedd7]',
    badgeClass: 'bg-[#c084fc]/15 text-[#e9d5ff] border-[#c084fc]/30',
    materials: ['📜 18+ Character Cards', '🌕 Moonlit Phase Tracker', '🗳️ Village Execution Dais'],
    quickRule: 'Unmask the bloodthirsty Werewolves before the village is devoured. Includes Tanner, Minion, Seer, Witch & Doppelgänger.',
    tactileHighlight: 'Moonlit grimoire seals and character role cards',
  },
  'cheese-thief': {
    genre: 'Bluffing & Deception',
    fontFamily: 'font-serifDisplay',
    accentColor: '#fbbf24',
    containerClass: 'bg-[#161009] border border-[#382416] hover:border-[#fbbf24]/50 text-[#ffedd7]',
    badgeClass: 'bg-[#fbbf24]/15 text-[#fef08a] border-[#fbbf24]/30',
    materials: ['🧀 Solid Cheese Token', '🎲 Hidden Wooden Dice Cups', '🕯️ Tavern Night Clock'],
    quickRule: 'The sneaky Cheese Thief wakes at their secret die hour to steal the cheese. Solo sleepyheads peek while followers join the heist!',
    tactileHighlight: 'Turned wooden dice cups and solid cheese block token',
  },
  'splendor': {
    genre: 'Renaissance Strategy',
    fontFamily: 'font-fantasy',
    accentColor: '#34d399',
    containerClass: 'bg-[#111410] border border-[#382416] hover:border-[#34d399]/50 text-[#ffedd7]',
    badgeClass: 'bg-[#34d399]/15 text-[#a7f3d0] border-[#34d399]/30',
    materials: ['💎 40 Weighted Resin Gem Chips', '🏰 90 Linen Finish Cards', '👑 10 Noble Patron Tiles'],
    quickRule: 'Collect raw gemstone tokens to purchase gemstone mines and merchant caravans. Earn permanent discounts and Noble prestige.',
    tactileHighlight: 'Weighted 14g casino-grade resin gem chips and gilded cards',
  },
  'codenames': {
    genre: 'Espionage Deduction',
    fontFamily: 'font-typewriter',
    accentColor: '#f87171',
    containerClass: 'bg-[#150d0a] border border-[#382416] hover:border-[#f87171]/50 text-[#ffedd7]',
    badgeClass: 'bg-[#f87171]/15 text-[#fecaca] border-[#f87171]/30',
    materials: ['🗂️ 25 Linen Word Cards', '🗺️ Classified Spymaster Keycard', '📌 Suspect Pins', '💀 Assassin Tile'],
    quickRule: 'Spymasters transmit one-word clues and numbers. Field operatives deduce the agents while dodging innocent bystanders and the lethal Assassin.',
    tactileHighlight: '300gsm linen cardstock and top-secret classified grid',
  },
  'bomb-busters': {
    genre: 'Co-op Wire Defusal',
    fontFamily: 'font-scifi',
    accentColor: '#f87171',
    containerClass: 'bg-[#140e0e] border border-[#382416] hover:border-[#dc5000]/50 text-[#ffedd7]',
    badgeClass: 'bg-[#dc5000]/15 text-[#fdba74] border-[#dc5000]/30',
    materials: ['💣 48 Heavy Wire Tiles', '🔴 4 Detonator Cables', '📟 LED Defusal Matrix', '🛡️ Radar Scanners'],
    quickRule: 'Cut numbered wires across teammates’ racks in ascending numerical order. Coordinate Duo and Solo cuts before fuses detonate!',
    tactileHighlight: 'Chunky resin wire tiles and authentic 7-segment LED readout',
  },
  'spyfall': {
    genre: 'Social Interrogation',
    fontFamily: 'font-typewriter',
    accentColor: '#a8a29e',
    containerClass: 'bg-[#141110] border border-[#382416] hover:border-[#f59e0b]/50 text-[#ffedd7]',
    badgeClass: 'bg-[#f59e0b]/15 text-[#fed7aa] border-[#f59e0b]/30',
    materials: ['📸 Polaroid Location Photos', '🕵️ Hidden Spy Role Dossier', '⏱️ 8-Min Interrogation Clock'],
    quickRule: 'Everyone knows the secret location except the Spy! Ask cunning questions without revealing the venue, while the Spy listens closely.',
    tactileHighlight: 'Polaroid snapshot prints and confidential agent scratchpads',
  },
};

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    avatar: '🎲',
  });
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [creatingGameId, setCreatingGameId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'play' | 'guide'>('play');
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [expandedGameRule, setExpandedGameRule] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('All');

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

  const handleCreateRoomWithGame = async (gameId: string = 'spyfall') => {
    if (isCreating) return;
    setIsCreating(true);
    setCreatingGameId(gameId);
    soundFX.playStart();

    const userToUse = profile.id ? profile : getUserProfile();
    try {
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: userToUse, gameId }),
      });
      const data = await res.json();
      if (data.code) {
        router.push(`/room/${data.code}`);
      } else {
        console.error('Room creation returned no code:', data);
        setIsCreating(false);
        setCreatingGameId(null);
      }
    } catch (err) {
      console.error(err);
      setIsCreating(false);
      setCreatingGameId(null);
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

  const filterTags = ['All', 'Cooperative', 'Social Deduction', 'Strategy', 'Party'];

  const filteredGames = games.filter((g) => {
    if (selectedTag === 'All') return true;
    if (selectedTag === 'Cooperative') return g.tags.includes('Cooperative') || g.id === 'sky-team' || g.id === 'bomb-busters';
    if (selectedTag === 'Social Deduction') return g.tags.includes('Social Deduction') || g.id === 'werewolf' || g.id === 'cheese-thief' || g.id === 'spyfall';
    if (selectedTag === 'Strategy') return g.tags.includes('Strategy') || g.id === 'splendor' || g.id === 'sky-team';
    if (selectedTag === 'Party') return g.tags.includes('Party') || g.id === 'codenames' || g.id === 'spyfall' || g.id === 'cheese-thief';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#090a0c] text-[#f4f4f5] flex flex-col selection:bg-white selection:text-black">
      {/* Minimalist Header */}
      <header className="border-b border-[#1e2025] bg-[#090a0c]/80 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎲</span>
            <span className="font-bold text-lg tracking-tight text-white">
              BoardgameZaa
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded-md hidden sm:inline-block">
              Free • Multiplayer
            </span>
          </div>

          <nav className="flex items-center gap-1">
            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('play');
              }}
              className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'play'
                  ? 'bg-zinc-100 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Games
            </button>
            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('guide');
              }}
              className={`btn-tactile px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'guide'
                  ? 'bg-zinc-100 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Developer Docs
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        {activeTab === 'play' ? (
          <>
            {/* Minimalist Hero Section */}
            <section className="pt-6 sm:pt-10 pb-4 space-y-4 max-w-3xl">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Play board games with friends online.
              </h1>
              <p className="text-base text-zinc-400 leading-relaxed">
                Direct room links. Instant setup with no downloads or sign-ups required. Open a table, share the code, and start playing.
              </p>
            </section>

            {/* Quick Actions Strip: Compact Profile + Direct Host/Join */}
            <section className="bg-[#111215] border border-[#222429] rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Profile Identity (4 Cols) */}
                <div className="lg:col-span-5 flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setAvatarPickerOpen(!avatarPickerOpen)}
                      className="btn-tactile w-12 h-12 rounded-xl bg-[#18191e] hover:bg-[#202228] border border-[#272930] flex items-center justify-center text-2xl transition"
                      title="Select avatar"
                    >
                      {profile.avatar}
                    </button>
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                      Your Nickname
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      maxLength={18}
                      placeholder="Player name..."
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full bg-[#18191e] border border-[#272930] rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>

                {/* Vertical Divider for large screens */}
                <div className="hidden lg:block lg:col-span-1 border-l border-[#222429] h-10 mx-auto" />

                {/* Host & Join Code Actions (6 Cols) */}
                <div className="lg:col-span-6 flex flex-col sm:flex-row gap-3 items-center">
                  <button
                    disabled={isCreating}
                    onClick={() => handleCreateRoomWithGame('sky-team')}
                    className="btn-tactile w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-lg text-sm transition flex items-center justify-center gap-2 flex-shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{isCreating ? 'Creating Table...' : 'Host New Table'}</span>
                  </button>

                  <form onSubmit={handleJoinRoom} className="flex gap-2 w-full">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="ROOM CODE"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-[#18191e] border border-[#272930] rounded-lg px-3 py-2 text-sm text-white font-mono tracking-wider text-center uppercase placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                    />
                    <button
                      type="submit"
                      disabled={!roomCodeInput.trim()}
                      className="btn-tactile px-4 py-2 bg-[#202228] hover:bg-[#282a32] text-white disabled:opacity-30 font-semibold text-xs rounded-lg border border-[#272930] transition"
                    >
                      Join
                    </button>
                  </form>
                </div>
              </div>

              {/* Avatar Picker Drawer */}
              {avatarPickerOpen && (
                <div className="mt-4 pt-4 border-t border-[#222429] flex flex-wrap gap-2 animate-in fade-in">
                  {DEFAULT_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleAvatarSelect(emoji)}
                      className={`text-xl p-2 rounded-lg transition btn-tactile ${
                        profile.avatar === emoji
                          ? 'bg-zinc-800 border border-zinc-600'
                          : 'hover:bg-zinc-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Game Catalog */}
            <section className="space-y-6 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222429] pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Available Titles ({filteredGames.length})
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Select any game to host a private match with your rules.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {filterTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        soundFX.playClick();
                        setSelectedTag(tag);
                      }}
                      className={`btn-tactile text-xs px-3 py-1 rounded-md transition ${
                        selectedTag === tag
                          ? 'bg-white text-zinc-950 font-bold'
                          : 'bg-[#141518] text-zinc-400 hover:text-white border border-[#222429]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clean Minimalist Game Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredGames.map((g) => {
                  const theme = GAME_THEMES[g.id] || {
                    genre: 'Tabletop Game',
                    fontFamily: 'font-sans',
                    quickRule: g.description,
                  };

                  const isExpanded = expandedGameRule === g.id;

                  return (
                    <div
                      key={g.id}
                      className="bg-[#111215] border border-[#222429] hover:border-[#383b44] rounded-2xl p-5 flex flex-col justify-between gap-4 transition duration-150"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-3xl">{g.icon}</span>
                          <span className="text-[11px] font-mono text-zinc-400 border border-[#272930] px-2 py-0.5 rounded-md">
                            {theme.genre}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-white tracking-tight">
                            {g.name}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                            {g.description}
                          </p>
                        </div>

                        {/* Quick Rule Accordion */}
                        <div>
                          <button
                            onClick={() => {
                              soundFX.playClick();
                              setExpandedGameRule(isExpanded ? null : g.id);
                            }}
                            className="text-[11px] text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1 font-medium"
                          >
                            <span>{isExpanded ? 'Hide rules' : 'How it works'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 text-xs text-zinc-300 p-3 rounded-lg bg-[#18191e] border border-[#272930] leading-relaxed animate-in fade-in">
                              {theme.quickRule}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Metadata + Host Button */}
                      <div className="pt-3 border-t border-[#1e2025] flex items-center justify-between">
                        <div className="text-xs text-zinc-500 font-mono flex items-center gap-2">
                          <span>{g.minPlayers}-{g.maxPlayers}p</span>
                          <span>•</span>
                          <span>{g.durationMinutes}</span>
                        </div>

                        <button
                          disabled={isCreating}
                          onClick={() => handleCreateRoomWithGame(g.id)}
                          className="btn-tactile px-3.5 py-1.5 bg-[#1f2026] hover:bg-white hover:text-zinc-950 text-white font-semibold text-xs rounded-lg border border-[#2a2c35] transition flex items-center gap-1.5"
                        >
                          <span>{creatingGameId === g.id ? 'Loading...' : 'Play'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          /* Developer & Extensibility Guide Section */
          <section className="space-y-8 animate-in fade-in">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                <Code2 className="w-3.5 h-3.5" />
                <span>Extensible Game Engine</span>
              </div>
              <h2 className="text-3xl font-black text-white">
                How to Code and Add Your Own Boardgame
              </h2>
              <p className="text-xs text-zinc-400 max-w-2xl">
                The BoardgameZaa architecture is designed so you can create a new folder under{' '}
                <code className="text-zinc-200 font-mono bg-[#18191e] px-1.5 py-0.5 rounded border border-[#272930]">src/games/</code>, define your game logic, and it
                immediately becomes playable in the lobby!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-[#18191e] text-zinc-200 border border-[#272930] flex items-center justify-center font-bold text-xs font-mono">
                  01
                </div>
                <h3 className="font-bold text-white text-sm">Create Game Folder</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Create <code className="text-zinc-300 font-mono">src/games/my-game/</code> with:{' '}
                  <code className="text-zinc-300 font-mono">index.ts</code>,{' '}
                  <code className="text-zinc-300 font-mono">logic.ts</code>, and{' '}
                  <code className="text-zinc-300 font-mono">MyGameBoard.tsx</code>.
                </p>
              </div>

              <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-[#18191e] text-zinc-200 border border-[#272930] flex items-center justify-center font-bold text-xs font-mono">
                  02
                </div>
                <h3 className="font-bold text-white text-sm">Implement Game Contract</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Implement <code className="text-zinc-300 font-mono">initGame()</code>,{' '}
                  <code className="text-zinc-300 font-mono">handleAction()</code>, and{' '}
                  <code className="text-zinc-300 font-mono">sanitizeState()</code> to hide secret info
                  from opponents.
                </p>
              </div>

              <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-[#18191e] text-zinc-200 border border-[#272930] flex items-center justify-center font-bold text-xs font-mono">
                  03
                </div>
                <h3 className="font-bold text-white text-sm">Register in 2 Lines</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Import your game in <code className="text-zinc-300 font-mono">src/games/registry.ts</code>{' '}
                  and add the board in <code className="text-zinc-300 font-mono">GameRenderer.tsx</code>.
                  It will show up instantly in the lobby selector!
                </p>
              </div>
            </div>

            {/* Code Template Card */}
            <div className="bg-[#111215] border border-[#222429] rounded-2xl p-5 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#222429] pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-mono font-semibold text-zinc-300">
                    src/games/bomb-busters/index.ts (Plugin Schema Specification)
                  </span>
                </div>
              </div>

              <pre className="text-xs font-mono text-zinc-300 overflow-x-auto p-4 bg-[#18191e] border border-[#272930] rounded-xl leading-relaxed">
{`export const bombBustersGameDefinition: GameDefinition = {
  id: 'bomb-busters',
  name: 'Bomb Busters',
  description: 'Cooperative wire-cutting puzzle game',
  minPlayers: 2,
  maxPlayers: 5,
  tags: ['Cooperative', 'Puzzle', 'Numbers'],
  durationMinutes: '20-30m',
  settingsSchema: [
    { key: 'difficulty', label: 'Mission Pack', type: 'select', default: 1, options: [...] },
  ],
  initGame: (players, settings) => initBombBustersGame(players, settings),
  handleAction: (state, action, playerId) => handleBombBustersAction(state, action, playerId),
  sanitizeState: (state, playerId) => sanitizeBombBustersState(state, playerId),
};`}
              </pre>
            </div>
          </section>
        )}
      </main>

      {/* Minimalist Footer */}
      <footer className="border-t border-[#1e2025] bg-[#090a0c] px-6 py-5 text-center text-xs text-zinc-500 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight">BoardgameZaa</span>
            <span>• Tabletop Simulation Platform</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-600">
            Next.js • Socket.IO • Web Audio • Zero-Latency Realtime 🎲
          </div>
        </div>
      </footer>
    </div>
  );
}
