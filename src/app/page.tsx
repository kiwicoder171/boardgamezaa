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
    containerClass: 'bg-[#0d1524] border border-slate-800/90 hover:border-sky-500/40 text-slate-100',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
    materials: ['✈️ Dual Control Racks', '🎲 8 Custom Flight Dice', '🧭 Tilt Artificial Horizon', '☕ Coffee Tokens'],
    quickRule: 'Pilot & Co-Pilot assign secret dice without speaking to balance axis tilt, throttle airspeed, and clear traffic.',
    tactileHighlight: 'Aeronautical altimeter instrumentation and custom wooden dice',
  },
  'werewolf': {
    genre: 'Gothic Deduction',
    fontFamily: 'font-fantasy',
    accentColor: '#c084fc',
    containerClass: 'bg-[#0d1524] border border-slate-800/90 hover:border-purple-500/40 text-slate-100',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
    materials: ['📜 18+ Character Cards', '🌕 Moonlit Phase Tracker', '🗳️ Village Execution Dais'],
    quickRule: 'Unmask the bloodthirsty Werewolves before the village is devoured. Includes Tanner, Minion, Seer, Witch & Doppelgänger.',
    tactileHighlight: 'Moonlit grimoire seals and character role cards',
  },
  'cheese-thief': {
    genre: 'Bluffing & Deception',
    fontFamily: 'font-serifDisplay',
    accentColor: '#fbbf24',
    containerClass: 'bg-[#0d1524] border border-slate-800/90 hover:border-amber-500/40 text-slate-100',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    materials: ['🧀 Solid Cheese Token', '🎲 Hidden Wooden Dice Cups', '🕯️ Tavern Night Clock'],
    quickRule: 'The sneaky Cheese Thief wakes at their secret die hour to steal the cheese. Solo sleepyheads peek while followers join the heist!',
    tactileHighlight: 'Turned wooden dice cups and solid cheese block token',
  },
  'splendor': {
    genre: 'Renaissance Strategy',
    fontFamily: 'font-fantasy',
    accentColor: '#34d399',
    containerClass: 'bg-[#0d1524] border border-slate-800/90 hover:border-emerald-500/40 text-slate-100',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    materials: ['💎 40 Weighted Resin Gem Chips', '🏰 90 Linen Finish Cards', '👑 10 Noble Patron Tiles'],
    quickRule: 'Collect raw gemstone tokens to purchase gemstone mines and merchant caravans. Earn permanent discounts and Noble prestige.',
    tactileHighlight: 'Weighted 14g casino-grade resin gem chips and gilded cards',
  },
  'codenames': {
    genre: 'Espionage Deduction',
    fontFamily: 'font-typewriter',
    accentColor: '#f87171',
    containerClass: 'bg-[#0d1524] border border-slate-800/90 hover:border-rose-500/40 text-slate-100',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    materials: ['🗂️ 25 Linen Word Cards', '🗺️ Classified Spymaster Keycard', '📌 Suspect Pins', '💀 Assassin Tile'],
    quickRule: 'Spymasters transmit one-word clues and numbers. Field operatives deduce the agents while dodging innocent bystanders and the lethal Assassin.',
    tactileHighlight: '300gsm linen cardstock and top-secret classified grid',
  },
  'bomb-busters': {
    genre: 'Co-op Wire Defusal',
    fontFamily: 'font-scifi',
    accentColor: '#f87171',
    containerClass: 'bg-[#0d1524] border border-slate-800/90 hover:border-red-500/40 text-slate-100',
    badgeClass: 'bg-red-500/15 text-red-300 border-red-500/30',
    materials: ['💣 48 Heavy Wire Tiles', '🔴 4 Detonator Cables', '📟 LED Defusal Matrix', '🛡️ Radar Scanners'],
    quickRule: 'Cut numbered wires across teammates’ racks in ascending numerical order. Coordinate Duo and Solo cuts before fuses detonate!',
    tactileHighlight: 'Chunky resin wire tiles and authentic 7-segment LED readout',
  },
  'spyfall': {
    genre: 'Social Interrogation',
    fontFamily: 'font-typewriter',
    accentColor: '#a8a29e',
    containerClass: 'bg-[#0d1524] border border-slate-800/90 hover:border-stone-500/40 text-slate-100',
    badgeClass: 'bg-stone-500/15 text-stone-300 border-stone-400/30',
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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Tabletop Atmosphere: Ambient table spotlights and velvet illumination */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-indigo-900/25 via-emerald-950/15 to-transparent blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-amber-950/15 blur-[100px]" />
      </div>

      {/* Tabletop Header Rim */}
      <header className="relative z-20 border-b border-amber-900/30 bg-[#0c121e]/90 backdrop-blur-md px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-2xl shadow-md border border-amber-400/40">
              🎲
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-2xl tracking-tight bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 bg-clip-text text-transparent font-fantasy">
                  BoardgameZaa
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  Tabletop Hub
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Authentic physical board games recreated for online multiplayer
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('play');
              }}
              className={`btn-tactile px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                activeTab === 'play'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              Game Vault
            </button>
            <button
              onClick={() => {
                soundFX.playClick();
                setActiveTab('guide');
              }}
              className={`btn-tactile px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-4 h-4" />
              Developer API
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        {activeTab === 'play' ? (
          <>
            {/* Tabletop Hero & Callout Banner */}
            <section className="text-center space-y-4 pt-2 sm:pt-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Zero Installs • Instant Table Link • 7 Authentic Tabletop Games</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">
                Play Real Board Games <br className="hidden sm:inline" />
                <span className="font-fantasy bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400 bg-clip-text text-transparent">
                  With Your Friends
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Experience tactile physical game components—from wooden pilot dice in Sky Team and heavy resin gem chips in Splendor, to top-secret manila dossiers in Codenames.
              </p>
            </section>

            {/* Quick Profile & Table Entrance Lounge */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Player Badge Dossier */}
              <div className="bg-gradient-to-b from-[#131b2c] to-[#0c121d] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👤</span> Player Identity
                  </span>
                  <span className="text-[11px] text-slate-500">Persistent across rooms</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <button
                      onClick={() => setAvatarPickerOpen(!avatarPickerOpen)}
                      className="btn-tactile w-16 h-16 rounded-2xl bg-[#1a2336] hover:bg-[#222e47] border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner"
                      title="Click to select your avatar token"
                    >
                      {profile.avatar}
                    </button>
                    <span className="absolute -bottom-1 -right-1 text-[10px] bg-amber-500 text-slate-950 font-black rounded-full px-1.5 shadow">
                      ✎
                    </span>
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Table Nickname
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      maxLength={18}
                      placeholder="Enter player name..."
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full bg-[#0a0f19] border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Avatar Picker Drawer */}
                {avatarPickerOpen && (
                  <div className="p-3 bg-[#0a0f19] rounded-2xl border border-slate-700 flex flex-wrap gap-2 justify-center animate-in fade-in">
                    {DEFAULT_AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAvatarSelect(emoji)}
                        className={`text-2xl p-2 rounded-xl transition btn-tactile ${
                          profile.avatar === emoji
                            ? 'bg-amber-500/30 border border-amber-400'
                            : 'hover:bg-slate-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Instant Room Dispatcher */}
              <div className="bg-gradient-to-b from-[#131b2c] to-[#0c121d] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Host or Enter a Table</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Spin up a private game room or join an invite code.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    disabled={isCreating}
                    onClick={() => handleCreateRoomWithGame('sky-team')}
                    className="btn-tactile w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-2xl text-sm shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>{isCreating ? 'Setting Up Table...' : 'Host New Game Table'}</span>
                  </button>

                  <div className="relative flex py-0.5 items-center">
                    <div className="flex-grow border-t border-slate-800" />
                    <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                      Or Join with Code
                    </span>
                    <div className="flex-grow border-t border-slate-800" />
                  </div>

                  <form onSubmit={handleJoinRoom} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="ENTER 4-LETTER CODE"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-[#0a0f19] border border-slate-700/80 rounded-xl px-4 py-2 text-sm text-white font-mono tracking-widest text-center uppercase focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      disabled={!roomCodeInput.trim()}
                      className="btn-tactile px-5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 disabled:opacity-40 font-bold text-xs rounded-xl border border-slate-700"
                    >
                      Enter 🚪
                    </button>
                  </form>
                </div>
              </div>
            </section>

            {/* Game Catalog & Thematic Materials Showcase */}
            <section className="space-y-6 pt-6">
              {/* Filter Tabs & Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                    <span>The Tabletop Vault ({filteredGames.length} Titles)</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Skeuomorphic digital editions engineered with physical tabletop materials and official rules.
                  </p>
                </div>

                {/* Genre Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {filterTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        soundFX.playClick();
                        setSelectedTag(tag);
                      }}
                      className={`btn-tactile text-xs px-3 py-1.5 rounded-xl font-bold transition ${
                        selectedTag === tag
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thematic Game Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGames.map((g) => {
                  const theme = GAME_THEMES[g.id] || {
                    genre: 'Tabletop Game',
                    fontFamily: 'font-sans',
                    accentColor: 'from-indigo-600 to-purple-800',
                    containerClass: 'bg-slate-900 text-slate-100',
                    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40',
                    materials: ['🎲 Dice', '🃏 Cards', '🪵 Board'],
                    quickRule: g.description,
                    tactileHighlight: 'Handcrafted digital tabletop components',
                  };

                  const isExpanded = expandedGameRule === g.id;

                  return (
                    <Card3DTilt key={g.id} className="h-full">
                      <div
                        className={`relative h-full rounded-3xl p-6 shadow-xl hover:shadow-2xl flex flex-col justify-between gap-5 transition-all duration-200 ${theme.containerClass}`}
                      >
                        {/* Top Bar: Icon, Genre Badge & Ready Indicator */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                              {g.icon}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${theme.badgeClass}`}
                              >
                                {theme.genre}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Ready to Play
                              </span>
                            </div>
                          </div>

                          {/* Title and Thematic Heading Font */}
                          <div>
                            <h3 className={`text-2xl font-black tracking-tight ${theme.fontFamily}`}>
                              {g.name}
                            </h3>
                            <p className="text-xs opacity-80 mt-1 leading-relaxed">
                              {g.description}
                            </p>
                          </div>

                          {/* Physical Materials Inventory Strip */}
                          <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1.5">
                            <div className="text-[10px] font-bold tracking-widest uppercase opacity-60 flex items-center gap-1">
                              <Layers className="w-3 h-3" /> Tangible Components
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {theme.materials.map((m) => (
                                <span
                                  key={m}
                                  className="text-[11px] font-medium bg-black/40 px-2 py-0.5 rounded-md border border-white/10"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Accordion Bite-Sized Rule Overview */}
                          <div className="border-t border-white/10 pt-3">
                            <button
                              onClick={() => {
                                soundFX.playClick();
                                setExpandedGameRule(isExpanded ? null : g.id);
                              }}
                              className="w-full flex items-center justify-between text-xs font-bold opacity-80 hover:opacity-100 transition py-1"
                            >
                              <span className="flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                                <span>How It Works & Playstyle</span>
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mt-2 text-xs opacity-90 p-3 rounded-xl bg-black/50 border border-white/10 space-y-2 animate-in fade-in leading-relaxed">
                                <p>{theme.quickRule}</p>
                                <div className="text-[10px] opacity-75 pt-1 border-t border-white/10">
                                  <span className="font-bold text-amber-400">Tactile Feel: </span>
                                  {theme.tactileHighlight}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions: Specs & Host Button */}
                        <div className="space-y-3 pt-3 border-t border-white/10">
                          <div className="flex items-center justify-between text-xs opacity-75">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {g.minPlayers} - {g.maxPlayers} Players
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {g.durationMinutes}
                            </span>
                          </div>

                          {/* High-Affordance Button to Launch Game */}
                          <button
                            disabled={isCreating}
                            onClick={() => handleCreateRoomWithGame(g.id)}
                            className="btn-tactile w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-black/50 flex items-center justify-center gap-1.5"
                          >
                            <Gamepad2 className="w-4 h-4" />
                            <span>
                              {creatingGameId === g.id
                                ? 'Launching...'
                                : `Host ${g.name}`}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                          </button>
                        </div>
                      </div>
                    </Card3DTilt>
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
              <p className="text-sm text-slate-400 max-w-2xl">
                The BoardgameZaa architecture is designed so you can create a new folder under{' '}
                <code className="text-amber-300">src/games/</code>, define your game logic, and it
                immediately becomes playable in the lobby!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="font-bold text-white text-base">Create Game Folder</h3>
                <p className="text-xs text-slate-400">
                  Create <code className="text-amber-300">src/games/my-game/</code> with:{' '}
                  <code className="text-slate-300">index.ts</code>,{' '}
                  <code className="text-slate-300">logic.ts</code>, and{' '}
                  <code className="text-slate-300">MyGameBoard.tsx</code>.
                </p>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 space-y-3">
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

              <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 space-y-3">
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

            {/* Code Template Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-slate-300">
                    src/games/bomb-busters/index.ts (Plugin Schema Specification)
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

      {/* Tabletop Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090e17] px-6 py-6 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-fantasy text-amber-400 font-bold">BoardgameZaa</span>
            <span>• Tabletop Simulation Platform</span>
          </div>
          <div>
            Built with Next.js, Socket.IO, Tailwind CSS & Real Tabletop Passion 🎲
          </div>
        </div>
      </footer>
    </div>
  );
}
