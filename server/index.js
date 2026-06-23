const express = require('express');
const app = express();
const http = require('http').createServer(app);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// ==================== 安全中间件 ====================

// HTTP 安全头
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// 全局速率限制
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟窗口
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});
app.use('/api/', globalLimiter);

// 登录接口额外限流
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟窗口
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '尝试次数过多，请 1 分钟后再试' },
});

// Cookie 解析
app.use(cookieParser());

// JSON body 解析
app.use(express.json({ limit: '10kb' }));

// 动态 CORS 校验：允许本地 + 当前服务器公网 IP 的 3000/3001 端口
const allowedOrigins = (origin, callback) => {
  if (!origin) return callback(null, true);

  try {
    const url = new URL(origin);
    const host = url.hostname;
    const port = url.port;

    // 允许 localhost 和 127.0.0.1
    if (host === 'localhost' || host === '127.0.0.1') {
      return callback(null, true);
    }

    // 允许任何非本地地址通过 3000 或 3001 端口访问（公网 IP）
    if (port === '3000' || port === '3001') {
      return callback(null, true);
    }

    return callback(null, true); // fallback: 允许
  } catch (e) {
    return callback(null, true); // 无法解析的 origin 也允许
  }
};

const io = require('socket.io')(http, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e5, // 100KB 限制
});

// ==================== 依赖模块 ====================
const { isWinningState } = require('./game');
const { recordGame, getRoomRecords } = require('./records');
const { setupRoutes } = require('./routes/adminRoutes');
const { setupAdminSocket } = require('./socket/adminSocket');
const { restAuth } = require('./middleware/adminAuth');

// ==================== 基础配置 ====================
const PORT = process.env.PORT || 5000;
const SIZE = 19;
const serverStartTime = Date.now();

// 连接计数器
const connectionCount = { current: 0 };
// IP 连接追踪 (用于防止单 IP 过多连接)
const ipConnections = {};

// 存储每个房间的游戏状态
// gameStates[roomCode] = { board, currentColor, users, gameStarted, rematchRequested }
const gameStates = {};

function initBoard() {
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      board[i][j] = 0;
    }
  }
  return board;
}

// ==================== 输入验证 ====================
function sanitizeName(name) {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  // 中英文字母、数字、下划线、短横线，2-20 字符
  if (!/^[一-龥a-zA-Z0-9_-]{2,20}$/.test(trimmed)) return null;
  return trimmed;
}

function sanitizeRoom(room) {
  if (!room || typeof room !== 'string') return null;
  const trimmed = room.trim().toUpperCase();
  // 大写字母和数字，2-6 字符
  if (!/^[A-Z0-9]{2,6}$/.test(trimmed)) return null;
  return trimmed;
}

// ==================== Express 路由 ====================
app.get('/', (req, res) => {
  res.send('Gomoku Server is running');
});

// 管理员后台页面（登录页公开访问，API 接口由中间件保护）
app.get('/admin', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'admin', 'index.html'));
});

// 挂载 Admin REST API
const adminRouter = setupRoutes(gameStates, serverStartTime, connectionCount);
app.use('/api/admin', loginLimiter, adminRouter);

// 将 io 实例挂到 app 上供 adminRoutes 使用
app.set('io', io);

