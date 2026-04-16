import React, { useState, useCallback } from 'react';
import './InviteCard.css';

interface InviteBlob {
  version: number;
  groupId: string;
  groupName: string;
  inviterId: string;
  passwordHash?: string;
  expiresAt: number;
}

interface InviteCardProps {
  invite: InviteBlob;
  hasPassword: boolean;
  onJoin: (password?: string) => void;
  onCancel: () => void;
}

export default function InviteCard({
  invite,
  hasPassword,
  onJoin,
  onCancel,
}: InviteCardProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleJoin = useCallback(() => {
    if (hasPassword && !password) {
      setError('请输入密码');
      return;
    }
    onJoin(password);
  }, [hasPassword, password, onJoin]);

  const isExpired = invite.expiresAt < Date.now();

  return (
    <div className="invite-card">
      <div className="invite-header">
        <span className="invite-icon">🎉</span>
        <span>群组邀请</span>
      </div>

      <div className="invite-content">
        <div className="invite-group-name">{invite.groupName}</div>
        <div className="invite-info">
          <span>邀请者: {invite.inviterId.substring(0, 8)}...</span>
        </div>
        <div className="invite-expiry">
          {isExpired ? (
            <span className="expired">邀请已过期</span>
          ) : (
            <span>过期时间: {new Date(invite.expiresAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {hasPassword && !isExpired && (
        <div className="invite-password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入群组密码"
            className="password-input"
          />
        </div>
      )}

      {error && <div className="invite-error">{error}</div>}

      <div className="invite-actions">
        <button className="invite-cancel" onClick={onCancel}>
          拒绝
        </button>
        <button 
          className="invite-accept" 
          onClick={handleJoin}
          disabled={isExpired}
        >
          加入群组
        </button>
      </div>
    </div>
  );
}