import React, { useState, useEffect } from 'react';
import queryString from 'query-string';
import io from 'socket.io-client';
import { useLocation, useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import Game from './Game';
import ColorCard from './ColorCard';
import Emoji from './Emoji';

// 环境变量配置服务器地址，默认 localhost:5000
const ENDPOINT = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

let socket;

export default function Lobby() {
    const [name, setName] = useState('');
    const [room, setRoom] = useState('');
    const [users, setUsers] = useState([]);
    const [gameStarted, setGameStarted] = useState(false);
    const [myColor, setMyColor] = useState(0);
    const [player1, setPlayer1] = useState('');
    const [player2, setPlayer2] = useState('');
    const [connecting, setConnecting] = useState(true);
    const [records, setRecords] = useState({});

    const { search } = useLocation();
    const history = useHistory();

    useEffect(() => {
        const { name: urlName, room: urlRoom } = queryString.parse(search);

        if (!urlName || !urlRoom) {
            history.push('/');
            return;
        }

        setName(urlName);
        setRoom(urlRoom);

        console.log('Connecting to server...', { name: urlName, room: urlRoom });

        // 连接服务器
        socket = io(ENDPOINT);

        socket.on('connect', () => {
            console.log('Socket connected, joining room...');
            setConnecting(false);

            socket.emit('join', { name: urlName, room: urlRoom }, (response) => {
                console.log('Join response:', response);

                if (response && response.joinError) {
                    toast.error(response.joinError);
                    setTimeout(() => {
                        history.push('/');
                    }, 2000);
                    return;
                }

                if (response) {
                    setMyColor(response.color);
                    updateUsersList(response.users || []);
                }
            });
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setConnecting(false);
            toast.error("❌ 连接服务器失败！请确保服务器已启动");
            setTimeout(() => {
                history.push('/');
            }, 3000);
        });

        // 监听新玩家加入
        socket.on('joinPlayer', ({ name: joinedPlayerName }) => {
            console.log('Player joined:', joinedPlayerName);
            toast.success(`🎮 ${joinedPlayerName} 加入了房间！`);
        });

        // 监听用户列表更新
        socket.on('updateUsers', ({ users: roomUsers, records: roomRecords }) => {
            console.log('Users updated:', roomUsers, roomRecords);
            updateUsersList(roomUsers);
            if (roomRecords) {
                setRecords(roomRecords);
            }
        });

        // 监听游戏开始
        socket.on('startGame', () => {
            console.log('Game starting...');
            setGameStarted(true);
        });

        // 监听再来一局被拒绝（在 Lobby 状态时处理）
        socket.on('rematchDeclined', ({ reason }) => {
            toast.info(reason || '再来一局被拒绝');
        });

        // 房间被管理员关闭
        socket.on('roomClosed', ({ reason }) => {
            toast.error(reason || '房间已关闭');
            setTimeout(() => history.push('/'), 2000);
        });

        return () => {
            if (socket) {
                socket.off('connect');
                socket.off('connect_error');
                socket.off('joinPlayer');
                socket.off('updateUsers');
                socket.off('startGame');
                socket.off('rematchDeclined');
                socket.off('roomClosed');
            }
        }
    }, [search, history]);

    // 更新用户列表的辅助函数
    const updateUsersList = (usersList) => {
        console.log('Updating users list:', usersList);
        setUsers(usersList);

        let p1 = '', p2 = '';
        usersList.forEach(user => {
            if (user.color === 1) {
                p1 = user.name;
            } else if (user.color === 2) {
                p2 = user.name;
            }
        });
        setPlayer1(p1);
        setPlayer2(p2);
    };

    const copyToClipboard = (e) => {
        const el = document.createElement('textarea');
        el.value = room;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        toast.dark("📋 房间号已复制！");
    };

    const startGame = () => {
        if (users.length === 2) {
            console.log('Starting game...');
            socket.emit('startGame', { room });
        } else {
            toast.error("❌ 需要两名玩家才能开始游戏！");
        }
    };

    if (gameStarted) {
        return (
            <Game
                socket={socket}
                color={myColor}
                name={name}
                room={room}
                otherPlayerName={myColor === 1 ? player2 : player1}
                started={gameStarted}
            />
        );
    }

    if (connecting) {
        return (
            <div className="lobby-outer-container animated-background">
                <div className="lobby-inner-container">
                    <h1 className="lobby-header">连接中...</h1>
                    <p>正在连接服务器，请稍候...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="lobby-outer-container animated-background">
            <div className="lobby-inner-container">
                <h1 className="lobby-header">五子棋大作战</h1>
                <p className="lobby-room">
                    房间号:
                    <button className="lobby-code" onClick={copyToClipboard}>
                        {room}
                    </button>
                    <Emoji symbol="📋" />
                </p>

                {/* 今日战绩 */}
                {Object.keys(records).length > 0 && (
                    <div className="lobby-records">
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

                <div className="lobby-players-container">
                    <div className="row justify-content-center">
                        <div className="col-auto mb-3">
                            <ColorCard
                                color="黑棋"
                                player={player1}
                            />
                        </div>
                        <div className="col-auto mb-3">
                            <ColorCard
                                color="白棋"
                                player={player2}
                            />
                        </div>
                    </div>
                </div>

                <div className="lobby-status">
                    {users.length === 2 ? (
                        <div>
                            <p className="status-ready">✅ 双方玩家已就绪</p>
                            <button className="button start-game-btn" onClick={startGame}>
                                开始游戏
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="status-waiting">⏳ 等待对手加入...</p>
                            <p className="status-hint">分享房间号给你的朋友吧！</p>
                            <p className="status-hint" style={{fontSize: '14px', marginTop: '10px'}}>
                                当前玩家数: {users.length}/2
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}