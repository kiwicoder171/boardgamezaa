'use client';

import React, { useState } from 'react';
import {
  CardTier,
  DevCard,
  GemColor,
  SplendorAction,
  SplendorPlayer,
  SplendorState,
  TokenType,
} from './types';
import { canAffordCard, getPlayerGemBonuses, getTotalTokens } from './logic';

interface SplendorBoardProps {
  state: SplendorState;
  players: Array<{ id: string; name: string; avatar?: string }>;
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: SplendorAction) => void;
  onReturnToLobby: () => void;
}

// Web Audio sound synthesizer for heavy clay poker chips and royal fanfares
let isSplendorAudioMuted = false;
function playSplendorSfx(type: 'chip' | 'card' | 'noble' | 'gold' | 'win') {
  if (typeof window === 'undefined' || isSplendorAudioMuted) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;

    if (type === 'chip') {
      // Heavy clay chip clack
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'gold') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'card') {
      // Card snap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'noble' || type === 'win') {
      // Royal fanfare
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.25, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.6);
      });
    }
  } catch {
    // AudioContext blocked
  }
}

const GEM_COLORS: GemColor[] = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'];

const GEM_CONFIG: Record<
  TokenType,
  {
    label: string;
    icon: string;
    bg: string;
    border: string;
    text: string;
    chipBg: string;
    cardBg: string;
    cardBorder: string;
    cardAccent: string;
    costPill: string;
    bonusBadge: string;
  }
> = {
  diamond: {
    label: 'Diamond',
    icon: '💎',
    bg: 'bg-zinc-100',
    border: 'border-zinc-300',
    text: 'text-zinc-950',
    chipBg: 'from-zinc-100 to-zinc-300 border-zinc-400 text-zinc-900',
    cardBg: 'bg-[#15161b]',
    cardBorder: 'border-[#262832]',
    cardAccent: 'border-t-zinc-200',
    costPill: 'bg-zinc-100 border border-zinc-300 text-zinc-950 font-bold',
    bonusBadge: 'bg-zinc-100/10 border-zinc-400/40 text-zinc-200',
  },
  sapphire: {
    label: 'Sapphire',
    icon: '🔷',
    bg: 'bg-blue-600',
    border: 'border-blue-400',
    text: 'text-white',
    chipBg: 'from-blue-600 to-blue-800 border-blue-400 text-white',
    cardBg: 'bg-[#15161b]',
    cardBorder: 'border-[#262832]',
    cardAccent: 'border-t-blue-500',
    costPill: 'bg-blue-600 border border-blue-400 text-white font-bold',
    bonusBadge: 'bg-blue-500/15 border-blue-400/40 text-blue-300',
  },
  emerald: {
    label: 'Emerald',
    icon: '🟢',
    bg: 'bg-emerald-600',
    border: 'border-emerald-400',
    text: 'text-white',
    chipBg: 'from-emerald-600 to-emerald-800 border-emerald-400 text-white',
    cardBg: 'bg-[#15161b]',
    cardBorder: 'border-[#262832]',
    cardAccent: 'border-t-emerald-500',
    costPill: 'bg-emerald-600 border border-emerald-400 text-white font-bold',
    bonusBadge: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300',
  },
  ruby: {
    label: 'Ruby',
    icon: '🔴',
    bg: 'bg-rose-600',
    border: 'border-rose-400',
    text: 'text-white',
    chipBg: 'from-rose-600 to-rose-800 border-rose-400 text-white',
    cardBg: 'bg-[#15161b]',
    cardBorder: 'border-[#262832]',
    cardAccent: 'border-t-rose-500',
    costPill: 'bg-rose-600 border border-rose-400 text-white font-bold',
    bonusBadge: 'bg-rose-500/15 border-rose-400/40 text-rose-300',
  },
  onyx: {
    label: 'Onyx',
    icon: '⚫',
    bg: 'bg-zinc-900',
    border: 'border-zinc-500',
    text: 'text-white',
    chipBg: 'from-zinc-800 to-zinc-950 border-zinc-600 text-zinc-100',
    cardBg: 'bg-[#15161b]',
    cardBorder: 'border-[#262832]',
    cardAccent: 'border-t-zinc-400',
    costPill: 'bg-zinc-900 border border-zinc-600 text-zinc-100 font-bold',
    bonusBadge: 'bg-zinc-800 border-zinc-600 text-zinc-200',
  },
  gold: {
    label: 'Gold Joker',
    icon: '🟡',
    bg: 'bg-amber-400',
    border: 'border-amber-300',
    text: 'text-amber-950',
    chipBg: 'from-amber-400 to-amber-600 border-amber-300 text-amber-950',
    cardBg: 'bg-[#15161b]',
    cardBorder: 'border-[#262832]',
    cardAccent: 'border-t-amber-400',
    costPill: 'bg-amber-400 border border-amber-300 text-amber-950 font-bold',
    bonusBadge: 'bg-amber-500/15 border-amber-400/40 text-amber-300',
  },
};

