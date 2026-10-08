import { GAME_REGISTRY, getGame } from '@/games/registry';
import { ChatMessage, Player, Room } from '@/types/game';
import { Server as SocketIOServer } from 'socket.io';

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private io: SocketIOServer | null = null;
  private timerInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startGlobalTimerLoop();
  }

  public setSocketServer(io: SocketIOServer) {
    this.io = io;
  }

  // Generate 4-letter easy uppercase code like 'GAME', 'PLAY', etc.
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  public createRoom(host: Player, gameId = 'spyfall'): Room {
    const code = this.generateRoomCode();
    const game = getGame(gameId) || getGame('spyfall')!;

    const room: Room = {
      code,
      hostId: host.id,
      players: [{ ...host, isHost: true, isReady: true, connected: true }],
      selectedGameId: game.id,
      status: 'lobby',
      gameSettings: { ...game.defaultSettings },
      gameState: null,
      chatMessages: [
        {
          id: 'welcome',
          senderId: 'system',
          senderName: 'System',
          text: `Room created! Invite friends with code ${code}.`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.rooms.set(code, room);
    return room;
  }

  public joinRoom(code: string, player: Player): { room?: Room; error?: string } {
    const room = this.getRoom(code);
    if (!room) {
      return { error: 'Room not found. Check the code and try again.' };
    }

    const existingPlayerIndex = room.players.findIndex((p) => p.id === player.id);
    if (existingPlayerIndex >= 0) {
      // Reconnecting player
      room.players[existingPlayerIndex].socketId = player.socketId;
      room.players[existingPlayerIndex].connected = true;
      room.players[existingPlayerIndex].name = player.name;
      room.players[existingPlayerIndex].avatar = player.avatar;
    } else {
      if (room.status === 'playing') {
        return { error: 'A game is currently in progress in this room.' };
      }
      const game = getGame(room.selectedGameId);
      if (game && room.players.length >= game.maxPlayers) {
        return { error: 'Room is already full.' };
      }

      room.players.push({
        ...player,
        isHost: room.players.length === 0,
        isReady: false,
        connected: true,
      });

      this.addSystemMessage(room, `${player.name} joined the room.`);
    }

    room.lastActivity = Date.now();
    return { room };
  }

  public leaveRoom(code: string, playerId: string): { room?: Room; deleted?: boolean } {
    const room = this.getRoom(code);
    if (!room) return {};

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex < 0) return { room };

    const leavingPlayer = room.players[playerIndex];
    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) {
      // Room empty, delete
      this.rooms.delete(code);
      return { deleted: true };
    }

    // If host left, pass host to next player
    if (leavingPlayer.isHost) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;
      this.addSystemMessage(room, `${room.players[0].name} is now the host.`);
    }

    this.addSystemMessage(room, `${leavingPlayer.name} left the room.`);

    // If in game and not enough players, return to lobby
    const game = getGame(room.selectedGameId);
    if (room.status === 'playing' && game && room.players.length < game.minPlayers) {
      room.status = 'lobby';
      room.gameState = null;
      this.addSystemMessage(
        room,
        `Not enough players remaining to continue ${game.name}. Returned to lobby.`
      );
    }

    room.lastActivity = Date.now();
    return { room };
  }

  public setPlayerReady(code: string, playerId: string, isReady: boolean): Room | undefined {
    const room = this.getRoom(code);
    if (!room) return undefined;

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.isReady = isReady;
    }
    return room;
  }

  public selectGame(code: string, hostId: string, gameId: string): { room?: Room; error?: string } {
    const room = this.getRoom(code);
    if (!room) return { error: 'Room not found' };
    if (room.hostId !== hostId) return { error: 'Only the host can choose games' };

    const game = getGame(gameId);
    if (!game) return { error: 'Unknown game' };

    room.selectedGameId = game.id;
    room.gameSettings = { ...game.defaultSettings };
    this.addSystemMessage(room, `Game changed to ${game.name}.`);
    return { room };
  }

  public updateGameSettings(
    code: string,
    hostId: string,
    settings: any
  ): { room?: Room; error?: string } {
    const room = this.getRoom(code);
    if (!room) return { error: 'Room not found' };
    if (room.hostId !== hostId) return { error: 'Only host can change settings' };

    room.gameSettings = { ...room.gameSettings, ...settings };
    return { room };
  }

  public startGame(code: string, hostId: string): { room?: Room; error?: string } {
    const room = this.getRoom(code);
    if (!room) return { error: 'Room not found' };
    if (room.hostId !== hostId) return { error: 'Only the host can start the game' };

    const game = getGame(room.selectedGameId);
    if (!game) return { error: 'Selected game does not exist' };

    if (room.players.length < game.minPlayers) {
      return {
        error: `${game.name} requires at least ${game.minPlayers} players (currently ${room.players.length}).`,
      };
    }

    try {
      room.gameState = game.initGame(room.players, room.gameSettings);
      room.status = 'playing';
      this.addSystemMessage(room, `🎮 ${game.name} has begun! Good luck.`);
      return { room };
    } catch (err: any) {
      return { error: err.message || 'Failed to start game' };
    }
  }

  public returnToLobby(code: string, hostId: string): { room?: Room; error?: string } {
    const room = this.getRoom(code);
    if (!room) return { error: 'Room not found' };
    if (room.hostId !== hostId) return { error: 'Only host can return to lobby' };

    room.status = 'lobby';
    room.gameState = null;
    this.addSystemMessage(room, `Returned to lobby.`);
    return { room };
  }

  public dispatchAction(
    code: string,
    playerId: string,
    action: any
  ): { room?: Room; error?: string } {
    const room = this.getRoom(code);
    if (!room || room.status !== 'playing' || !room.gameState) {
      return { error: 'No active game session' };
    }

    const game = getGame(room.selectedGameId);
    if (!game) return { error: 'Game logic missing' };

    const result = game.handleAction(room.gameState, action, playerId, room);
    if (result.error) {
      return { error: result.error };
    }

    room.gameState = result.newState;
    room.lastActivity = Date.now();

    // Check game over
    if (game.checkGameOver) {
      const overCheck = game.checkGameOver(room.gameState);
      if (overCheck && overCheck.isOver) {
        room.status = 'gameover';
        if (overCheck.summary) {
          this.addSystemMessage(room, overCheck.summary);
        }
      }
    }

    return { room };
  }

  public addChatMessage(code: string, senderId: string, text: string): ChatMessage | null {
    const room = this.getRoom(code);
    if (!room) return null;

    const player = room.players.find((p) => p.id === senderId);
    if (!player) return null;

    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: player.id,
      senderName: player.name,
      text: text.slice(0, 300),
      timestamp: Date.now(),
    };

    room.chatMessages.push(msg);
    if (room.chatMessages.length > 100) {
      room.chatMessages.shift();
    }
    return msg;
  }

  private addSystemMessage(room: Room, text: string) {
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: 'system',
      senderName: 'System',
      text,
      timestamp: Date.now(),
      isSystem: true,
    };
    room.chatMessages.push(msg);
    if (room.chatMessages.length > 100) {
      room.chatMessages.shift();
    }
  }

  // Sanitize room data for specific player (prevents cheating)
  public sanitizeRoomForPlayer(room: Room, playerId: string) {
    let sanitizedGameState = room.gameState;
    if (room.gameState && room.status === 'playing') {
      const game = getGame(room.selectedGameId);
      if (game && game.sanitizeState) {
        sanitizedGameState = game.sanitizeState(room.gameState, playerId);
      }
    }

    return {
      code: room.code,
      hostId: room.hostId,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        isReady: p.isReady,
        connected: p.connected,
        score: p.score,
      })),
      selectedGameId: room.selectedGameId,
      status: room.status,
      gameSettings: room.gameSettings,
      gameState: sanitizedGameState,
      chatMessages: room.chatMessages.slice(-50),
    };
  }

  // Broadcast sanitized state to each player in the room individually
  public broadcastRoomState(room: Room) {
    if (!this.io) return;

    for (const player of room.players) {
      if (player.socketId) {
        const clientState = this.sanitizeRoomForPlayer(room, player.id);
        this.io.to(player.socketId).emit('room_state_update', clientState);
      }
    }
  }

  // Server-side clock tick for active games
  private startGlobalTimerLoop() {
    if (this.timerInterval) return;

    this.timerInterval = setInterval(() => {
      const now = Date.now();

      for (const [code, room] of this.rooms.entries()) {
        // Clean inactive rooms (3 hours)
        if (now - room.lastActivity > 3 * 60 * 60 * 1000) {
          this.rooms.delete(code);
          continue;
        }

        // Tick game timer
        if (room.status === 'playing' && room.gameState) {
          const game = getGame(room.selectedGameId);
          if (game && game.onTimerTick) {
            const { newState } = game.onTimerTick(room.gameState);
            room.gameState = newState;
            this.broadcastRoomState(room);
          }
        }
      }
    }, 1000);
  }
}

const globalForRoom = globalThis as unknown as { roomManager?: RoomManager };
export const roomManager = globalForRoom.roomManager ?? new RoomManager();
globalForRoom.roomManager = roomManager;

