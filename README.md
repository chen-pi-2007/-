# 🎮 五子棋大作战 (Gomoku Online)

在线五子棋双人对战游戏 —— 支持实时 WebSocket 联机、悔棋、再来一局、每日战绩、管理后台。

## ✨ 功能特性

- 🎯 **19×19 标准五子棋** —— 完整的横/竖/斜胜负判定
- 🌐 **实时联机对战** —— 基于 Socket.io，创建房间 → 邀请好友 → 即时对战
- ↩️ **悔棋功能** —— 可向对方发起悔棋请求，30 秒超时自动拒绝
- 🔄 **再来一局** —— 游戏结束后，任一方可发起，对方同意即刷新棋盘
- 📊 **每日战绩** —— 按房间统计当日胜/负场次
- 🛡️ **管理员后台** —— 实时查看服务器状态、房间列表、棋盘预览、强制关闭房间
- 📱 **响应式设计** —— 自适应手机/平板/桌面，棋盘格随屏幕缩放
- 🎨 **现代 UI** —— 紫色渐变 + 玻璃态效果 + 3D 棋子 + 流畅动画

## 🚀 快速开始

### 环境要求

- Node.js ≥ 14
- npm ≥ 6

### 1. 启动服务端

```bash
cd server
npm install
npm start        # 默认监听 5000 端口
```

服务端环境变量（可选）：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端端口 | `5000` |
| `ADMIN_TOKEN` | 管理后台登录密码 | `admin123`（⚠️ 生产环境务必修改） |

### 2. 启动客户端

```bash
cd client
npm install
npm start        # 开发服务器，默认监听 3000 端口
```

客户端环境变量（可选）：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `REACT_APP_SERVER_URL` | WebSocket 服务器地址 | `http://localhost:5000` |

> 💡 连接远程服务器时，在 `client/.env` 中设置 `REACT_APP_SERVER_URL=http://你的IP:5000`

### 3. 开始游戏

1. 打开浏览器访问 `http://localhost:3000`
2. 输入昵称，创建房间
3. 复制房间号发送给好友
4. 好友加入后即可开始对战！

## 🏗️ 项目结构

```
gomoku-online/
├── client/                   # React 前端 (CRA)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Board.js          # 19×19 棋盘组件
│   │   │   ├── BoardIntersection.js  # 单个交叉点
│   │   │   ├── Game.js           # 游戏主逻辑
│   │   │   ├── Join.js           # 创建/加入房间
│   │   │   ├── Lobby.js          # 大厅等待页面
│   │   │   ├── ResultModal.js    # 结果弹窗（胜负/再来一局/悔棋）
│   │   │   ├── ColorCard.js      # 玩家信息卡片
│   │   │   ├── Footer.js         # 页脚
│   │   │   └── Emoji.js          # Emoji 辅助组件
│   │   ├── App.js
│   │   └── App.scss
│   └── .env.example
├── server/                   # Express 服务端
│   ├── index.js              # 主入口：Socket.IO 游戏事件
│   ├── game.js               # 胜负判定算法
│   ├── records.js            # 每日战绩模块
│   ├── middleware/
│   │   └── adminAuth.js      # 管理员 Token 认证
│   ├── routes/
│   │   └── adminRoutes.js    # Admin REST API
│   ├── socket/
│   │   └── adminSocket.js    # Admin Socket.IO 命名空间
│   └── admin/
│       └── index.html        # 管理后台前端（自包含）
├── 部署指南.md
├── UPDATE_LOG.md
└── README.md
```

## 🔐 安全特性

- Helmet 安全 HTTP 头（防 XSS / 点击劫持）
- 全局速率限制（15 分钟窗口 200 次请求）
- 登录接口额外限流（1 分钟 5 次尝试）
- 昵称/房间号白名单输入校验
- IP 级别连接数限制（单 IP 最多 5 并发）
- 动态 CORS 校验
- Cookie Parser + Token 认证（管理后台）

## 🛡️ 管理后台

访问 `http://localhost:5000/admin`，输入 ADMIN_TOKEN 登录。

功能：
- 实时服务器运行状态（内存、连接数、房间数、运行时间）
- 房间列表（玩家信息、游戏状态、当前回合）
- 单个房间 19×19 棋盘 Canvas 预览
- 强制关闭任意房间

## 🔧 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 17, Socket.io Client, React Router, react-toastify |
| 后端 | Express 4, Socket.io 4, Helmet, express-rate-limit |
| 样式 | SCSS (玻璃态 + 渐变 + 响应式) |
| 实时通信 | WebSocket (Socket.io) |

## 📝 License

MIT

---

🌐 **马上和好友来一局五子棋吧！** 🎉