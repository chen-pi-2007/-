import React, {useState, useEffect, useCallback} from 'react';
import { toast } from 'react-toastify';
import Board from './Board';
import Emoji from './Emoji';
import ResultModal from './ResultModal';

// 动态计算棋盘格子大小，适配手机/平板/桌面
function calcGridSize() {
	const w = window.innerWidth;
	if (w >= 900) return 40;
	const avail = w - 48;
	const gs = Math.floor(avail / 19);
	return Math.max(16, Math.min(40, gs));
}

export default function Game({socket, color, name, room, otherPlayerName, started}) {

	const SIZE = 19;
	const [gridSize, setGridSize] = useState(calcGridSize);

	const [currentColor, setCurrentColor] = useState(1);
	const [board, setBoard] = useState([]);
	const [winnerColor, setWinnerColor] = useState(0);
	const [winnerName, setWinnerName] = useState('');
	const [loserName, setLoserName] = useState('');
	const [showResult, setShowResult] = useState(false);
	const [gameEnded, setGameEnded] = useState(false);
	const [opponentDisconnected, setOpponentDisconnected] = useState(false);
	const [disconnectedName, setDisconnectedName] = useState('');
	const [rematchState, setRematchState] = useState('idle');
	const [records, setRecords] = useState({});
	const [undoState, setUndoState] = useState('idle'); // idle | requested | received
	const [undoCountdown, setUndoCountdown] = useState(0);

	const handleResize = useCallback(() => {
		setGridSize(calcGridSize());
	}, []);

	useEffect(() => {
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [handleResize]);

	useEffect(() => {
		let matrix = [];
		for (let i = 0; i < SIZE; i++) {
			matrix[i] = [];
			for (let j = 0; j < SIZE; j++) {
				matrix[i][j] = 0;
			}
		}
		setBoard(matrix);
	}, [SIZE]);

	useEffect(() => {
		if (!socket) return;

		socket.on('play', ({newBoard, newColor}) => {
			setBoard(newBoard);
			setCurrentColor(newColor);
		});

		socket.on('endGame', ({winningColor, winnerName: wName, loserName: lName, records: gameRecords}) => {
			setWinnerColor(winningColor);
			setWinnerName(wName);
			setLoserName(lName);
			setGameEnded(true);
			setRematchState('idle');
			setRecords(gameRecords || {});
			setShowResult(true);
		});

		socket.on('opponentLeft', ({name: leftName}) => {
			if (!gameEnded && started) {
				setShowResult(true);
				setOpponentDisconnected(true);
				setDisconnectedName(leftName);
			}
		});

		socket.on('rematchRequest', ({from}) => {
			setRematchState('received');
			setShowResult(true);
		});

		socket.on('rematchStart', ({board: newBoard, currentColor: newColor}) => {
			setBoard(newBoard);
			setCurrentColor(newColor);
			setWinnerColor(0);
			setGameEnded(false);
			setRematchState('idle');
			setShowResult(false);
			setOpponentDisconnected(false);
			toast.success('🔄 新一局开始！');
		});

		socket.on('rematchDeclined', ({reason}) => {
			setRematchState('idle');
			setGameEnded(true);
			setShowResult(true);
			toast.info(reason || '再来一局被拒绝');
		});

		socket.on('roomClosed', ({reason}) => {
			toast.error(reason || '房间已关闭');
			setShowResult(false);
			setTimeout(() => {
				window.location.href = '/';
			}, 2000);
		});

		// 悔棋事件
		socket.on('undoRequest', ({from, lastMove}) => {
			setUndoState('received');
			let sec = 30;
			setUndoCountdown(sec);
			const timer = setInterval(() => {
				sec--;
				setUndoCountdown(sec);
				if (sec <= 0) clearInterval(timer);
			}, 1000);
			toast.info(`${from} 请求悔棋`);
		});

		socket.on('undoApplied', ({board: newBoard, currentColor: newColor}) => {
			setBoard(newBoard);
			setCurrentColor(newColor);
			setUndoState('idle');
			setUndoCountdown(0);
			toast.success('✅ 已悔棋');
		});

		socket.on('undoDeclined', ({reason}) => {
			setUndoState('idle');
			setUndoCountdown(0);
			toast.info(reason || '悔棋被拒绝');
		});

		return () => {
			socket.off('play');
			socket.off('endGame');
			socket.off('opponentLeft');
			socket.off('rematchRequest');
			socket.off('rematchStart');
			socket.off('rematchDeclined');
			socket.off('roomClosed');
			socket.off('undoRequest');
			socket.off('undoApplied');
			socket.off('undoDeclined');
		};
	}, [socket, started, gameEnded]);

	function play(i, j) {
		if (gameEnded || opponentDisconnected) {
			toast.error("😬 游戏已经结束了！");
			return;
		}
		if (color !== currentColor) {
			toast.error("😬 还没轮到你呢！");
			return;
		}
		if (board[i][j] !== 0) {
			toast.error("😬 这个位置已经有子了！");
			return;
		}

		socket.emit('play', {i, j, board, color, room}, (response) => {
			if (response && response.error) {
				toast.error(response.error);
			}
		});
	}

	function undoRequest() {
		if (!gameEnded && !opponentDisconnected) {
			socket.emit('undoRequest', { room });
			setUndoState('requested');
			toast.info('已发送悔棋请求，等待对方确认...');
		}
	}

	function undoAccept() {
		socket.emit('undoAccept', { room });
	}

	function undoDecline() {
		socket.emit('undoDecline', { room });
		setUndoState('idle');
		setUndoCountdown(0);
	}

	return (
		<div className="container board-container">
			<ResultModal
				show={showResult}
				handleClose={() => {setShowResult(false)}}
				winnerColor={winnerColor}
				myColor={color}
				name={name}
				otherPlayerName={otherPlayerName}
				opponentDisconnected={opponentDisconnected}
				disconnectedName={disconnectedName}
				gameEnded={gameEnded}
				socket={socket}
				room={room}
				rematchState={rematchState}
				records={records}
			/>
			<div className="game-header-container">
				<div className="game-header-content">
					<h1> 五子棋大作战 </h1>
					<p> 经典的五子棋在线对战游戏： <a className="footer-link" href="https://en.wikipedia.org/wiki/Gomoku" target="_blank" rel="noopener noreferrer"> 规则介绍 </a> </p>

					{/* 悔棋区域 */}
					{!gameEnded && !opponentDisconnected && (
						<div className="undo-area">
							{undoState === 'idle' && (
								<button className="btn-undo" onClick={undoRequest}>
									↩ 悔棋
								</button>
							)}
							{undoState === 'requested' && (
								<p className="undo-status">⏳ 等待对方确认悔棋...</p>
							)}
							{undoState === 'received' && (
								<div className="undo-decision">
									<p>对方请求悔棋 {undoCountdown > 0 && `(${undoCountdown}s)`}</p>
									<div className="undo-buttons">
										<button className="btn-undo-accept" onClick={undoAccept}>同意</button>
										<button className="btn-undo-decline" onClick={undoDecline}>拒绝</button>
									</div>
								</div>
							)}
						</div>
					)}

					<div className={winnerColor !== 0 ? "" : "hide-div"}>
						<p> <Emoji symbol="🎉"/> {winnerColor === color ? name : (opponentDisconnected ? disconnectedName : otherPlayerName)} ({winnerColor === 1 ? "黑棋" : "白棋"}) 获胜！ </p>
						<a className="btn btn-primary" href="/">再来一局</a>
					</div>
					<div className={opponentDisconnected && !gameEnded ? "" : "hide-div"}>
						<p> <Emoji symbol="😢"/> {disconnectedName} 离开了游戏。 </p>
						<a className="btn btn-primary" href="/">寻找新对手</a>
					</div>
					<p className={gameEnded || opponentDisconnected ? "hide-div" : ""}> <b>当前回合：</b> {currentColor === 1 ? <Emoji symbol="⚫"/> : <Emoji symbol="⚪"/>} {currentColor === color ? name : otherPlayerName} ({currentColor === 1 ? "黑棋" : "白棋"})</p>
				</div>
			</div>
			<div className="game-inner-container">
				<Board board={board} size={SIZE} on_play={play} grid_size={gridSize}/>
			</div>
		</div>
	);
}