// 每日战绩记录模块
// 按天记录每个房间内玩家的输赢情况
// 每天凌晨自动清理前一天的数据

const dailyRecords = {}; // { 'YYYY-MM-DD': { roomCode: { 'playerName': { wins, losses } } } }

// 获取今天的日期字符串 YYYY-MM-DD
function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 确保今天的记录容器存在
function ensureToday() {
  const today = getToday();
  if (!dailyRecords[today]) {
    dailyRecords[today] = {};
  }
  return today;
}

// 记录一局比赛结果
// player1Name: 黑棋玩家名
// player2Name: 白棋玩家名
// winnerColor: 1=黑棋赢, 2=白棋赢
function recordGame(roomCode, player1Name, player2Name, winnerColor) {
  const today = ensureToday();

  if (!dailyRecords[today][roomCode]) {
    dailyRecords[today][roomCode] = {};
  }

  const roomRecords = dailyRecords[today][roomCode];

  // 确保两个玩家的记录存在
  if (!roomRecords[player1Name]) {
    roomRecords[player1Name] = { wins: 0, losses: 0 };
  }
  if (!roomRecords[player2Name]) {
    roomRecords[player2Name] = { wins: 0, losses: 0 };
  }

  if (winnerColor === 1) {
    // 黑棋赢 = player1 赢
    roomRecords[player1Name].wins++;
    roomRecords[player2Name].losses++;
  } else if (winnerColor === 2) {
    // 白棋赢 = player2 赢
    roomRecords[player2Name].wins++;
    roomRecords[player1Name].losses++;
  }
}

// 获取指定玩家在指定房间的今日战绩
function getPlayerRecord(roomCode, playerName) {
  const today = getToday();
  if (!dailyRecords[today] || !dailyRecords[today][roomCode]) {
    return { wins: 0, losses: 0 };
  }
  return dailyRecords[today][roomCode][playerName] || { wins: 0, losses: 0 };
}

// 获取房间内所有玩家的今日战绩
function getRoomRecords(roomCode) {
  const today = getToday();
  if (!dailyRecords[today] || !dailyRecords[today][roomCode]) {
    return {};
  }
  return dailyRecords[today][roomCode];
}

// 获取今日所有战绩统计
function getTodaySummary() {
  const today = getToday();
  const records = dailyRecords[today] || {};
  const summary = {
    date: today,
    totalGames: 0,
    totalRooms: Object.keys(records).length,
    players: {},
  };

  for (const roomCode in records) {
    for (const playerName in records[roomCode]) {
      const { wins, losses } = records[roomCode][playerName];
      if (!summary.players[playerName]) {
        summary.players[playerName] = { wins: 0, losses: 0 };
      }
      summary.players[playerName].wins += wins;
      summary.players[playerName].losses += losses;
      summary.totalGames += wins;
    }
  }

  // totalGames 是总对局数 (总胜场数)
  summary.totalGames = Math.floor(summary.totalGames / 2);

  return summary;
}

// 每日凌晨清理前一天数据
function scheduleCleanup() {
  const now = new Date();
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();

  // 首次定时到凌晨
  setTimeout(() => {
    cleanupOldRecords();
    // 之后每 24 小时清理一次
    setInterval(cleanupOldRecords, 24 * 60 * 60 * 1000);
  }, msUntilMidnight + 1000); // 加 1 秒确保过了凌晨
}

function cleanupOldRecords() {
  const today = getToday();
  for (const date in dailyRecords) {
    if (date !== today) {
      delete dailyRecords[date];
    }
  }
  console.log('[战绩] 已清理过期记录，当前日期:', today);
}

// 启动定时清理
scheduleCleanup();

module.exports = {
  recordGame,
  getPlayerRecord,
  getRoomRecords,
  getTodaySummary,
  dailyRecords, // 导出引用供管理后台使用
};