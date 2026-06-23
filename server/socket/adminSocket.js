// Admin Socket.IO 命名空间
// 在 /admin 命名空间下向管理员推送实时数据

const { socketAuth } = require('../middleware/adminAuth');

function setupAdminSocket(io, gameStates, startTime, connectionCount) {
  const adminNamespace = io.of('/admin');

  // 认证中间件
  adminNamespace.use(socketAuth);

  adminNamespace.on('connection', (socket) => {
    console.log(`[管理后台] 管理员连接: ${socket.id}`);

    // 发送初始数据
    sendStats(socket, gameStates, startTime, connectionCount);
    sendRoomsList(socket, gameStates);

    // 每 5 秒推送统计数据
    const statsInterval = setInterval(() => {
      sendStats(socket, gameStates, startTime, connectionCount);
    }, 5000);

    // 管理员请求刷新房间列表
    socket.on('admin:getRooms', () => {
      sendRoomsList(socket, gameStates);
    });

    // 管理员请求查看单个房间棋盘
    socket.on('admin:getBoard', ({ roomCode }, callback) => {
      const state = gameStates[roomCode];
      if (!state) {
        if (callback) callback({ error: '房间不存在' });
        return;
      }
      if (callback) {
        callback({
          roomCode,
          board: state.board,
          currentColor: state.currentColor,
          gameStarted: state.gameStarted,
          players: state.users.map(u => ({ name: u.name, color: u.color })),
        });
      }
    });

    // 管理员强制关闭房间
    socket.on('admin:closeRoom', ({ roomCode }) => {
      const state = gameStates[roomCode];
      if (state) {
        io.to(roomCode).emit('roomClosed', { reason: '管理员关闭了该房间' });
        delete gameStates[roomCode];
        console.log(`[管理] 房间 ${roomCode} 被管理员关闭`);

        // 广播房间更新
        socket.emit('admin:roomClosed', { roomCode });
        broadcastRoomUpdate(adminNamespace, gameStates);
      }
    });

    socket.on('disconnect', () => {
      clearInterval(statsInterval);
      console.log(`[管理后台] 管理员断开: ${socket.id}`);
    });
  });
}

// 发送统计数据
function sendStats(socket, gameStates, startTime, connectionCount) {
  const memory = process.memoryUsage();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  let waiting = 0;
  let inProgress = 0;
  let playersOnline = 0;

  for (const roomCode in gameStates) {
    const state = gameStates[roomCode];
    playersOnline += state.users.length;
    if (state.gameStarted) inProgress++;
    else waiting++;
  }

  socket.emit('admin:stats', {
    uptime: formatUptime(uptime),
    memory: Math.round(memory.rss / 1024 / 1024),
    heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
    unit: 'MB',
    connections: connectionCount.current,
    rooms: {
      total: Object.keys(gameStates).length,
      waiting,
      inProgress,
    },
    playersOnline,
    timestamp: Date.now(),
  });
}

// 发送房间列表
function sendRoomsList(socket, gameStates) {
  const rooms = [];

  for (const roomCode in gameStates) {
    const state = gameStates[roomCode];
    rooms.push({
      roomCode,
      player1: state.users.find(u => u.color === 1)?.name || null,
      player2: state.users.find(u => u.color === 2)?.name || null,
      status: state.gameStarted ? 'inProgress' : 'waiting',
      currentTurn: state.currentColor === 1 ? '黑棋' : '白棋',
      playerCount: state.users.length,
    });
  }

  rooms.sort((a, b) => a.roomCode.localeCompare(b.roomCode));
  socket.emit('admin:roomsList', { rooms });
}

// 广播房间更新给所有管理员
function broadcastRoomUpdate(namespace, gameStates) {
  for (const socketId in namespace.sockets) {
    const s = namespace.sockets[socketId];
    if (s.connected) {
      sendRoomsList(s, gameStates);
    }
  }
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

module.exports = { setupAdminSocket };