export const SplendorBoard: React.FC<SplendorBoardProps> = ({
  state,
  currentPlayerId,
  isHost,
  onAction,
  onReturnToLobby,
}) => {
  const [selectedTokens, setSelectedTokens] = useState<GemColor[]>([]);
  const [discardSelection, setDiscardSelection] = useState<Partial<Record<TokenType, number>>>({});
  const [showGuide, setShowGuide] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);

  React.useEffect(() => {
    isSplendorAudioMuted = soundMuted;
  }, [soundMuted]);

  const me: SplendorPlayer | undefined = state.players[currentPlayerId];
  const isMyTurn = state.currentTurnPlayerId === currentPlayerId;
  const isDiscardPhase = state.phase === 'discard_tokens' && state.discardingPlayerId === currentPlayerId;
  const myBonuses = me ? getPlayerGemBonuses(me) : { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0 };
  const myTotalTokens = me ? getTotalTokens(me.tokens) : 0;

  // Automated Bot AI Player for Splendor
  React.useEffect(() => {
    if (state.phase !== 'action' && state.phase !== 'discard_tokens') return;
    if (!isHost) return;

    const activeBotId =
      state.phase === 'discard_tokens'
        ? state.discardingPlayerId
        : state.currentTurnPlayerId;

    if (!activeBotId || !activeBotId.startsWith('bot_')) return;

    const timer = setTimeout(() => {
      const bot = state.players[activeBotId];
      if (!bot) return;

      const botAction = (act: any) => onAction({ ...act, _asPlayerId: activeBotId });

      // 1. Handle Token Discard Phase for Bot (if > 10 tokens)
      if (state.phase === 'discard_tokens') {
        const total = getTotalTokens(bot.tokens);
        if (total > 10) {
          let neededToDiscard = total - 10;
          const toDiscard: Partial<Record<TokenType, number>> = {};
          const colorsByCount = (['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as GemColor[])
            .sort((a, b) => (bot.tokens[b] || 0) - (bot.tokens[a] || 0));

          for (const c of colorsByCount) {
            const avail = bot.tokens[c] || 0;
            if (avail > 0 && neededToDiscard > 0) {
              const discardAmount = Math.min(avail, neededToDiscard);
              toDiscard[c] = discardAmount;
              neededToDiscard -= discardAmount;
            }
          }
          if (neededToDiscard > 0 && (bot.tokens.gold || 0) > 0) {
            toDiscard.gold = Math.min(bot.tokens.gold, neededToDiscard);
          }
          botAction({ type: 'discard_tokens', tokens: toDiscard });
        }
        return;
      }

      // 2. Action Phase: Check if bot can buy a card (Market or Reserved)
      const availableCards: DevCard[] = [
        ...bot.reservedCards,
        ...((state.market[3]?.filter(Boolean) || []) as DevCard[]),
        ...((state.market[2]?.filter(Boolean) || []) as DevCard[]),
        ...((state.market[1]?.filter(Boolean) || []) as DevCard[]),
      ];

      const affordableCards = availableCards.filter((c) => canAffordCard(bot, c));

      if (affordableCards.length > 0) {
        // Pick card with highest prestige, or highest tier
        const bestCard = affordableCards.sort((a, b) => {
          if (b.prestige !== a.prestige) return b.prestige - a.prestige;
          return b.tier - a.tier;
        })[0];

        botAction({ type: 'buy_card', cardId: bestCard.id });
        return;
      }

      // 3. Can Bot Reserve a high-prestige Tier 3 card?
      if (bot.reservedCards.length < 3 && (state.bank.gold || 0) > 0) {
        const tier3Cards = (state.market[3]?.filter(Boolean) || []) as DevCard[];
        const highValue = tier3Cards.find((c) => c.prestige >= 4);
        if (highValue && Math.random() < 0.3) {
          botAction({ type: 'reserve_card', cardId: highValue.id });
          return;
        }
      }

      // 4. Take Tokens: Try to take 3 different gem colors or 2 of same color
      const availableGems = (['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as GemColor[])
        .filter((c) => (state.bank[c] || 0) > 0);

      const doubleColor = availableGems.find((c) => (state.bank[c] || 0) >= 4);
      if (doubleColor && (availableGems.length < 3 || Math.random() < 0.35)) {
        botAction({ type: 'take_2_tokens', color: doubleColor });
        return;
      }

      if (availableGems.length >= 3) {
        const chosen = availableGems.slice(0, 3);
        botAction({ type: 'take_3_tokens', colors: [chosen[0], chosen[1], chosen[2]] });
        return;
      }

      if (availableGems.length > 0) {
        botAction({ type: 'take_3_tokens', colors: availableGems as any });
        return;
      }

      // Fallback: reserve any card
      const anyCard = availableCards[0];
      if (anyCard && bot.reservedCards.length < 3) {
        botAction({ type: 'reserve_card', cardId: anyCard.id });
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [state.phase, state.currentTurnPlayerId, state.discardingPlayerId, isHost, state.players, state.market, state.bank, onAction]);


  // Handle Token Selection
  const handleSelectToken = (color: GemColor) => {
    if (!isMyTurn || state.phase !== 'action') return;
    if (state.bank[color] <= 0) return;

    playSplendorSfx('chip');

    // If clicking same color twice when >= 4 available, prepare Take 2
    if (selectedTokens.length === 1 && selectedTokens[0] === color && state.bank[color] >= 4) {
      setSelectedTokens([color, color]);
      return;
    }

    if (selectedTokens.includes(color)) {
      setSelectedTokens(selectedTokens.filter((c) => c !== color));
    } else {
      if (selectedTokens.length < 3) {
        // If already selected 2 of same color, reset to new color
        if (selectedTokens.length === 2 && selectedTokens[0] === selectedTokens[1]) {
          setSelectedTokens([color]);
        } else {
          setSelectedTokens([...selectedTokens, color]);
        }
      }
    }
  };

  const handleConfirmTakeTokens = () => {
    if (selectedTokens.length === 3) {
      playSplendorSfx('chip');
      onAction({
        type: 'take_3_tokens',
        colors: [selectedTokens[0], selectedTokens[1], selectedTokens[2]],
      });
      setSelectedTokens([]);
    } else if (selectedTokens.length === 2 && selectedTokens[0] === selectedTokens[1]) {
      playSplendorSfx('chip');
      onAction({ type: 'take_2_tokens', color: selectedTokens[0] });
      setSelectedTokens([]);
    }
  };

  const handleBuyCard = (card: DevCard) => {
    if (!isMyTurn || state.phase !== 'action') return;
    if (!me || !canAffordCard(me, card)) return;

    playSplendorSfx('card');
    onAction({ type: 'buy_card', cardId: card.id });
  };

  const handleReserveCard = (card: DevCard) => {
    if (!isMyTurn || state.phase !== 'action') return;
    if (!me || me.reservedCards.length >= 3) return;

    playSplendorSfx('gold');
    onAction({ type: 'reserve_card', cardId: card.id });
  };

  const handleConfirmDiscard = () => {
    onAction({ type: 'discard_tokens', tokens: discardSelection });
    setDiscardSelection({});
  };

  return (
    <div className="relative min-h-screen bg-[#090a0c] text-zinc-100 flex flex-col items-center select-none overflow-x-hidden font-sans pb-28">
      {/* Tabletop Dark Carbon Vignette */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 0%, rgba(30, 32, 40, 0.4) 0%, rgba(9, 10, 12, 0.95) 75%)',
        }}
      />

      {/* Header Bar */}
      <header className="relative z-10 w-full max-w-7xl px-4 pt-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#222429] pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#141518] border border-[#272930] flex items-center justify-center text-2xl shadow-sm">
            💎
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Splendor
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#18191e] text-zinc-300 border border-[#272930]">
                {state.expansion === 'cities'
                  ? 'The Cities'
                  : state.expansion === 'orient'
                  ? 'The Orient'
                  : 'Renaissance'}
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Gem Merchant Engine Building</p>
          </div>
        </div>

        {/* Turn Status & Goal */}
        <div
          className={`flex items-center gap-4 bg-[#111215] border border-[#222429] px-4 py-2 rounded-xl shadow-sm ${
            isMyTurn ? 'ring-1 ring-white/20' : ''
          }`}
        >
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Current Turn</span>
            <span
              className={`text-xs font-bold ${
                isMyTurn ? 'text-emerald-400' : 'text-zinc-300'
              }`}
            >
              {isMyTurn ? 'Your Turn' : `${state.players[state.currentTurnPlayerId]?.name}'s Turn`}
            </span>
          </div>

          <div className="h-7 w-px bg-[#272930]" />

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Winning Goal</span>
            <span className="text-xs font-bold text-amber-300">
              {state.expansion === 'cities' ? 'Claim 1 City Tile' : '15 Prestige Points'}
            </span>
          </div>

          {state.finalRoundTriggered && (
            <div className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/40 rounded-lg text-rose-300 text-xs font-bold animate-pulse">
              Final Round 🏁
            </div>
          )}

          <div className="flex items-center gap-1.5 pl-2 border-l border-[#272930]">
            <button
              onClick={() => setShowGuide(true)}
              className="p-1.5 rounded-lg bg-[#18191e] hover:bg-[#22242a] text-zinc-300 border border-[#272930] text-xs font-semibold flex items-center gap-1 transition"
              title="Splendor Rules Guide"
            >
              📖
            </button>
            <button
              onClick={() => setSoundMuted(!soundMuted)}
              className="p-1.5 rounded-lg bg-[#18191e] hover:bg-[#22242a] text-zinc-300 border border-[#272930] text-xs transition"
              title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {soundMuted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={onReturnToLobby}
              className="px-2.5 py-1 bg-[#18191e] hover:bg-[#22242a] text-zinc-300 text-xs font-semibold rounded-lg border border-[#272930] transition"
              title="Return to Room Lobby"
            >
              Lobby
            </button>
          </div>
        </div>
      </header>

      {/* Main Tabletop Area */}
      <main className="relative z-10 w-full max-w-7xl px-4 py-5 flex flex-col lg:flex-row gap-5">
        {/* Left Section: Marketplace & Nobles */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Top Row: Nobles / Cities */}
          <section className="bg-[#111215] border border-[#222429] p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <span>{state.expansion === 'cities' ? '🏛️ City Tiles' : '👑 Noble Patrons'}</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  {state.expansion === 'cities'
                    ? '(Claim 1 to trigger victory)'
                    : '(Visit you when bonus gems match, +3 VP)'}
                </span>
              </h2>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {state.expansion === 'cities' && state.cities
                ? state.cities.map((city) => (
                    <div
                      key={city.id}
                      className="w-36 h-24 rounded-xl bg-[#141518] border border-[#272930] p-2.5 flex flex-col justify-between shadow-xs relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 truncate">{city.name}</span>
                        <span className="text-sm">{city.avatar}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono font-semibold">
                        Req: {city.minPrestige} VP
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(city.requirements).map(([c, count]) => (
                          <span
                            key={c}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              GEM_CONFIG[c as GemColor].costPill
                            }`}
                          >
                            {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                : state.nobles.map((noble) => (
                    <div
                      key={noble.id}
                      className="w-32 h-24 rounded-xl bg-[#141518] border border-[#272930] p-2.5 flex flex-col justify-between shadow-xs hover:border-zinc-500 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-black">
                          +{noble.prestige} VP
                        </span>
                        <span className="text-sm">{noble.avatar}</span>
                      </div>
                      <span className="text-[11px] text-zinc-300 truncate font-semibold">
                        {noble.name}
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {Object.entries(noble.requirements).map(([c, count]) => {
                          const col = c as GemColor;
                          const cfg = GEM_CONFIG[col];
                          return (
                            <div
                              key={c}
                              className={`px-1.5 py-0.5 rounded-md border font-mono text-[10px] font-bold flex items-center gap-0.5 ${cfg.costPill}`}
                            >
                              <span>{cfg.icon}</span>
                              <span>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
            </div>
          </section>

          {/* Development Cards Grid (Tiers 3, 2, 1) */}
          <section className="bg-[#111215] border border-[#222429] p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col gap-4">
            {([3, 2, 1] as CardTier[]).map((tier) => {
              const cards = state.market[tier];
              const orientCards = state.orientMarket ? state.orientMarket[tier] : [];
              const tierName = tier === 3 ? 'Tier III' : tier === 2 ? 'Tier II' : 'Tier I';
              const deckCount = state.decks[tier].length;

              return (
                <div key={tier} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-400 px-0.5">
                    <span className="uppercase tracking-wider flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          tier === 3 ? 'bg-blue-400' : tier === 2 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                      {tierName}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      Deck: {deckCount} cards remaining
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {cards.map((card, idx) => {
                      if (!card) {
                        return (
                          <div
                            key={`empty_${tier}_${idx}`}
                            className="min-h-[160px] rounded-xl border border-dashed border-[#222429] bg-[#141518]/40 flex items-center justify-center text-zinc-600 text-xs font-mono"
                          >
                            Empty
                          </div>
                        );
                      }

                      const canBuy = me ? canAffordCard(me, card) : false;
                      const gemCfg = GEM_CONFIG[card.gemBonus];

                      return (
                        <div
                          key={card.id}
                          className={`group relative rounded-xl bg-[#141518] border ${
                            canBuy && isMyTurn
                              ? 'border-amber-400 ring-1 ring-amber-400/40 shadow-md'
                              : 'border-[#222429] hover:border-zinc-500'
                          } transition-all duration-150 flex flex-col justify-between p-2.5 overflow-hidden min-h-[165px]`}
                        >
                          {/* Top Accent Rim */}
                          <div className={`absolute top-0 left-0 right-0 h-1 ${gemCfg.cardAccent.replace('border-t-', 'bg-')}`} />

                          {/* Card Top: Prestige on left, Gem Bonus on right */}
                          <div className="flex items-center justify-between pt-0.5">
                            <div>
                              {card.prestige > 0 ? (
                                <span className="text-xl sm:text-2xl font-black font-mono text-amber-300 leading-none">
                                  {card.prestige}
                                </span>
                              ) : (
                                <span className="text-xs font-mono text-zinc-700 font-bold select-none">•</span>
                              )}
                            </div>

                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-bold shadow-xs ${gemCfg.bonusBadge}`}>
                              <span>{gemCfg.icon}</span>
                              <span className="font-mono font-black">+1</span>
                            </div>
                          </div>

                          {/* Center Gem Motif Watermark */}
                          <div className="my-auto flex items-center justify-center opacity-10 pointer-events-none select-none text-3xl">
                            {gemCfg.icon}
                          </div>

                          {/* Card Bottom: Gem Costs */}
                          <div className="flex flex-col gap-1.5 mt-auto">
                            <div className="flex flex-wrap gap-1 items-center">
                              {Object.entries(card.cost).map(([c, amount]) => {
                                const color = c as GemColor;
                                const discount = myBonuses[color] || 0;
                                const effectiveCost = Math.max(0, (amount || 0) - discount);
                                const costCfg = GEM_CONFIG[color];
                                const isFree = effectiveCost === 0 && (amount || 0) > 0;

                                return (
                                  <div
                                    key={c}
                                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-0.5 border shadow-xs ${
                                      costCfg.costPill
                                    } ${isFree ? 'opacity-40' : ''}`}
                                    title={`${costCfg.label}: ${amount} (Need to pay: ${effectiveCost})`}
                                  >
                                    <span className="text-[10px] leading-none">{costCfg.icon}</span>
                                    <span className="leading-none">{effectiveCost}</span>
                                    {discount > 0 && effectiveCost > 0 && (
                                      <span className="text-[8px] text-emerald-400 font-normal leading-none">-{discount}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Action Buttons */}
                            {isMyTurn && state.phase === 'action' && (
                              <div className="flex items-center gap-1 pt-1">
                                {canBuy && (
                                  <button
                                    onClick={() => handleBuyCard(card)}
                                    className="flex-1 py-1 px-2 bg-white hover:bg-zinc-200 active:scale-95 text-zinc-950 text-xs font-bold rounded-lg shadow-sm transition"
                                  >
                                    Buy
                                  </button>
                                )}
                                {me && me.reservedCards.length < 3 && (
                                  <button
                                    onClick={() => handleReserveCard(card)}
                                    className="py-1 px-2 bg-[#18191e] hover:bg-[#22242a] text-zinc-300 hover:text-white border border-[#272930] text-xs font-semibold rounded-lg transition"
                                    title="Reserve Card (+1 Gold Joker)"
                                  >
                                    Reserve
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Orient Cards Column (if enabled) */}
                    {state.expansion === 'orient' &&
                      orientCards.map((card) => {
                        if (!card) return null;
                        const canBuy = me ? canAffordCard(me, card) : false;
                        return (
                          <div
                            key={card.id}
                            className={`group relative rounded-xl bg-[#141518] border ${
                              canBuy && isMyTurn ? 'border-amber-400 ring-1 ring-amber-400/40 shadow-md' : 'border-[#222429] hover:border-zinc-500'
                            } p-2.5 flex flex-col justify-between overflow-hidden min-h-[165px]`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xl font-black font-mono text-amber-300 leading-none">
                                {card.prestige > 0 ? card.prestige : '•'}
                              </span>
                              <div className="flex items-center gap-1 bg-[#18191e] border border-[#272930] px-1.5 py-0.5 rounded-md">
                                <span className="text-xs">🏮</span>
                                <span className="text-[10px] font-black text-white font-mono">
                                  {card.bonusCount || 2}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5 mt-auto">
                              <div className="flex flex-wrap gap-1 items-center">
                                {Object.entries(card.cost).map(([c, amount]) => {
                                  const costCfg = GEM_CONFIG[c as GemColor];
                                  return (
                                    <div
                                      key={c}
                                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-0.5 border shadow-xs ${costCfg.costPill}`}
                                    >
                                      <span className="text-[10px] leading-none">{costCfg.icon}</span>
                                      <span className="leading-none">{amount}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {isMyTurn && canBuy && (
                                <button
                                  onClick={() => handleBuyCard(card)}
                                  className="w-full py-1 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold rounded-lg shadow-sm transition"
                                >
                                  Buy 🏮
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* Right Section: Chip Bank & Opponents */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Gem Token Bank */}
          <section className="bg-[#111215] border border-[#222429] p-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <span>🏦 Gem Bank</span>
              </h2>
              <span className="text-[10px] text-zinc-500">Pick 3 diff or 2 same</span>
            </div>

            {/* Chip Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {GEM_COLORS.map((color) => {
                const count = state.bank[color];
                const isSelected = selectedTokens.includes(color);
                const isDoubleSelected =
                  selectedTokens.filter((c) => c === color).length === 2;

                return (
                  <div
                    key={color}
                    onClick={() => handleSelectToken(color)}
                    className={`cursor-pointer group flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                      isDoubleSelected
                        ? 'border-amber-400 bg-amber-500/10 shadow-sm'
                        : isSelected
                        ? 'border-emerald-400 bg-emerald-500/10 shadow-sm'
                        : 'border-[#272930] bg-[#141518] hover:border-zinc-500'
                    }`}
                  >
                    <div
                      className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${
                        GEM_CONFIG[color].chipBg
                      } border-2 flex items-center justify-center shadow-sm transition-transform ${
                        isSelected ? '-translate-y-0.5' : ''
                      }`}
                    >
                      <span className="text-base">{GEM_CONFIG[color].icon}</span>
                      <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#111215] text-white text-[9px] font-mono font-bold border border-[#272930] flex items-center justify-center">
                        {count}
                      </span>
                    </div>

                    <span className="mt-1.5 text-[11px] font-medium text-zinc-300 capitalize">
                      {color}
                    </span>

                    {isSelected && (
                      <span className="text-[9px] text-emerald-400 font-bold mt-0.5">
                        {isDoubleSelected ? 'Take 2' : 'Selected'}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Gold Joker Chip */}
              <div className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-[#272930] bg-[#141518]">
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300 flex items-center justify-center shadow-sm">
                  <span className="text-base">🟡</span>
                  <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#111215] text-amber-300 text-[9px] font-mono font-bold border border-[#272930] flex items-center justify-center">
                    {state.bank.gold}
                  </span>
                </div>
                <span className="mt-1.5 text-[11px] font-medium text-amber-300">Gold Wild</span>
                <span className="text-[9px] text-zinc-500">Reserve Bonus</span>
              </div>
            </div>

            {/* Confirm Take Tokens Button */}
            {isMyTurn && (
              <button
                disabled={!(selectedTokens.length === 3 || (selectedTokens.length === 2 && selectedTokens[0] === selectedTokens[1]))}
                onClick={handleConfirmTakeTokens}
                className={`mt-3.5 w-full py-2 font-bold text-xs rounded-xl shadow-sm transition ${
                  selectedTokens.length === 3 || (selectedTokens.length === 2 && selectedTokens[0] === selectedTokens[1])
                    ? 'btn-tactile bg-white hover:bg-zinc-200 text-zinc-950 cursor-pointer'
                    : 'bg-[#18191e] text-zinc-600 border border-[#272930] cursor-not-allowed'
                }`}
              >
                {selectedTokens.length === 2 && selectedTokens[0] === selectedTokens[1]
                  ? `Take 2 ${selectedTokens[0]} Tokens`
                  : selectedTokens.length === 3
                  ? 'Take 3 Different Tokens'
                  : selectedTokens.length > 0
                  ? `Select ${3 - selectedTokens.length} more`
                  : 'Select 3 Tokens or Double-Click for 2'}
              </button>
            )}
          </section>

          {/* Opponent Merchant Dashboards */}
          <section className="bg-[#111215] border border-[#222429] p-4 rounded-2xl shadow-sm flex flex-col gap-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Other Merchants
            </h2>

            {state.playerOrder
              .filter((id) => id !== currentPlayerId)
              .map((id) => {
                const opp = state.players[id];
                const oppBonuses = getPlayerGemBonuses(opp);
                const oppTokens = getTotalTokens(opp.tokens);
                const isOppTurn = state.currentTurnPlayerId === id;

                return (
                  <div
                    key={id}
                    className={`p-3 rounded-xl bg-[#141518] border flex flex-col gap-2 transition ${
                      isOppTurn ? 'border-amber-400/80 shadow-xs' : 'border-[#272930]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{opp.avatar || '💎'}</span>
                        <span className="text-xs font-bold text-zinc-200">{opp.name}</span>
                        {isOppTurn && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                            Turn
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        {opp.prestige} VP
                      </span>
                    </div>

                    {/* Permanent Discounts */}
                    <div className="flex items-center gap-1 text-[10px]">
                      {GEM_COLORS.map((c) => (
                        <span
                          key={c}
                          className={`w-4 h-4 rounded flex items-center justify-center font-bold ${
                            GEM_CONFIG[c].costPill
                          }`}
                        >
                          {oppBonuses[c] || 0}
                        </span>
                      ))}
                      <span className="ml-auto text-zinc-400 font-mono text-[11px]">
                        🪙 {oppTokens} | 📥 {opp.reservedCards.length}
                      </span>
                    </div>
                  </div>
                );
              })}
          </section>
        </div>
      </main>

      {/* Bottom Sticky Player Dashboard */}
      {me && (
        <footer
          className={`fixed bottom-0 left-0 right-0 z-40 bg-[#111215]/95 border-t px-4 py-3 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto rounded-t-2xl transition ${
            isMyTurn ? 'border-white/20' : 'border-[#222429]'
          }`}
        >
          {/* Player Identity & Prestige */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#18191e] border border-[#272930] flex items-center justify-center text-xl shadow-xs">
              {me.avatar || '💎'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{me.name} (You)</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                  {me.prestige} Prestige Points
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Cards: {me.cards.length} | Nobles: {me.nobles.length} | Reserved: {me.reservedCards.length}/3
              </p>
            </div>
          </div>

          {/* Tokens in Hand & Capacity */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-[#141518] border border-[#222429] px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-400 mr-1">
                Chips ({myTotalTokens}/10):
              </span>
              {(['diamond', 'sapphire', 'emerald', 'ruby', 'onyx', 'gold'] as TokenType[]).map((t) => (
                <div key={t} className="flex items-center gap-0.5">
                  <span className="text-xs">{GEM_CONFIG[t].icon}</span>
                  <span className="text-xs font-bold text-zinc-200 font-mono">{me.tokens[t]}</span>
                </div>
              ))}
            </div>

            {/* Permanent Discounts */}
            <div className="flex items-center gap-1.5 bg-[#141518] border border-[#222429] px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-400 mr-1">Discounts:</span>
              {GEM_COLORS.map((c) => (
                <div
                  key={c}
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shadow-xs ${
                    GEM_CONFIG[c].costPill
                  }`}
                >
                  {myBonuses[c]}
                </div>
              ))}
            </div>
          </div>

          {/* Reserved Cards Drawer */}
          {me.reservedCards.length > 0 && (
            <div className="flex items-center gap-2">
              {me.reservedCards.map((c) => {
                const canBuy = canAffordCard(me, c);
                return (
                  <div
                    key={c.id}
                    className="px-2.5 py-1.5 rounded-xl bg-[#141518] border border-[#272930] flex items-center gap-2 shadow-xs"
                  >
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {c.prestige > 0 ? `${c.prestige} VP` : '+1'}
                    </span>
                    <span className="text-xs">{GEM_CONFIG[c.gemBonus].icon}</span>
                    {isMyTurn && canBuy && (
                      <button
                        onClick={() => handleBuyCard(c)}
                        className="px-2 py-0.5 bg-white hover:bg-zinc-200 text-zinc-950 text-[10px] font-bold rounded shadow-xs"
                      >
                        Buy
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </footer>
      )}

      {/* Discard Tokens Modal */}
      {isDiscardPhase && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111215] border border-[#222429] p-6 rounded-2xl max-w-md w-full shadow-2xl text-center">
            <h3 className="text-base font-bold text-rose-400 mb-1">Token Limit Exceeded</h3>
            <p className="text-xs text-zinc-400 mb-4">
              You hold {myTotalTokens} tokens. Return tokens to the bank until you hold at most 10.
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {(['diamond', 'sapphire', 'emerald', 'ruby', 'onyx', 'gold'] as TokenType[]).map((t) => {
                const selectedToDiscard = discardSelection[t] || 0;
                return (
                  <div key={t} className="p-2.5 bg-[#141518] rounded-xl border border-[#272930] flex flex-col items-center">
                    <span className="text-lg">{GEM_CONFIG[t].icon}</span>
                    <span className="text-xs font-bold text-zinc-300 mt-1 font-mono">
                      Hold: {me?.tokens[t]}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() =>
                          setDiscardSelection({
                            ...discardSelection,
                            [t]: Math.max(0, selectedToDiscard - 1),
                          })
                        }
                        className="w-5 h-5 rounded bg-[#18191e] border border-[#272930] text-white font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-rose-400 font-mono">{selectedToDiscard}</span>
                      <button
                        onClick={() => {
                          if ((me?.tokens[t] || 0) > selectedToDiscard) {
                            setDiscardSelection({
                              ...discardSelection,
                              [t]: selectedToDiscard + 1,
                            });
                          }
                        }}
                        className="w-5 h-5 rounded bg-[#18191e] border border-[#272930] text-white font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleConfirmDiscard}
              className="w-full py-2.5 btn-tactile bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-xl shadow-sm transition"
            >
              Confirm Discard
            </button>
          </div>
        </div>
      )}

      {/* Game Over Celebration Modal */}
      {state.phase === 'game_over' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111215] border border-[#222429] p-6 sm:p-8 rounded-2xl max-w-lg w-full text-center shadow-2xl flex flex-col items-center">
            <span className="text-5xl mb-3">🏆</span>
            <h2 className="text-2xl font-bold text-white mb-1.5">
              Merchant Victorious!
            </h2>
            <p className="text-xs text-zinc-400 mb-5">{state.winReason}</p>

            <div className="w-full flex flex-col gap-2 mb-6">
              {state.playerOrder.map((id) => {
                const p = state.players[id];
                const isWinner = id === state.winner;
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isWinner
                        ? 'border-amber-400/80 bg-amber-500/10 font-bold'
                        : 'border-[#272930] bg-[#141518]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{p.avatar || '💎'}</span>
                      <span className="text-sm text-zinc-200">{p.name}</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-amber-300">
                      {p.prestige} Prestige Points
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => onAction({ type: 'reset_game' })}
                className="flex-1 sm:flex-initial px-6 py-2.5 btn-tactile bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-xl shadow-sm transition"
              >
                Play Again
              </button>
              {onReturnToLobby && (
                <button
                  onClick={onReturnToLobby}
                  className="flex-1 sm:flex-initial px-6 py-2.5 btn-tactile bg-[#18191e] hover:bg-[#22242a] text-zinc-300 border border-[#272930] font-semibold text-xs rounded-xl transition"
                >
                  Return to Lobby
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENAISSANCE MERCHANT RULES GUIDE MODAL */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111215] border border-[#222429] rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col text-zinc-200 font-sans">
            <div className="flex items-center justify-between border-b border-[#222429] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">💎</span>
                <div>
                  <h3 className="text-base font-bold text-white">Splendor Merchant Rules</h3>
                  <div className="text-xs text-zinc-400">Gem Trading & Engine Building Guide</div>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-xl bg-[#18191e] hover:bg-[#22242a] text-zinc-400 hover:text-white border border-[#272930] transition"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3.5 pr-1 text-xs text-zinc-300 leading-relaxed">
              <div className="p-3 bg-[#141518] border border-[#272930] rounded-xl text-zinc-300">
                <strong className="text-white">Objective:</strong> Gather gemstone tokens, acquire development cards for permanent discounts, attract noble visits, and be the first to reach 15 prestige points!
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">🪙 Taking Gem Tokens</h4>
                <p className="text-zinc-400">
                  On your turn, choose 1 token action:
                  <br />• Take <strong>3 tokens of different colors</strong>.
                  <br />• Take <strong>2 tokens of the same color</strong> (if that stack has at least 4 tokens).
                  <br />• Hand limit: You can hold at most <strong>10 tokens</strong> at the end of your turn.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sky-300 uppercase tracking-wider text-[11px]">🃏 Purchasing Cards</h4>
                <p className="text-zinc-400">
                  Spend tokens matching the card cost. Each card you own grants a <strong>permanent gem discount</strong> on all future purchases!
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">🟡 Reserving Cards & Gold Wildcards</h4>
                <p className="text-zinc-400">
                  Reserve 1 card into your hand (max 3 reserved). You also take <strong>1 Gold Joker token</strong> from the bank (acts as any color)!
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-purple-300 uppercase tracking-wider text-[11px]">👑 Noble Patrons (+3 VP)</h4>
                <p className="text-zinc-400">
                  Nobles visit automatically as soon as your permanent card bonuses fulfill their requirements.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#222429] text-right">
              <button
                onClick={() => setShowGuide(false)}
                className="px-5 py-2 rounded-xl btn-tactile bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplendorBoard;
