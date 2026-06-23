import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';

export default function ResultModal({
  show, handleClose, winnerColor, myColor, name, otherPlayerName,
  opponentDisconnected, disconnectedName,
  gameEnded, socket, room,
  rematchState, records
}) {
  const [rematchCountdown, setRematchCountdown] = useState(0);
  const history = useHistory();

  // 倒计时
  useEffect(() => {
    if (rematchState === 'requested' || rematchState === 'received') {
      setRematchCountdown(30);
      const timer = setInterval(() => {
        setRematchCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [rematchState]);

  // 发起再来一局
  const requestRematch = () => {
    if (socket) {
      socket.emit('rematchRequest', { room });
    }
  };

  // 接受再来一局
  const acceptRematch = () => {
    if (socket) {
      socket.emit('rematchAccept', { room });
    }
  };

  // 拒绝再来一局
  const declineRematch = () => {
    if (socket) {
      socket.emit('rematchDecline', { room });
    }
  };

  // 返回大厅
  const goToLobby = () => {
    handleClose();
    history.push('/');
  };

  if (!show) return null;

  const iAmWinner = winnerColor === myColor;
  const winnerName = iAmWinner ? name : (opponentDisconnected ? disconnectedName : otherPlayerName);

  return (
    <div className="modal-overlay">
      <div className="modal-content result-modal">
        <div className="result-header">
          {opponentDisconnected ? (
            <>
              <h2>😢 对手离开了</h2>
              <p>{disconnectedName} 断开了连接</p>
            </>
          ) : rematchState === 'starting' ? (
            <>
              <h2>🔄 再来一局！</h2>
              <p>新游戏开始！</p>
            </>
          ) : (
            <>
              <h2>{iAmWinner ? '🎉 你赢了！' : '😞 你输了！'}</h2>
              <p>
                {winnerName}（{winnerColor === 1 ? '⚫ 黑棋' : '⚪ 白棋'}）获胜
              </p>
            </>
          )}
        </div>

        {/* 战绩显示 */}
        {records && Object.keys(records).length > 0 && (
          <div className="records-section">
            <h4>📊 今日战绩</h4>
            <table className="records-table">
              <thead>
                <tr>
                  <th>玩家</th>
                  <th>胜</th>
                  <th>负</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(records).map(([playerName, record]) => (
                  <tr key={playerName} className={playerName === name ? 'highlight-row' : ''}>
                    <td>{playerName} {playerName === name ? '(你)' : ''}</td>
                    <td className="wins-cell">{record.wins}</td>
                    <td className="losses-cell">{record.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="result-actions">
          {/* 再来一局状态 */}
          {!opponentDisconnected && !gameEnded && rematchState === 'idle' && (
            <button className="button btn-rematch" onClick={requestRematch}>
              🔄 再来一局
            </button>
          )}

          {rematchState === 'requested' && (
            <div className="rematch-status">
              <p>⏳ 等待对方回应... ({rematchCountdown}s)</p>
            </div>
          )}

          {rematchState === 'received' && (
            <div className="rematch-decision">
              <p>📨 {otherPlayerName} 邀请你再来一局！ ({rematchCountdown}s)</p>
              <div className="rematch-buttons">
                <button className="button btn-accept" onClick={acceptRematch}>
                  ✅ 同意
                </button>
                <button className="button btn-decline" onClick={declineRematch}>
                  ❌ 拒绝
                </button>
              </div>
            </div>
          )}

          {(opponentDisconnected || gameEnded) && (
            <button className="button btn-lobby" onClick={goToLobby}>
              🏠 返回大厅
            </button>
          )}
        </div>
      </div>
    </div>
  );
}