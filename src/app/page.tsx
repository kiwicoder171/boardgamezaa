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
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Card3DTilt } from '@/components/ui/Card3DTilt';
import { useLanguage, LanguageSwitcher } from '@/lib/i18n';

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
  const { t, isThai } = useLanguage();
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    avatar: '🎲',
  });
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [creatingGameId, setCreatingGameId] = useState<string | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [expandedGameRule, setExpandedGameRule] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [selectedHostGame, setSelectedHostGame] = useState<string>('catan');
  const [isDevDocsOpen, setIsDevDocsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const user = getUserProfile();
    setProfile(user);
    setSoundEnabled(soundFX.isEnabled());
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
        if (typeof window !== 'undefined' && data.room) {
          sessionStorage.setItem(`bgz_initial_room_${data.code}`, JSON.stringify(data.room));
        }
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
              {t('freeMultiplayer')}
            </span>
          </div>

          <nav className="flex items-center gap-2">
            {/* Language Switcher */}
            <LanguageSwitcher />

            <button
              onClick={() => {
                const next = !soundEnabled;
                soundFX.setEnabled(next);
                setSoundEnabled(next);
                if (next) soundFX.playClick();
              }}
              className="btn-tactile p-2 rounded-lg bg-[#18191e] hover:bg-[#202228] text-zinc-400 hover:text-white border border-[#272930] transition flex items-center gap-1.5"
              title={soundEnabled ? t('audioMute') : t('audioUnmute')}
              aria-label={soundEnabled ? t('audioMute') : t('audioUnmute')}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-zinc-300" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
            {/* Minimalist Hero Section */}
            <section className="pt-6 sm:pt-10 pb-4 space-y-4 max-w-3xl">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                {t('heroTitle')}
              </h1>
              <p className="text-base text-zinc-400 leading-relaxed">
                {t('heroSubtitle')}
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
                      {t('nickname')}
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      maxLength={18}
                      placeholder={t('nicknamePlaceholder')}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full bg-[#18191e] border border-[#272930] rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>

                {/* Vertical Divider for large screens */}
                <div className="hidden lg:block lg:col-span-1 border-l border-[#222429] h-10 mx-auto" />

                {/* Host & Join Code Actions (6 Cols) */}
                <div className="lg:col-span-6 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                  <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                    <select
                      value={selectedHostGame}
                      onChange={(e) => setSelectedHostGame(e.target.value)}
                      className="bg-[#18191e] border border-[#272930] hover:border-zinc-500 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none cursor-pointer font-medium"
                      title="Select Game to Host"
                    >
                      {games.map((g) => (
                        <option key={g.id} value={g.id} className="bg-[#111215] text-white">
                          {g.icon} {t(`game_${g.id}_name`, g.name)}
                        </option>
                      ))}
                    </select>

                    <button
                      disabled={isCreating}
                      onClick={() => handleCreateRoomWithGame(selectedHostGame)}
                      className="btn-tactile flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer whitespace-nowrap"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{isCreating ? t('creating') : t('hostNewTable')}</span>
                    </button>
                  </div>

                  <form onSubmit={handleJoinRoom} className="flex gap-2 w-full">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder={t('roomCodePlaceholder')}
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-[#18191e] border border-[#272930] rounded-lg px-3 py-2 text-sm text-white font-mono tracking-wider text-center uppercase placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                    />
                    <button
                      type="submit"
                      disabled={!roomCodeInput.trim()}
                      className="btn-tactile px-4 py-2 bg-[#202228] hover:bg-[#282a32] text-white disabled:opacity-30 font-semibold text-xs rounded-lg border border-[#272930] transition cursor-pointer"
                    >
                      {t('joinButton')}
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
                    {t('availableTitles')} ({filteredGames.length})
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {t('exploreSubtitle')}
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {filterTags.map((tag) => {
                    const tagLabel =
                      tag === 'All'
                        ? t('tagAll')
                        : tag === 'Cooperative'
                        ? t('tagCoop')
                        : tag === 'Social Deduction'
                        ? t('tagBluff')
                        : tag === 'Strategy'
                        ? t('tagStrategy')
                        : tag === 'Party'
                        ? t('tagParty')
                        : tag;

                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          soundFX.playClick();
                          setSelectedTag(tag);
                        }}
                        className={`btn-tactile text-xs px-3 py-1 rounded-md transition cursor-pointer ${
                          selectedTag === tag
                            ? 'bg-white text-zinc-950 font-bold'
                            : 'bg-[#141518] text-zinc-400 hover:text-white border border-[#222429]'
                        }`}
                      >
                        {tagLabel}
                      </button>
                    );
                  })}
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
                  const localizedName = t(`game_${g.id}_name`, g.name);
                  const localizedDesc = t(`game_${g.id}_desc`, g.description);
                  const localizedGenre = t(`game_${g.id}_genre`, theme.genre);

                  return (
                    <div
                      key={g.id}
                      className="bg-[#111215] border border-[#222429] hover:border-[#383b44] rounded-2xl p-5 flex flex-col justify-between gap-4 transition duration-150"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-3xl">{g.icon}</span>
                          <span className="text-[11px] font-mono text-zinc-400 border border-[#272930] px-2 py-0.5 rounded-md">
                            {localizedGenre}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-white tracking-tight">
                            {localizedName}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                            {localizedDesc}
                          </p>
                        </div>

                        {/* Quick Rule Accordion */}
                        <div>
                          <button
                            onClick={() => {
                              soundFX.playClick();
                              setExpandedGameRule(isExpanded ? null : g.id);
                            }}
                            className="text-[11px] text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1 font-medium cursor-pointer"
                          >
                            <span>{isExpanded ? t('hideRulesAccordion') : t('howItWorks')}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 text-xs text-zinc-300 p-3 rounded-lg bg-[#18191e] border border-[#272930] leading-relaxed animate-in fade-in">
                              {localizedDesc}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Metadata + Host Button */}
                      <div className="pt-3 border-t border-[#1e2025] flex items-center justify-between">
                        <div className="text-xs text-zinc-500 font-mono flex items-center gap-2">
                          <span>{g.minPlayers}-{g.maxPlayers} {t('players')}</span>
                          <span>•</span>
                          <span>{g.durationMinutes}</span>
                        </div>

                        <button
                          disabled={isCreating}
                          onClick={() => handleCreateRoomWithGame(g.id)}
                          className="btn-tactile px-3.5 py-1.5 bg-[#1f2026] hover:bg-white hover:text-zinc-950 text-white font-semibold text-xs rounded-lg border border-[#2a2c35] transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{creatingGameId === g.id ? t('loading') : t('playBtn')}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  );
                })}
              </div>
            </section>
      </main>


      {/* Minimalist Footer */}
      <footer className="border-t border-[#1e2025] bg-[#090a0c] px-6 py-5 text-center text-xs text-zinc-500 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight">BoardgameZaa</span>
            <span>• Tabletop Simulation Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-500">
            <button
              onClick={() => {
                soundFX.playClick();
                setIsDevDocsOpen(true);
              }}
              className="text-zinc-500 hover:text-zinc-300 transition underline underline-offset-4 cursor-pointer"
            >
              Developer API & Plugin Guide ⚙️
            </button>
            <span>•</span>
            <span>Zero-Latency Realtime 🎲</span>
          </div>
        </div>
      </footer>

      {/* Developer & Extensibility Guide Modal */}
      {isDevDocsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111215] border border-[#222429] rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl max-h-[85vh] flex flex-col text-zinc-200">
            <div className="flex items-center justify-between border-b border-[#222429] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">How to Add Your Own Boardgame</h3>
                  <p className="text-xs text-zinc-500">Modular Plugin Architecture Specification</p>
                </div>
              </div>
              <button
                onClick={() => setIsDevDocsOpen(false)}
                className="p-1.5 rounded-xl bg-[#18191e] border border-[#272930] text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs text-zinc-300 leading-relaxed">
              <p className="text-zinc-400">
                The BoardgameZaa architecture is designed so you can create a new folder under{' '}
                <code className="text-zinc-200 font-mono bg-[#18191e] px-1.5 py-0.5 rounded border border-[#272930]">src/games/</code>, define your game logic, and it immediately becomes playable in the lobby!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#141518] border border-[#272930] rounded-xl p-3 space-y-1.5">
                  <div className="text-[11px] font-mono text-zinc-400 font-bold">01. Create Folder</div>
                  <p className="text-zinc-400 text-[11px]">
                    Create <code className="text-zinc-300 font-mono">src/games/my-game/</code> with index.ts, logic.ts, and MyGameBoard.tsx.
                  </p>
                </div>

                <div className="bg-[#141518] border border-[#272930] rounded-xl p-3 space-y-1.5">
                  <div className="text-[11px] font-mono text-zinc-400 font-bold">02. Game Contract</div>
                  <p className="text-zinc-400 text-[11px]">
                    Implement <code className="text-zinc-300 font-mono">initGame</code>, <code className="text-zinc-300 font-mono">handleAction</code>, and state sanitization.
                  </p>
                </div>

                <div className="bg-[#141518] border border-[#272930] rounded-xl p-3 space-y-1.5">
                  <div className="text-[11px] font-mono text-zinc-400 font-bold">03. Register</div>
                  <p className="text-zinc-400 text-[11px]">
                    Register in <code className="text-zinc-300 font-mono">src/games/registry.ts</code>. Shows up instantly in room lobbies!
                  </p>
                </div>
              </div>

              {/* Code Template Box */}
              <div className="bg-[#141518] border border-[#272930] rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-mono font-semibold">src/games/my-game/index.ts</span>
                </div>
                <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto p-3 bg-[#18191e] border border-[#272930] rounded-lg leading-relaxed">
{`export const myGameDefinition: GameDefinition = {
  id: 'my-game',
  name: 'My Boardgame',
  minPlayers: 2,
  maxPlayers: 4,
  initGame: (players, settings) => initMyGame(players, settings),
  handleAction: (state, action, playerId) => handleMyAction(state, action, playerId),
  sanitizeState: (state, playerId) => sanitizeMyState(state, playerId),
};`}
                </pre>
              </div>
            </div>

            <div className="pt-2 border-t border-[#222429] text-right">
              <button
                onClick={() => setIsDevDocsOpen(false)}
                className="btn-tactile bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs px-5 py-2.5 rounded-xl"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
