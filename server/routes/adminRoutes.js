// Admin REST API 路由
// 挂载在 /api/admin

const express = require('express');
const router = express.Router();
const { restAuth, loginHandler, logoutHandler } = require('../middleware/adminAuth');
const { dailyRecords } = require('../records');

// gameStates 和 serverStartTime 通过函数参数传入
let gameStates;
let startTime;
let connectionCount;

function setupRoutes(_gameStates, _startTime, _connectionCount) {
  gameStates = _gameStates;
  startTime = _startTime;
  connectionCount = _connectionCount;

  // ========== 登录 (不需要认证) ==========
  router.post('/login', loginHandler);

  // ========== 以下路由需要认证 ==========
  router.use(restAuth);

  // 登出
  router.post('/logout', logoutHandler);

  // 验证 token 是否有效
  router.get('/verify', (req, res) => {
    res.json({ valid: true });
  });

  // 获取服务器状态
  router.get('/status', (req, res) => {
    const memory = process.memoryUsage();
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    let waitingRooms = 0;
    let inProgressRooms = 0;
    let playersOnline = 0;

    for (const roomCode in gameStates) {
      const state = gameStates[roomCode];
      playersOnline += state.users.length;
      if (state.gameStarted) {
        inProgressRooms++;
      } else {
        waitingRooms++;
      }
    }

    res.json({
      uptime,
      uptimeFormatted: formatUptime(uptime),
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024),
        unit: 'MB',
      },
      connections: connectionCount.current,
      rooms: {
        total: Object.keys(gameStates).length,
        waiting: waitingRooms,
        inProgress: inProgressRooms,
      },
      playersOnline,
    });
  });

  // 获取所有房间列表
  router.get('/rooms', (req, res) => {
    const rooms = [];

    for (const roomCode in gameStates) {
      const state = gameStates[roomCode];
      rooms.push({
        roomCode,
        player1: state.users.find(u => u.color === 1) ? state.users.find(u => u.color === 1).name : null,
        player2: state.users.find(u => u.color === 2) ? state.users.find(u => u.color === 2).name : null,
        status: state.gameStarted ? 'inProgress' : 'waiting',
        currentTurn: state.currentColor === 1 ? '黑棋' : '白棋',
        playerCount: state.users.length,
      });
    }

    // 按房间号排序
    rooms.sort((a, b) => a.roomCode.localeCompare(b.roomCode));

    res.json({ rooms });
  });

  // 获取单个房间详情 (含棋盘)
  router.get('/rooms/:roomCode', (req, res) => {
    const state = gameStates[req.params.roomCode];
    if (!state) {
      return res.status(404).json({ error: '房间不存在或已关闭' });
    }

    res.json({
      roomCode: req.params.roomCode,
      board: state.board,
      currentColor: state.currentColor,
      gameStarted: state.gameStarted,
      players: state.users.map(u => ({ name: u.name, color: u.color })),
      player1: state.users.find(u => u.color === 1) ? state.users.find(u => u.color === 1).name : null,
      player2: state.users.find(u => u.color === 2) ? state.users.find(u => u.color === 2).name : null,
      status: state.gameStarted ? 'inProgress' : 'waiting',
    });
  });

  // 强制关闭房间
  router.delete('/rooms/:roomCode', (req, res) => {
    const roomCode = req.params.roomCode;
    const state = gameStates[roomCode];

    if (!state) {
      return res.status(404).json({ error: '房间不存在' });
    }

    // 通知房间内所有玩家
    const io = req.app.get('io');
    if (io) {
      io.to(roomCode).emit('roomClosed', { reason: '管理员关闭了该房间' });
    }

    // 删除房间
    delete gameStates[roomCode];

    console.log(`[管理] 房间 ${roomCode} 被管理员强制关闭`);
    res.json({ success: true, message: `房间 ${roomCode} 已关闭` });
  });

  return router;
}

// 格式化运行时间
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}天`);
  if (h > 0) parts.push(`${h}小时`);
  if (m > 0) parts.push(`${m}分钟`);
  parts.push(`${s}秒`);
  return parts.join(' ');
}

module.exports = { setupRoutes };