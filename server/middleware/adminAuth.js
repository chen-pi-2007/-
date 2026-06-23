// Admin 认证中间件
// 通过 ADMIN_TOKEN 环境变量进行简单的 token 认证
// 支持 REST (cookie/header) 和 Socket.IO (handshake auth)

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';
const COOKIE_NAME = 'admin_token';

// 存储登录失败计数用于速率限制
const loginAttempts = {};

if (!process.env.ADMIN_TOKEN) {
  console.warn('⚠️  [安全警告] ADMIN_TOKEN 未设置，使用默认密码 "admin123"。请设置环境变量 ADMIN_TOKEN！');
}

// 清理过期登录尝试记录 (每分钟一次)
setInterval(() => {
  const now = Date.now();
  for (const ip in loginAttempts) {
    if (now - loginAttempts[ip].firstAttempt > 60000) {
      delete loginAttempts[ip];
    }
  }
}, 60000);

// ========== REST API 认证中间件 ==========
function restAuth(req, res, next) {
  // 从 cookie 获取
  let token = req.cookies ? req.cookies[COOKIE_NAME] : null;

  // 从 Authorization header 获取
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (token === ADMIN_TOKEN) {
    return next();
  }

  return res.status(401).json({ error: '未授权访问' });
}

// ========== 登录处理 ==========
function loginHandler(req, res) {
  const ip = req.ip || req.connection.remoteAddress;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: '请输入管理员密码' });
  }

  // 速率限制: 每 IP 每分钟最多 5 次尝试
  const now = Date.now();
  if (!loginAttempts[ip]) {
    loginAttempts[ip] = { count: 1, firstAttempt: now };
  } else {
    if (now - loginAttempts[ip].firstAttempt > 60000) {
      loginAttempts[ip] = { count: 1, firstAttempt: now };
    } else {
      loginAttempts[ip].count++;
      if (loginAttempts[ip].count > 5) {
        return res.status(429).json({ success: false, message: '尝试次数过多，请 1 分钟后再试' });
      }
    }
  }

  if (token === ADMIN_TOKEN) {
    // 设置 httpOnly cookie，有效期 24 小时
    res.cookie(COOKIE_NAME, ADMIN_TOKEN, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
    return res.json({ success: true, message: '登录成功' });
  }

  return res.status(401).json({ success: false, message: '密码错误' });
}

// ========== 登出处理 ==========
function logoutHandler(req, res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  return res.json({ success: true, message: '已登出' });
}

// ========== Socket.IO 认证中间件 ==========
function socketAuth(socket, next) {
  const token = socket.handshake.auth && socket.handshake.auth.token;

  if (token === ADMIN_TOKEN) {
    return next();
  }

  return next(new Error('未授权访问 — 需要有效的 admin token'));
}

module.exports = {
  restAuth,
  socketAuth,
  loginHandler,
  logoutHandler,
  ADMIN_TOKEN,
};