// ==================== Socket.IO 游戏事件 ====================
io.on('connection', (socket) => {
  connectionCount.current++;
  const clientIp = socket.handshake.address || socket.request?.connection?.remoteAddress;
  console.log(`[连接] 新客户端: ${socket.id} (总连接: ${connectionCount.current})`);

  // IP 连接数限制: 单 IP 最多 5 个
  if (clientIp) {
    ipConnections[clientIp] = (ipConnections[clientIp] || 0) + 1;
    if (ipConnections[clientIp] > 5) {
      console.log(`[安全] IP ${clientIp} 连接数过多，断开 ${socket.id}`);
      socket.emit('connect_error', '连接数过多');
      socket.disconnect(true);
      return;
    }
  }

  // ========== 创建房间 ==========
  socket.on('createRoom', (callback) => {
    console.log(`[创建] ${socket.id} 请求创建房间`);
    const crypto = require('crypto');
    const roomCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    gameStates[roomCode] = {
      board: initBoard(),
      currentColor: 1,
      users: [],
      gameStarted: false,
      rematchRequested: null, // 谁发起了再来一局请求
      rematchTimeout: null,   // 超时定时器
    };

    console.log(`[创建] 房间 ${roomCode} 已创建`);
    if (callback) callback({ room: roomCode });
  });

  // ========== 加入房间 ==========
  socket.on('join', ({ name, room }, callback) => {
    const safeName = sanitizeName(name);
    const safeRoom = sanitizeRoom(room);

    if (!safeName || !safeRoom) {
      if (callback) callback({ joinError: '昵称或房间号格式不正确！昵称2-20字符(中英文/数字/下划线)，房间号2-6字符(字母/数字)' });
      return;
    }

    console.log(`[加入] ${safeName} 请求加入房间 ${safeRoom}`);

    // 查找或创建房间
    let state = gameStates[safeRoom];
    if (!state) {
      state = {
        board: initBoard(),
        currentColor: 1,
        users: [],
        gameStarted: false,
        rematchRequested: null,
        rematchTimeout: null,
      };
      gameStates[safeRoom] = state;
    }

    // 检查房间是否已满
    if (state.users.length >= 2) {
      if (callback) callback({ joinError: '房间已满（最多2名玩家）！' });
      return;
    }

    // 分配颜色
    const assignedColors = state.users.map(u => u.color);
    const color = assignedColors.includes(1) ? 2 : 1;

    const user = { id: socket.id, name: safeName, color };
    state.users.push(user);

    socket.join(safeRoom);
    socket.data.roomCode = safeRoom;
    socket.data.userName = safeName;

    console.log(`[加入] ${safeName} 进入房间 ${safeRoom}，颜色: ${color === 1 ? '黑棋' : '白棋'}`);

    if (callback) {
      callback({
        color: color,
        users: state.users.map(u => ({ name: u.name, color: u.color })),
      });
    }

    // 通知+推送今日战绩
    const roomRecords = getRoomRecords(safeRoom);
    setTimeout(() => {
      socket.to(safeRoom).emit('joinPlayer', { name: safeName });
      io.to(safeRoom).emit('updateUsers', {
        users: state.users.map(u => ({ name: u.name, color: u.color })),
        records: roomRecords,
      });
    }, 300);
  });

  // ========== 开始游戏 ==========
  socket.on('startGame', ({ room }) => {
    const state = gameStates[room];
    if (!state || state.users.length !== 2) return;

    state.gameStarted = true;
    state.rematchRequested = null;
    if (state.rematchTimeout) {
      clearTimeout(state.rematchTimeout);
      state.rematchTimeout = null;
    }

    console.log(`[游戏] 房间 ${room} 游戏开始`);
    io.to(room).emit('startGame');
  });

  // ========== 落子 ==========
  socket.on('play', ({ i, j, board, color, room }, callback) => {
    const state = gameStates[room];
    if (!state || !state.gameStarted) {
      if (callback) callback({ error: '游戏尚未开始' });
      return;
    }

    // 验证坐标合法性
    if (typeof i !== 'number' || typeof j !== 'number' || i < 0 || i >= SIZE || j < 0 || j >= SIZE) {
      if (callback) callback({ error: '无效的落子位置' });
      return;
    }

    // 验证是否轮到此玩家
    if (color !== state.currentColor) {
      if (callback) callback({ error: '还没轮到你' });
      return;
    }

    // 验证该位置是否为空
    if (state.board[i][j] !== 0) {
      if (callback) callback({ error: '这个位置已经有子了' });
      return;
    }

    // 更新棋盘
    state.board[i][j] = color;
    const playedColor = color;

    // 记录落子历史（用于悔棋）
    if (!state.moveHistory) state.moveHistory = [];
    state.moveHistory.push({ row: i, col: j, color });

    state.currentColor = color === 1 ? 2 : 1;

    console.log(`[落子] ${room}: ${playedColor === 1 ? '黑' : '白'} (${i},${j})`);

    // 检查胜负
    if (isWinningState(state.board)) {
      const winnerName = state.users.find(u => u.color === playedColor)?.name || '?';
      const loserColor = playedColor === 1 ? 2 : 1;
      const loserName = state.users.find(u => u.color === loserColor)?.name || '?';
      const p1 = state.users.find(u => u.color === 1);
      const p2 = state.users.find(u => u.color === 2);

      console.log(`[游戏] ${room} 结束，获胜: ${winnerName} (${playedColor === 1 ? '黑' : '白'})`);

      // 记录战绩
      if (p1 && p2) {
        recordGame(room, p1.name, p2.name, playedColor);
      }

      // 发送游戏结束 + 今日战绩
      const roomRecords = getRoomRecords(room);
      io.to(room).emit('endGame', {
        winningColor: playedColor,
        winnerName,
        loserName,
        records: roomRecords,
      });

      state.gameStarted = false;
      state.board = initBoard();
      state.currentColor = 1;
    } else {
      io.to(room).emit('play', {
        newBoard: state.board,
        newColor: state.currentColor,
      });
    }

    if (callback) callback({ success: true });
  });

  // ========== 再来一局请求 ==========
  socket.on('rematchRequest', ({ room }) => {
    const state = gameStates[room];
    if (!state || state.gameStarted) return;

    console.log(`[再来一局] ${room}: ${socket.data.userName} 请求再来一局`);

    state.rematchRequested = socket.data.userName;

    // 通知对方
    socket.to(room).emit('rematchRequest', {
      from: socket.data.userName,
    });

    // 30 秒超时自动拒绝
    if (state.rematchTimeout) clearTimeout(state.rematchTimeout);
    state.rematchTimeout = setTimeout(() => {
      const s = gameStates[room];
      if (s && s.rematchRequested) {
        console.log(`[再来一局] ${room}: 超时未响应，自动拒绝`);
        io.to(room).emit('rematchDeclined', { reason: '对方超时未响应' });
        s.rematchRequested = null;
        s.rematchTimeout = null;
      }
    }, 30000);
  });

  // ========== 接受再来一局 ==========
  socket.on('rematchAccept', ({ room }) => {
    const state = gameStates[room];
    if (!state || state.gameStarted) return;

    console.log(`[再来一局] ${room}: ${socket.data.userName} 接受再来一局`);

    if (state.rematchTimeout) clearTimeout(state.rematchTimeout);
    state.rematchRequested = null;
    state.rematchTimeout = null;

    // 重置棋盘并开始
    state.board = initBoard();
    state.currentColor = 1;
    state.gameStarted = true;

    io.to(room).emit('rematchStart', {
      board: state.board,
      currentColor: 1,
    });
  });

  // ========== 拒绝再来一局 ==========
  socket.on('rematchDecline', ({ room }) => {
    const state = gameStates[room];
    if (!state) return;

    console.log(`[再来一局] ${room}: ${socket.data.userName} 拒绝再来一局`);

    if (state.rematchTimeout) clearTimeout(state.rematchTimeout);
    state.rematchRequested = null;
    state.rematchTimeout = null;

    io.to(room).emit('rematchDeclined', {
      reason: `${socket.data.userName} 拒绝了再来一局请求`,
    });
  });

  // ========== 悔棋请求 ==========
  socket.on('undoRequest', ({ room }) => {
    const state = gameStates[room];
    if (!state || !state.gameStarted) return;
    if (!state.moveHistory || state.moveHistory.length === 0) return;

    console.log(`[悔棋] ${room}: ${socket.data.userName} 请求悔棋`);

    state.undoRequestedBy = socket.data.userName;

    socket.to(room).emit('undoRequest', {
      from: socket.data.userName,
      lastMove: state.moveHistory[state.moveHistory.length - 1],
    });

    // 30 秒超时自动拒绝
    if (state.undoTimeout) clearTimeout(state.undoTimeout);
    state.undoTimeout = setTimeout(() => {
      const s = gameStates[room];
      if (s && s.undoRequestedBy) {
        console.log(`[悔棋] ${room}: 超时未响应，自动拒绝`);
        io.to(room).emit('undoDeclined', { reason: '对方超时未响应' });
        s.undoRequestedBy = null;
        s.undoTimeout = null;
      }
    }, 30000);
  });

  // ========== 接受悔棋 ==========
  socket.on('undoAccept', ({ room }) => {
    const state = gameStates[room];
    if (!state || !state.gameStarted || !state.undoRequestedBy) return;

    console.log(`[悔棋] ${room}: ${socket.data.userName} 接受悔棋`);

    if (state.undoTimeout) clearTimeout(state.undoTimeout);
    state.undoRequestedBy = null;
    state.undoTimeout = null;

    // 撤销最后一步
    const history = state.moveHistory;
    if (history.length > 0) {
      const move = history.pop();
      state.board[move.row][move.col] = 0;
      // 回合回到落子方
      state.currentColor = move.color;
    }

    io.to(room).emit('undoApplied', {
      board: state.board,
      currentColor: state.currentColor,
    });
  });

  // ========== 拒绝悔棋 ==========
  socket.on('undoDecline', ({ room }) => {
    const state = gameStates[room];
    if (!state) return;

    console.log(`[悔棋] ${room}: ${socket.data.userName} 拒绝悔棋`);

    if (state.undoTimeout) clearTimeout(state.undoTimeout);
    state.undoRequestedBy = null;
    state.undoTimeout = null;

    io.to(room).emit('undoDeclined', {
      reason: `${socket.data.userName} 拒绝了悔棋请求`,
    });
  });

  // ========== 断开连接 ==========
  socket.on('disconnect', () => {
    connectionCount.current--;
    if (clientIp) {
      ipConnections[clientIp] = Math.max(0, (ipConnections[clientIp] || 1) - 1);
    }

    const room = socket.data.roomCode;
    const name = socket.data.userName;

    if (room && name) {
      console.log(`[断开] ${name} 离开房间 ${room}`);
      const state = gameStates[room];
      if (state) {
        // 清理再来一局计时器
        if (state.rematchTimeout) {
          clearTimeout(state.rematchTimeout);
          state.rematchTimeout = null;
        }

        state.users = state.users.filter(u => u.id !== socket.id);

        if (state.users.length > 0) {
          io.to(room).emit('opponentLeft', { name });
          io.to(room).emit('updateUsers', {
            users: state.users.map(u => ({ name: u.name, color: u.color })),
          });
        }

        if (state.users.length === 0) {
          console.log(`[房间] 清理空房间: ${room}`);
          delete gameStates[room];
        }
      }
    }

    console.log(`[连接] 断开: ${socket.id} (总连接: ${connectionCount.current})`);
  });
});

// ==================== Admin Socket.IO 命名空间 ====================
setupAdminSocket(io, gameStates, serverStartTime, connectionCount);

// ==================== 启动服务器 ====================
http.listen(PORT, () => {
  console.log(`Server has started on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});