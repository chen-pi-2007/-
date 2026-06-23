import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

// 环境变量配置服务器地址，默认 localhost:5000
const ENDPOINT = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

export default function Join() {
    const [name, setName] = useState('');
    const [room, setRoom] = useState('');
    const [loading, setLoading] = useState(false);
    const history = useHistory();

    const createRoom = () => {
        if (!name.trim()) {
            toast.error("❌ 请先输入昵称！");
            return;
        }

        setLoading(true);
        const socket = io(ENDPOINT);

        // 等待连接建立后再发送事件
        socket.on('connect', () => {
            console.log('Socket connected, creating room...');
            socket.emit('createRoom', (response) => {
                console.log('Create room response:', response);
                socket.disconnect();
                setLoading(false);
                
                if (response && response.room) {
                    history.push(`/game?name=${encodeURIComponent(name.trim())}&room=${response.room}`);
                } else {
                    toast.error("❌ 创建房间失败，请重试！");
                }
            });
        });

        // 处理连接错误
        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setLoading(false);
            socket.disconnect();
            toast.error("❌ 连接服务器失败！请确保服务器已启动（端口 5000）");
        });

        // 设置超时
        setTimeout(() => {
            if (loading) {
                setLoading(false);
                socket.disconnect();
                toast.error("❌ 请求超时！请检查服务器是否正常运行");
            }
        }, 10000);
    };

    const joinRoom = () => {
        if (!name.trim()) {
            toast.error("❌ 请先输入昵称！");
            return;
        }
        if (!room.trim()) {
            toast.error("❌ 请输入房间号！");
            return;
        }

        history.push(`/game?name=${encodeURIComponent(name.trim())}&room=${room.trim().toUpperCase()}`);
    };

    return (
        <div className="join-outer-container">
            <div className="join-inner-container">
                <h1 className="heading"> 五子棋大作战 </h1>
                <p className="join-subtitle">经典五子棋，双人对战</p>
                
                <div className="join-form">
                    <div className="form-group">
                        <input 
                            placeholder="请输入你的昵称" 
                            className="join-input" 
                            type="text" 
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                            maxLength={20}
                        />
                    </div>
                    <div className="form-group">
                        <input 
                            placeholder="输入房间号加入对战" 
                            className="join-input" 
                            type="text" 
                            value={room}
                            onChange={(event) => setRoom(event.target.value.toUpperCase())}
                            onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                            maxLength={6}
                        />
                    </div>
                    
                    <div className="button-group">
                        <button 
                            className="button btn-create" 
                            onClick={createRoom}
                            disabled={loading}
                        >
                            {loading ? '创建中...' : '🎮 创建房间'}
                        </button>
                        <button 
                            className="button btn-join" 
                            onClick={joinRoom}
                            disabled={loading}
                        >
                            🚪 加入房间
                        </button>
                    </div>
                </div>

                <div className="join-info">
                    <p className="info-text">
                        <span className="info-icon">ℹ️</span>
                        创建房间后，将房间号分享给好友即可开始对战
                    </p>
                    <p className="info-text" style={{marginTop: '10px', fontSize: '13px', color: '#999'}}>
                        ⚠️ 请确保服务器已启动（npm start in server folder）
                    </p>
                </div>
            </div>
        </div>
    );
}
