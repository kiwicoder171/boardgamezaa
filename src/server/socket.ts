import { Server as SocketIOServer, Socket } from 'socket.io';
import { roomManager } from './roomManager';

export function setupSocketServer(io: SocketIOServer) {
  roomManager.setSocketServer(io);

  io.on('connection', (socket: Socket) => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    socket.on('create_room', ({ player, gameId = 'spyfall' }: { player: { id: string; name: string; avatar: string }; gameId?: string }) => {
      const playerData = {
        id: player.id,
        socketId: socket.id,
        name: player.name || 'Host',
        avatar: player.avatar || '🎲',
        isHost: true,
        isReady: true,
        connected: true,
      };

      const room = roomManager.createRoom(playerData, gameId);
      currentRoomCode = room.code;
      currentPlayerId = player.id;
      socket.join(room.code);
      socket.emit('room_created', { code: room.code });
      roomManager.broadcastRoomState(room);
    });

    socket.on('join_room', ({ code, player }: { code: string; player: { id: string; name: string; avatar: string } }) => {
      const normalizedCode = code?.trim().toUpperCase();
      const playerData = {
        id: player.id,
        socketId: socket.id,
        name: player.name || 'Anonymous Player',
        avatar: player.avatar || '🎲',
        isHost: false,
        isReady: false,
        connected: true,
      };

      const result = roomManager.joinRoom(normalizedCode, playerData);
      if (result.error) {
        socket.emit('error_notification', { message: result.error });
        return;
      }

      currentRoomCode = normalizedCode;
      currentPlayerId = player.id;
      socket.join(normalizedCode);

      // Broadcast updated room state
      roomManager.broadcastRoomState(result.room!);
    });

    socket.on('set_ready', ({ code, isReady }: { code: string; isReady: boolean }) => {
      if (!currentPlayerId) return;
      const room = roomManager.setPlayerReady(code, currentPlayerId, isReady);
      if (room) {
        roomManager.broadcastRoomState(room);
      }
    });

    socket.on('select_game', ({ code, gameId }: { code: string; gameId: string }) => {
      if (!currentPlayerId) return;
      const result = roomManager.selectGame(code, currentPlayerId, gameId);
      if (result.error) {
        socket.emit('error_notification', { message: result.error });
        return;
      }
      roomManager.broadcastRoomState(result.room!);
    });

    socket.on('update_settings', ({ code, settings }: { code: string; settings: any }) => {
      if (!currentPlayerId) return;
      const result = roomManager.updateGameSettings(code, currentPlayerId, settings);
      if (result.error) {
        socket.emit('error_notification', { message: result.error });
        return;
      }
      roomManager.broadcastRoomState(result.room!);
    });

    socket.on('start_game', ({ code }: { code: string }) => {
      if (!currentPlayerId) return;
      const result = roomManager.startGame(code, currentPlayerId);
      if (result.error) {
        socket.emit('error_notification', { message: result.error });
        return;
      }
      roomManager.broadcastRoomState(result.room!);
    });

    socket.on('return_to_lobby', ({ code }: { code: string }) => {
      if (!currentPlayerId) return;
      const result = roomManager.returnToLobby(code, currentPlayerId);
      if (result.error) {
        socket.emit('error_notification', { message: result.error });
        return;
      }
      roomManager.broadcastRoomState(result.room!);
    });

    socket.on('game_action', ({ code, action }: { code: string; action: any }) => {
      if (!currentPlayerId) return;
      const result = roomManager.dispatchAction(code, currentPlayerId, action);
      if (result.error) {
        socket.emit('error_notification', { message: result.error });
        return;
      }
      roomManager.broadcastRoomState(result.room!);
    });

    socket.on('send_chat', ({ code, text }: { code: string; text: string }) => {
      if (!currentPlayerId || !text?.trim()) return;
      const msg = roomManager.addChatMessage(code, currentPlayerId, text);
      if (msg) {
        const room = roomManager.getRoom(code);
        if (room) {
          roomManager.broadcastRoomState(room);
        }
      }
    });

    socket.on('disconnect', () => {
      if (currentRoomCode && currentPlayerId) {
        const result = roomManager.leaveRoom(currentRoomCode, currentPlayerId);
        if (result.room) {
          roomManager.broadcastRoomState(result.room);
        }
      }
    });
  });
}
