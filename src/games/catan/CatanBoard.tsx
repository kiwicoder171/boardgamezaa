'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '@/types/game';
import {
  CatanAction,
  CatanState,
  DevCardType,
  ResourceCount,
  ResourceType,
  TerrainType,
} from './types';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BUILDING_COSTS,
  HEX_RADIUS,
} from './boardData';
import {
  canAfford,
  emptyResources,
  getBotAction,
  isValidRoadPlacement,
  isValidSettlementPlacement,
  totalResourceCount,
} from './logic';
import { useTranslation } from '@/lib/i18n';
import { soundFX } from '@/lib/sounds';

interface CatanBoardProps {
  state: CatanState;
  players: Player[];
  currentPlayerId: string;
  isHost: boolean;
  onAction: (action: CatanAction) => void;
  onReturnToLobby: () => void;
}

const RESOURCE_THEMES: Record<
  ResourceType,
  { label: string; labelTh: string; color: string; bg: string; icon: string }
> = {
  wood: { label: 'Lumber', labelTh: 'ไม้', color: '#15803d', bg: 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300', icon: '🌲' },
  brick: { label: 'Brick', labelTh: 'อิฐ', color: '#b45309', bg: 'bg-amber-950/80 border-amber-700/60 text-amber-300', icon: '🧱' },
  sheep: { label: 'Wool', labelTh: 'ขนแกะ', color: '#84cc16', bg: 'bg-lime-950/80 border-lime-700/60 text-lime-300', icon: '🐑' },
  wheat: { label: 'Grain', labelTh: 'ข้าวสาลี', color: '#eab308', bg: 'bg-yellow-950/80 border-yellow-700/60 text-yellow-300', icon: '🌾' },
  ore: { label: 'Ore', labelTh: 'แร่หิน', color: '#64748b', bg: 'bg-slate-900/80 border-slate-600/60 text-slate-300', icon: '🪨' },
};

const TERRAIN_COLORS: Record<TerrainType, { fill: string; stroke: string; icon: string }> = {
  forest: { fill: 'url(#forestGrad)', stroke: '#14532d', icon: '🌲' },
  pasture: { fill: 'url(#pastureGrad)', stroke: '#4d7c0f', icon: '🐑' },
  fields: { fill: 'url(#fieldsGrad)', stroke: '#ca8a04', icon: '🌾' },
  hills: { fill: 'url(#hillsGrad)', stroke: '#9a3412', icon: '🧱' },
  mountains: { fill: 'url(#mountainsGrad)', stroke: '#334155', icon: '⛰️' },
  desert: { fill: 'url(#desertGrad)', stroke: '#78350f', icon: '🏜️' },
};

export default function CatanBoard({
  state,
  players,
  currentPlayerId,
  isHost,
  onAction,
  onReturnToLobby,
}: CatanBoardProps) {
  const { language } = useTranslation();
  const isTh = language === 'th';

  const [activeMode, setActiveMode] = useState<
    'none' | 'build_road' | 'build_settlement' | 'upgrade_city' | 'move_robber'
  >('none');
  const [showTradeModal, setShowTradeModal] = useState<'bank' | 'domestic' | null>(null);
  const [bankGiveRes, setBankGiveRes] = useState<ResourceType>('wood');
  const [bankGetRes, setBankGetRes] = useState<ResourceType>('brick');
  const [domesticOffer, setDomesticOffer] = useState<ResourceCount>(emptyResources());
  const [domesticRequest, setDomesticRequest] = useState<ResourceCount>(emptyResources());
  const [selectedCardsToDiscard, setSelectedCardsToDiscard] = useState<ResourceCount>(emptyResources());
  const [pendingRobberHex, setPendingRobberHex] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const me = state.players[currentPlayerId];
  const isMyTurn = state.currentTurnPlayerId === currentPlayerId;
  const currentTurnPlayer = state.players[state.currentTurnPlayerId];

  // Auto trigger bot moves if host
  useEffect(() => {
    if (!isHost) return;
    const activePid = state.currentTurnPlayerId;
    if (activePid && activePid.startsWith('bot_')) {
      const timer = setTimeout(() => {
        // Dispatch bot action via _asPlayerId wrapper handled by server roomManager
        const botAction = getBotAction(state, activePid);
        if (botAction) {
          onAction({ ...botAction, _asPlayerId: activePid } as any);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [state, isHost, onAction]);

  // Handle dice rolling animation
  const handleRollDice = () => {
    if (!isMyTurn || state.turnStep !== 'roll' || isRolling) return;
    setIsRolling(true);
    soundFX.playTileClack();
    setTimeout(() => {
      onAction({ type: 'ROLL_DICE' });
      setIsRolling(false);
    }, 700);
  };

  // Best harbor trade ratio for a given resource for current player
  const getBestTradeRatio = (res: ResourceType): number => {
    if (!me) return 4;
    let best = 4;
    for (const v of state.vertices) {
      if (v.building && v.building.playerId === currentPlayerId && v.harbor) {
        if (v.harbor.type === 'generic') best = Math.min(best, 3);
        if (v.harbor.type === res) best = Math.min(best, 2);
      }
    }
    return best;
  };

  // Handle Vertex Click
  const handleVertexClick = (vertexId: number) => {
    if (!isMyTurn) return;

    if (state.phase === 'setup_round_1' || state.phase === 'setup_round_2') {
      if (state.activeSetupStep === 'settlement') {
        const check = isValidSettlementPlacement(state, vertexId, currentPlayerId, true);
        if (check.valid) {
          soundFX.playTileClack();
          onAction({ type: 'BUILD_INITIAL_SETTLEMENT', vertexId });
        }
      }
      return;
    }

    if (activeMode === 'build_settlement') {
      const check = isValidSettlementPlacement(state, vertexId, currentPlayerId, false);
      if (check.valid && canAfford(me.resources, BUILDING_COSTS.settlement)) {
        soundFX.playTileClack();
        onAction({ type: 'BUILD_SETTLEMENT', vertexId });
        setActiveMode('none');
      }
    } else if (activeMode === 'upgrade_city') {
      const v = state.vertices[vertexId];
      if (
        v.building &&
        v.building.playerId === currentPlayerId &&
        v.building.type === 'settlement' &&
        canAfford(me.resources, BUILDING_COSTS.city)
      ) {
        soundFX.playTileClack();
        onAction({ type: 'UPGRADE_CITY', vertexId });
        setActiveMode('none');
      }
    }
  };

  // Handle Edge Click
  const handleEdgeClick = (edgeId: number) => {
    if (!isMyTurn) return;

    if (state.phase === 'setup_round_1' || state.phase === 'setup_round_2') {
      if (state.activeSetupStep === 'road') {
        // Find latest settlement placed
        const playerSettlements = state.vertices.filter(
          (v) => v.building && v.building.playerId === currentPlayerId
        );
        const latest = playerSettlements[playerSettlements.length - 1];
        const check = isValidRoadPlacement(state, edgeId, currentPlayerId, true, latest?.id);
        if (check.valid) {
          soundFX.playTileClack();
          onAction({ type: 'BUILD_INITIAL_ROAD', edgeId });
        }
      }
      return;
    }

    if (activeMode === 'build_road') {
      const isFree = (state.roadBuildingRemaining || 0) > 0;
      const check = isValidRoadPlacement(state, edgeId, currentPlayerId, false);
      if (check.valid && (isFree || canAfford(me.resources, BUILDING_COSTS.road))) {
        soundFX.playTileClack();
        onAction({ type: 'BUILD_ROAD', edgeId });
        if (!isFree || state.roadBuildingRemaining === 1) {
          setActiveMode('none');
        }
      }
    }
  };

  // Handle Hex Click (Moving Robber)
  const handleHexClick = (hexId: number) => {
    if (state.phase !== 'moving_robber' || !isMyTurn) return;
    if (hexId === state.robberHexId) return;

    const targetHex = state.hexes[hexId];
    // Find candidate victim players
    const victims = new Set<string>();
    targetHex.vertices.forEach((vId) => {
      const v = state.vertices[vId];
      if (v.building && v.building.playerId !== currentPlayerId) {
        victims.add(v.building.playerId);
      }
    });

    if (victims.size === 0) {
      soundFX.playTileClack();
      onAction({ type: 'MOVE_ROBBER', hexId });
    } else if (victims.size === 1) {
      soundFX.playTileClack();
      onAction({ type: 'MOVE_ROBBER', hexId, targetPlayerId: Array.from(victims)[0] });
    } else {
      // Multiple victims: show selection
      setPendingRobberHex(hexId);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#07090e] text-slate-100 flex flex-col items-center justify-between p-2 sm:p-4 select-none overflow-x-hidden">
      {/* SVG Definitions */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <radialGradient id="forestGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1e5828" />
            <stop offset="70%" stopColor="#14431e" />
            <stop offset="100%" stopColor="#0b2812" />
          </radialGradient>
          <radialGradient id="pastureGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#65a30d" />
            <stop offset="70%" stopColor="#4d7c0f" />
            <stop offset="100%" stopColor="#2c4d05" />
          </radialGradient>
          <radialGradient id="fieldsGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#854d0e" />
          </radialGradient>
          <radialGradient id="hillsGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="70%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </radialGradient>
          <radialGradient id="mountainsGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </radialGradient>
          <radialGradient id="desertGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="70%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>
          <filter id="feltShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.6" />
          </filter>
        </defs>
      </svg>

      {/* Top Header Bar */}
      <header className="w-full max-w-7xl flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner">
            🏝️
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-wide bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {isTh ? 'CATAN • ผู้บุกเบิกแห่งคาทาน' : 'CATAN • Settlers of Catan'}
            </h1>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>{isTh ? 'เป้าหมาย 10 คะแนน' : 'Goal: 10 Victory Points'}</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">
                {state.phase === 'setup_round_1'
                  ? isTh ? 'รอบตั้งถิ่นฐาน 1/2' : 'Setup Round 1/2'
                  : state.phase === 'setup_round_2'
                  ? isTh ? 'รอบตั้งถิ่นฐาน 2/2' : 'Setup Round 2/2'
                  : isTh ? 'การเล่นหลัก' : 'Main Match'}
              </span>
            </div>
          </div>
        </div>

        {/* Turn Indicator & Achievements */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
            <div
              className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20 animate-pulse"
              style={{ backgroundColor: currentTurnPlayer?.color || '#fff' }}
            />
            <span className="font-semibold text-slate-200">
              {currentTurnPlayer?.name}
              {isMyTurn && <span className="text-amber-400 ml-1">({isTh ? 'ตาคุณ!' : 'You!'})</span>}
            </span>
          </div>

          {/* Longest Road & Largest Army Badges */}
          <div className="hidden md:flex items-center gap-2">
            <div
              className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 ${
                state.longestRoad.playerId
                  ? 'bg-amber-950/60 border-amber-600/50 text-amber-300'
                  : 'bg-slate-800/40 border-slate-700/40 text-slate-500'
              }`}
              title={isTh ? 'ถนนสายยาวที่สุด (+2 คะแนน)' : 'Longest Road (+2 VP)'}
            >
              <span>🛣️</span>
              <span>
                {state.longestRoad.playerId
                  ? `${state.players[state.longestRoad.playerId]?.name} (${state.longestRoad.length})`
                  : isTh ? 'ถนนยาวสุด (5+)' : 'Longest Road (5+)'}
              </span>
            </div>

            <div
              className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 ${
                state.largestArmy.playerId
                  ? 'bg-red-950/60 border-red-600/50 text-red-300'
                  : 'bg-slate-800/40 border-slate-700/40 text-slate-500'
              }`}
              title={isTh ? 'กองทัพที่ยิ่งใหญ่ที่สุด (+2 คะแนน)' : 'Largest Army (+2 VP)'}
            >
              <span>⚔️</span>
              <span>
                {state.largestArmy.playerId
                  ? `${state.players[state.largestArmy.playerId]?.name} (${state.largestArmy.count})`
                  : isTh ? 'กองทัพใหญ่สุด (3+)' : 'Largest Army (3+)'}
              </span>
            </div>
          </div>

          {isHost && (
            <button
              onClick={onReturnToLobby}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
            >
              {isTh ? 'กลับห้องล็อบบี้' : 'Lobby'}
            </button>
          )}
        </div>
      </header>

      {/* Main Tabletop Arena */}
      <main className="w-full max-w-7xl flex-1 flex flex-col lg:flex-row items-center justify-center gap-4 py-2 relative">
        {/* Left Side / Top on Mobile: Player Scorecards */}
        <aside className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 shrink-0 z-10">
          {state.turnOrder.map((pid) => {
            const p = state.players[pid];
            const isTurn = pid === state.currentTurnPlayerId;
            const isMe = pid === currentPlayerId;
            const resCount = totalResourceCount(p.resources);
            return (
              <div
                key={pid}
                className={`flex-1 lg:flex-none p-3 rounded-2xl border transition-all duration-200 shadow-md ${
                  isTurn
                    ? 'bg-slate-800/90 border-amber-500/70 shadow-amber-500/10'
                    : 'bg-slate-900/60 border-slate-800'
                } ${isMe ? 'ring-1 ring-white/20' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-bold text-sm text-slate-100 truncate">
                      {p.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-amber-300">
                        {isTh ? 'ฉัน' : 'ME'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 font-black text-amber-400 text-sm">
                    <span>⭐</span>
                    <span>{p.victoryPoints}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 mt-2 text-[11px] text-slate-400">
                  <div className="flex flex-col items-center bg-slate-950/40 py-1 rounded">
                    <span>🎴</span>
                    <span className="font-mono text-slate-200">{resCount}</span>
                  </div>
                  <div className="flex flex-col items-center bg-slate-950/40 py-1 rounded">
                    <span>🏠</span>
                    <span className="font-mono text-slate-200">{p.settlementsCount}</span>
                  </div>
                  <div className="flex flex-col items-center bg-slate-950/40 py-1 rounded">
                    <span>🏰</span>
                    <span className="font-mono text-slate-200">{p.citiesCount}</span>
                  </div>
                  <div className="flex flex-col items-center bg-slate-950/40 py-1 rounded">
                    <span>🛣️</span>
                    <span className="font-mono text-slate-200">{p.roadsCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </aside>

        {/* Center: The Hexagonal Board */}
        <div className="relative flex items-center justify-center max-w-full overflow-hidden p-2">
          {/* Sea Ring Container */}
          <div className="relative rounded-[40px] bg-[#0c2340] border-4 border-[#163860] shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-2 sm:p-4">
            <svg
              viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
              className="w-[340px] sm:w-[480px] md:w-[580px] lg:w-[640px] xl:w-[680px] h-auto select-none"
            >
              {/* Harbors (Pier connections & badges) */}
              {state.vertices.map((v) => {
                if (!v.harbor) return null;
                return (
                  <g key={`harbor-node-${v.id}`}>
                    <circle
                      cx={v.x}
                      cy={v.y}
                      r={14}
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="3 2"
                      opacity={0.8}
                    />
                  </g>
                );
              })}

              {/* Hexagonal Tiles */}
              {state.hexes.map((hex) => {
                const isRobberHere = state.robberHexId === hex.id;
                const canMoveRobberHere =
                  state.phase === 'moving_robber' && isMyTurn && hex.id !== state.robberHexId;

                // Build SVG polygon points for hex
                const pts = hex.vertices
                  .map((vId) => {
                    const v = state.vertices[vId];
                    return `${v.x},${v.y}`;
                  })
                  .join(' ');

                const theme = TERRAIN_COLORS[hex.terrain];

                return (
                  <g
                    key={`hex-${hex.id}`}
                    onClick={() => canMoveRobberHere && handleHexClick(hex.id)}
                    className={canMoveRobberHere ? 'cursor-pointer hover:opacity-90' : ''}
                  >
                    {/* Hex Base Polygon */}
                    <polygon
                      points={pts}
                      fill={theme.fill}
                      stroke={theme.stroke}
                      strokeWidth={3}
                      className="transition-colors duration-150"
                    />

                    {/* Terrain Texture & Center Emblem */}
                    <text
                      x={hex.x}
                      y={hex.y - 14}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={26}
                      className="pointer-events-none drop-shadow"
                    >
                      {theme.icon}
                    </text>

                    {/* Number Token / Chit (if not desert) */}
                    {hex.number !== null && (
                      <g className="pointer-events-none">
                        <circle
                          cx={hex.x}
                          cy={hex.y + 12}
                          r={17}
                          fill="#fef3c7"
                          stroke="#78350f"
                          strokeWidth={2}
                          filter="url(#feltShadow)"
                        />
                        <text
                          x={hex.x}
                          y={hex.y + 11}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={16}
                          fontWeight="bold"
                          fill={hex.number === 6 || hex.number === 8 ? '#dc2626' : '#1e293b'}
                        >
                          {hex.number}
                        </text>
                        {/* Probability Dots */}
                        <g transform={`translate(${hex.x - (hex.pips * 4) / 2 + 2}, ${hex.y + 21})`}>
                          {Array.from({ length: hex.pips }).map((_, pipIdx) => (
                            <circle
                              key={pipIdx}
                              cx={pipIdx * 4}
                              cy={0}
                              r={1.3}
                              fill={hex.number === 6 || hex.number === 8 ? '#dc2626' : '#475569'}
                            />
                          ))}
                        </g>
                      </g>
                    )}

                    {/* The Robber Figurine */}
                    {isRobberHere && (
                      <g transform={`translate(${hex.x}, ${hex.y})`} className="pointer-events-none">
                        <circle cx={0} cy={0} r={20} fill="#18181b" stroke="#ef4444" strokeWidth={2.5} />
                        <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={18}>
                          🥷
                        </text>
                      </g>
                    )}

                    {/* Robber Target Indicator */}
                    {canMoveRobberHere && (
                      <circle
                        cx={hex.x}
                        cy={hex.y}
                        r={26}
                        fill="rgba(239, 68, 68, 0.25)"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        className="animate-pulse"
                      />
                    )}
                  </g>
                );
              })}

              {/* Road Edges */}
              {state.edges.map((edge) => {
                const v1 = state.vertices[edge.vertices[0]];
                const v2 = state.vertices[edge.vertices[1]];
                const hasRoad = !!edge.road;
                const roadOwner = hasRoad ? state.players[edge.road!.playerId] : null;

                const isSetupRoadStep =
                  (state.phase === 'setup_round_1' || state.phase === 'setup_round_2') &&
                  state.activeSetupStep === 'road' &&
                  isMyTurn;

                const isMainGameRoadStep = activeMode === 'build_road' && isMyTurn;
                const isClickable = !hasRoad && (isSetupRoadStep || isMainGameRoadStep);

                return (
                  <g
                    key={`edge-${edge.id}`}
                    onClick={() => isClickable && handleEdgeClick(edge.id)}
                    className={isClickable ? 'cursor-pointer' : ''}
                  >
                    {/* Broad Click Hit-Area */}
                    <line
                      x1={v1.x}
                      y1={v1.y}
                      x2={v2.x}
                      y2={v2.y}
                      stroke="transparent"
                      strokeWidth={20}
                    />

                    {/* Built Road Bar */}
                    {hasRoad && roadOwner && (
                      <line
                        x1={v1.x}
                        y1={v1.y}
                        x2={v2.x}
                        y2={v2.y}
                        stroke={roadOwner.color}
                        strokeWidth={7}
                        strokeLinecap="round"
                        filter="url(#feltShadow)"
                      />
                    )}

                    {/* Placement Hint Outline */}
                    {isClickable && (
                      <line
                        x1={v1.x}
                        y1={v1.y}
                        x2={v2.x}
                        y2={v2.y}
                        stroke="#38bdf8"
                        strokeWidth={5}
                        strokeLinecap="round"
                        strokeDasharray="6 4"
                        className="animate-pulse hover:stroke-amber-400"
                        opacity={0.8}
                      />
                    )}
                  </g>
                );
              })}

              {/* Vertices (Settlements / Cities / Interactive Sockets) */}
              {state.vertices.map((vertex) => {
                const hasBuilding = !!vertex.building;
                const buildingOwner = hasBuilding
                  ? state.players[vertex.building!.playerId]
                  : null;

                const isSetupSettleStep =
                  (state.phase === 'setup_round_1' || state.phase === 'setup_round_2') &&
                  state.activeSetupStep === 'settlement' &&
                  isMyTurn;

                const isMainSettleStep = activeMode === 'build_settlement' && isMyTurn;
                const isCityUpgradeStep =
                  activeMode === 'upgrade_city' &&
                  isMyTurn &&
                  hasBuilding &&
                  vertex.building!.playerId === currentPlayerId &&
                  vertex.building!.type === 'settlement';

                const isClickable =
                  (!hasBuilding && (isSetupSettleStep || isMainSettleStep)) || isCityUpgradeStep;

                return (
                  <g
                    key={`vertex-${vertex.id}`}
                    onClick={() => isClickable && handleVertexClick(vertex.id)}
                    className={isClickable ? 'cursor-pointer' : ''}
                  >
                    {/* Broad Click Hit-Area */}
                    <circle cx={vertex.x} cy={vertex.y} r={18} fill="transparent" />

                    {/* Built Settlement House */}
                    {hasBuilding && vertex.building!.type === 'settlement' && buildingOwner && (
                      <g transform={`translate(${vertex.x}, ${vertex.y})`}>
                        <rect
                          x={-8}
                          y={-6}
                          width={16}
                          height={14}
                          fill={buildingOwner.color}
                          stroke="#0f172a"
                          strokeWidth={2}
                          rx={2}
                          filter="url(#feltShadow)"
                        />
                        {/* Gabled roof */}
                        <polygon
                          points="0,-14 9,-6 -9,-6"
                          fill={buildingOwner.color}
                          stroke="#0f172a"
                          strokeWidth={1.5}
                        />
                      </g>
                    )}

                    {/* Built City Castle / Cathedral */}
                    {hasBuilding && vertex.building!.type === 'city' && buildingOwner && (
                      <g transform={`translate(${vertex.x}, ${vertex.y})`}>
                        <rect
                          x={-11}
                          y={-8}
                          width={22}
                          height={17}
                          fill={buildingOwner.color}
                          stroke="#0f172a"
                          strokeWidth={2}
                          rx={3}
                          filter="url(#feltShadow)"
                        />
                        <polygon points="-11,-8 -6,-15 -1,-8" fill={buildingOwner.color} stroke="#0f172a" strokeWidth={1.5} />
                        <polygon points="1,-8 6,-15 11,-8" fill={buildingOwner.color} stroke="#0f172a" strokeWidth={1.5} />
                      </g>
                    )}

                    {/* Clickable Sockets */}
                    {isClickable && (
                      <circle
                        cx={vertex.x}
                        cy={vertex.y}
                        r={10}
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth={2.5}
                        className="animate-ping opacity-75"
                      />
                    )}
                    {isClickable && (
                      <circle
                        cx={vertex.x}
                        cy={vertex.y}
                        r={8}
                        fill="#0284c7"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="hover:fill-amber-400"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Side / Log Feed */}
        <aside className="w-full lg:w-72 flex flex-col gap-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-3 max-h-[380px] lg:max-h-[560px] overflow-hidden shrink-0 z-10 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-bold text-slate-400">
            <span>📜 {isTh ? 'บันทึกเหตุการณ์' : 'CHRONICLE LOG'}</span>
            <span className="text-[10px] text-slate-500">{state.logs.length} events</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
            {state.logs.map((log) => (
              <div
                key={log.id}
                className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-slate-300 leading-snug"
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5">
                  <span>
                    {log.type === 'roll' ? '🎲' : log.type === 'build' ? '🔨' : log.type === 'trade' ? '🤝' : log.type === 'robber' ? '🥷' : 'ℹ️'}
                  </span>
                  <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <div>{isTh && log.textTh ? log.textTh : log.text}</div>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {/* Bottom Player Dashboard & Control Dock */}
      <footer className="w-full max-w-7xl bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-2xl flex flex-col gap-3 z-20">
        {/* Top Tier: Hand Resources & Development Cards */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 5 Resources Hand */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 mr-1 hidden sm:inline">
              {isTh ? 'คลังทรัพยากร:' : 'RESOURCES:'}
            </span>
            {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map((res) => {
              const count = me?.resources[res] || 0;
              const theme = RESOURCE_THEMES[res];
              return (
                <div
                  key={res}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold shadow-inner ${theme.bg}`}
                >
                  <span>{theme.icon}</span>
                  <span className="hidden md:inline font-medium text-xs">
                    {isTh ? theme.labelTh : theme.label}
                  </span>
                  <span className="bg-black/30 px-1.5 py-0.5 rounded text-white font-mono text-xs">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Development Cards Hand */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400 font-semibold">
              <span>🃏 {isTh ? 'การ์ดพัฒนา:' : 'DEV CARDS:'} </span>
              <span className="text-amber-300 font-mono font-bold">
                {me?.devCards.length || 0}
              </span>
            </div>
            {me?.devCards && me.devCards.length > 0 && isMyTurn && state.phase === 'main_game' && (
              <div className="flex items-center gap-1">
                {me.devCards.map((card, idx) => {
                  if (card === 'victory_point') return null; // VP cards kept secret
                  return (
                    <button
                      key={idx}
                      onClick={() => onAction({ type: 'PLAY_DEV_CARD', card })}
                      className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition shadow"
                    >
                      {card === 'knight'
                        ? '⚔️ Knight'
                        : card === 'road_building'
                        ? '🛣️ Roads'
                        : card === 'year_of_plenty'
                        ? '🌾 Plenty'
                        : '👑 Monopoly'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Tier: Turn Actions / Build Menu */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          {/* Action State / Guide Hint */}
          <div className="text-xs text-slate-300">
            {state.phase === 'setup_round_1' || state.phase === 'setup_round_2' ? (
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">
                  {state.activeSetupStep === 'settlement'
                    ? isTh ? '👉 คลิกจุดมุมบนเกาะเพื่อตั้งถิ่นฐาน' : '👉 Click any available corner vertex to place Settlement'
                    : isTh ? '👉 คลิกเส้นทางเชื่อมต่อเพื่อวางถนน' : '👉 Click an adjoining path edge to place Road'}
                </span>
              </div>
            ) : state.phase === 'moving_robber' ? (
              <span className="text-red-400 font-bold animate-pulse">
                {isTh ? '🥷 คลิกพื้นที่เพื่อย้ายโจรและปล้นการ์ด' : '🥷 Click a terrain hex to move the Robber and steal'}
              </span>
            ) : isMyTurn ? (
              state.turnStep === 'roll' ? (
                <span className="text-amber-400 font-bold animate-pulse">
                  {isTh ? '🎲 ถึงตาคุณ! ทอยลูกเต๋าเพื่อเก็บเกี่ยวผลผลิต' : '🎲 Your turn! Roll the dice to harvest resources.'}
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold">
                  {isTh ? '✨ เลือกสร้าง แลกเปลี่ยน หรือจบตา' : '✨ Build, Trade, or End Turn.'}
                </span>
              )
            ) : (
              <span className="text-slate-500">
                {isTh
                  ? `รอ ${currentTurnPlayer?.name} กำลังเล่น...`
                  : `Waiting for ${currentTurnPlayer?.name}...`}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Roll Dice Button */}
            {isMyTurn && state.phase === 'main_game' && state.turnStep === 'roll' && (
              <button
                onClick={handleRollDice}
                disabled={isRolling}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-2"
              >
                <span className="text-lg">🎲</span>
                <span>{isRolling ? (isTh ? 'กำลังทอย...' : 'Rolling...') : (isTh ? 'ทอยลูกเต๋า!' : 'ROLL DICE')}</span>
              </button>
            )}

            {/* Build & Trade Actions (Available after rolling dice) */}
            {isMyTurn && state.phase === 'main_game' && state.turnStep === 'actions' && (
              <>
                {/* Build Road */}
                <button
                  onClick={() => setActiveMode(activeMode === 'build_road' ? 'none' : 'build_road')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    activeMode === 'build_road'
                      ? 'bg-amber-500 text-black border-amber-400'
                      : canAfford(me?.resources, BUILDING_COSTS.road)
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed'
                  }`}
                >
                  🛣️ {isTh ? 'สร้างถนน (1ไม้ 1อิฐ)' : 'Road (1W 1B)'}
                </button>

                {/* Build Settlement */}
                <button
                  onClick={() =>
                    setActiveMode(
                      activeMode === 'build_settlement' ? 'none' : 'build_settlement'
                    )
                  }
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    activeMode === 'build_settlement'
                      ? 'bg-amber-500 text-black border-amber-400'
                      : canAfford(me?.resources, BUILDING_COSTS.settlement)
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed'
                  }`}
                >
                  🏠 {isTh ? 'ตั้งถิ่นฐาน (+1⭐)' : 'Settlement (+1⭐)'}
                </button>

                {/* Upgrade City */}
                <button
                  onClick={() =>
                    setActiveMode(activeMode === 'upgrade_city' ? 'none' : 'upgrade_city')
                  }
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    activeMode === 'upgrade_city'
                      ? 'bg-amber-500 text-black border-amber-400'
                      : canAfford(me?.resources, BUILDING_COSTS.city)
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed'
                  }`}
                >
                  🏰 {isTh ? 'อัปเกรดเมือง (+1⭐)' : 'City (+1⭐)'}
                </button>

                {/* Buy Dev Card */}
                <button
                  onClick={() => onAction({ type: 'BUY_DEV_CARD' })}
                  disabled={!canAfford(me?.resources, BUILDING_COSTS.dev_card)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    canAfford(me?.resources, BUILDING_COSTS.dev_card)
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      : 'bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed'
                  }`}
                >
                  🃏 {isTh ? 'ซื้อการ์ดพัฒนา' : 'Dev Card'}
                </button>

                {/* Trade Button */}
                <button
                  onClick={() => setShowTradeModal('bank')}
                  className="px-3 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-700/60 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>⚖️</span>
                  <span>{isTh ? 'แลกเปลี่ยนท่าเรือ' : 'Trade Harbor'}</span>
                </button>

                {/* End Turn */}
                <button
                  onClick={() => onAction({ type: 'END_TURN' })}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition"
                >
                  {isTh ? 'จบตาเดิน ➔' : 'End Turn ➔'}
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Harbor / Bank Trade Modal */}
      {showTradeModal === 'bank' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>⛵</span>
                <span>{isTh ? 'แลกเปลี่ยนผ่านท่าเรือ / ธนาคาร' : 'Maritime & Port Trade'}</span>
              </h3>
              <button
                onClick={() => setShowTradeModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">
                  {isTh ? '1. เลือกทรัพยากรที่ต้องการแลกเปลี่ยนออก:' : '1. Choose resource to give:'}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map((res) => {
                    const ratio = getBestTradeRatio(res);
                    const count = me?.resources[res] || 0;
                    return (
                      <button
                        key={res}
                        onClick={() => setBankGiveRes(res)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-xs transition ${
                          bankGiveRes === res
                            ? 'bg-amber-500 text-black border-amber-400 font-bold'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700'
                        }`}
                      >
                        <span className="text-lg">{RESOURCE_THEMES[res].icon}</span>
                        <span className="text-[10px] opacity-80">{ratio}:1</span>
                        <span className="text-[10px] font-mono">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">
                  {isTh ? '2. เลือกทรัพยากรที่ต้องการรับ (1 ชิ้น):' : '2. Choose resource to receive (1 unit):'}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map((res) => (
                    <button
                      key={res}
                      disabled={res === bankGiveRes}
                      onClick={() => setBankGetRes(res)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-xs transition ${
                        bankGetRes === res
                          ? 'bg-emerald-500 text-black border-emerald-400 font-bold'
                          : res === bankGiveRes
                          ? 'opacity-30 cursor-not-allowed border-transparent'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span className="text-lg">{RESOURCE_THEMES[res].icon}</span>
                      <span className="text-[10px]">{isTh ? RESOURCE_THEMES[res].labelTh : RESOURCE_THEMES[res].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300">
                {isTh ? 'อัตราแลกเปลี่ยนของคุณ:' : 'Your Exchange Rate:'}{' '}
                <span className="font-bold text-amber-400">
                  {getBestTradeRatio(bankGiveRes)} {bankGiveRes} ➔ 1 {bankGetRes}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTradeModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                disabled={
                  (me?.resources[bankGiveRes] || 0) < getBestTradeRatio(bankGiveRes) ||
                  bankGiveRes === bankGetRes
                }
                onClick={() => {
                  soundFX.playTileClack();
                  onAction({
                    type: 'BANK_TRADE',
                    giveResource: bankGiveRes,
                    giveAmount: getBestTradeRatio(bankGiveRes),
                    getResource: bankGetRes,
                  });
                  setShowTradeModal(null);
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow"
              >
                {isTh ? 'ยืนยันการแลกเปลี่ยน' : 'Confirm Trade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Modal (When rolled 7 with > 7 cards) */}
      {state.phase === 'discarding' && (me?.toDiscardCount || 0) > 0 && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🥷</span>
              <div>
                <h3 className="font-bold text-base text-red-400">
                  {isTh ? 'โจรออกอาละวาด! ต้องทิ้งการ์ด' : 'Robber Strike! Discard Cards'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isTh
                    ? `คุณถือการ์ดเกิน 7 ใบ ต้องทิ้ง ${me.toDiscardCount} ใบ`
                    : `You held >7 cards. Discard exactly ${me.toDiscardCount} cards.`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {(['wood', 'brick', 'sheep', 'wheat', 'ore'] as ResourceType[]).map((res) => {
                const total = me.resources[res] || 0;
                const discarded = selectedCardsToDiscard[res] || 0;
                return (
                  <div
                    key={res}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span>{RESOURCE_THEMES[res].icon}</span>
                      <span className="font-semibold text-slate-200">
                        {isTh ? RESOURCE_THEMES[res].labelTh : RESOURCE_THEMES[res].label}
                      </span>
                      <span className="text-slate-500 font-mono">({total} available)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setSelectedCardsToDiscard({
                            ...selectedCardsToDiscard,
                            [res]: Math.max(0, discarded - 1),
                          })
                        }
                        className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold w-4 text-center">{discarded}</span>
                      <button
                        disabled={discarded >= total}
                        onClick={() =>
                          setSelectedCardsToDiscard({
                            ...selectedCardsToDiscard,
                            [res]: Math.min(total, discarded + 1),
                          })
                        }
                        className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-center font-semibold text-amber-400">
              {isTh
                ? `เลือกแล้ว: ${totalResourceCount(selectedCardsToDiscard)} / ${me.toDiscardCount} ใบ`
                : `Selected: ${totalResourceCount(selectedCardsToDiscard)} / ${me.toDiscardCount} cards`}
            </div>

            <button
              disabled={totalResourceCount(selectedCardsToDiscard) !== me.toDiscardCount}
              onClick={() => {
                onAction({ type: 'DISCARD_CARDS', cards: selectedCardsToDiscard });
                setSelectedCardsToDiscard(emptyResources());
              }}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition shadow"
            >
              {isTh ? 'ยืนยันทิ้งการ์ด' : 'Confirm Discard'}
            </button>
          </div>
        </div>
      )}

      {/* Robber Steal Selection Modal (when multiple rivals on chosen hex) */}
      {pendingRobberHex !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/60 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-sm text-red-400 flex items-center gap-2">
              <span>🥷</span>
              <span>{isTh ? 'เลือกเป้าหมายที่ต้องการขโมยการ์ด:' : 'Select Victim to Steal From:'}</span>
            </h3>
            <div className="space-y-2">
              {state.hexes[pendingRobberHex]?.vertices.map((vId) => {
                const v = state.vertices[vId];
                if (!v.building || v.building.playerId === currentPlayerId) return null;
                const victim = state.players[v.building.playerId];
                return (
                  <button
                    key={victim.id}
                    onClick={() => {
                      onAction({
                        type: 'MOVE_ROBBER',
                        hexId: pendingRobberHex,
                        targetPlayerId: victim.id,
                      });
                      setPendingRobberHex(null);
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-between text-xs font-bold transition"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: victim.color }} />
                      <span>{victim.name}</span>
                    </div>
                    <span className="text-amber-400 font-mono">
                      {totalResourceCount(victim.resources)} {isTh ? 'ใบ' : 'cards'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Victory Celebration Overlay */}
      {state.phase === 'game_over' && state.winner && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/60 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-[0_0_80px_rgba(245,158,11,0.25)]">
            <div className="text-6xl animate-bounce">👑</div>
            <h2 className="text-2xl font-black text-amber-400 tracking-wide">
              {isTh ? 'ผู้พิชิตแห่งเกาะคาทาน!' : 'CONQUEROR OF CATAN!'}
            </h2>
            <p className="text-sm text-slate-300">
              <span className="font-bold text-white text-base">
                {state.players[state.winner]?.name}
              </span>{' '}
              {isTh
                ? `ได้คว้าชัยชนะไปด้วยคะแนน ${state.players[state.winner]?.victoryPoints} แต้ม!`
                : `has claimed victory with ${state.players[state.winner]?.victoryPoints} Victory Points!`}
            </p>
            {isHost && (
              <button
                onClick={onReturnToLobby}
                className="mt-4 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl transition"
              >
                {isTh ? 'กลับสู่ล็อบบี้' : 'Return to Lobby'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
