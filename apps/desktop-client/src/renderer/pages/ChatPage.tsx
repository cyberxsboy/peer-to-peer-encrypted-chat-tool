import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../stores/store';
import { logout } from '../stores/authSlice';
import { setCurrentConversation } from '../stores/uiSlice';
import './ChatPage.css';

export default function ChatPage() {
  const dispatch = useDispatch();
  const { username, userId } = useSelector((state: RootState) => state.auth);
  const { friends, groups } = useSelector((state: RootState) => state.contacts);
  const { conversations } = useSelector((state: RootState) => state.messages);
  const { currentConversationId, isRecordingVoice } = useSelector((state: RootState) => state.ui);
  
  const [messageInput, setMessageInput] = useState('');
  const [peerId, setPeerId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get peer info on mount
  useEffect(() => {
    const getPeerInfo = async () => {
      try {
        const result = await (window as any).electron?.invoke('libp2p:getPeerId');
        if (result?.success) {
          setPeerId(result.data);
        }
      } catch (error) {
        console.error('Failed to get peer ID:', error);
      }
    };
    getPeerInfo();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, currentConversationId]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentConversationId) return;

    try {
      const result = await (window as any).electron?.invoke('libp2p:sendMessage', currentConversationId, messageInput);
      if (result?.success) {
        setMessageInput('');
        inputRef.current?.focus();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentConversation = currentConversationId 
    ? (conversations as any)[currentConversationId] || []
    : [];

  return (
    <div className="chat-page">
      {/* Header */}
      <header className="chat-header">
        <div className="header-info">
          <div className="app-title">SecureP2P Chat</div>
          <div className="user-info">
            <span>{username}</span>
            <span className="peer-id">ID: {peerId?.substring(0, 8)}...</span>
          </div>
        </div>
        <button 
          className="logout-btn"
          onClick={() => dispatch(logout())}
        >
          退出
        </button>
      </header>

      <div className="chat-container">
        {/* Sidebar */}
        <aside className="chat-sidebar">
          <div className="sidebar-section">
            <div className="section-title">联系人</div>
            {friends.length === 0 ? (
              <div className="empty-list">暂无联系人</div>
            ) : (
              friends.map((friend) => (
                <div 
                  key={friend.peerId}
                  className={`contact-item ${currentConversationId === friend.peerId ? 'active' : ''}`}
                  onClick={() => dispatch(setCurrentConversation(friend.peerId))}
                >
                  <div className="contact-avatar">
                    {friend.nickname?.charAt(0) || friend.peerId.charAt(0).toUpperCase()}
                  </div>
                  <div className="contact-info">
                    <div className="contact-name">
                      {friend.nickname || friend.peerId.substring(0, 8)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="sidebar-section">
            <div className="section-title">群组</div>
            {groups.length === 0 ? (
              <div className="empty-list">暂无群组</div>
            ) : (
              groups.map((group) => (
                <div 
                  key={group.groupId}
                  className={`contact-item ${currentConversationId === group.groupId ? 'active' : ''}`}
                  onClick={() => dispatch(setCurrentConversation(group.groupId))}
                >
                  <div className="contact-avatar group">
                    {group.name.charAt(0)}
                  </div>
                  <div className="contact-info">
                    <div className="contact-name">{group.name}</div>
                    <div className="contact-count">{group.members.length} 人</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main chat area */}
        <main className="chat-main">
          {currentConversationId ? (
            <>
              <div className="chat-messages">
                {currentConversation.map((msg: any) => (
                  <div 
                    key={msg.msgId}
                    className={`message ${msg.from === peerId ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">{msg.content}</div>
                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-area">
                <textarea
                  ref={inputRef}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入消息..."
                  className="message-input"
                />
                <button 
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                >
                  发送
                </button>
              </div>
            </>
          ) : (
            <div className="no-conversation">
              <div className="welcome-text">欢迎使用 SecureP2P Chat</div>
              <div className="hint-text">选择联系人或群组开始聊天</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}