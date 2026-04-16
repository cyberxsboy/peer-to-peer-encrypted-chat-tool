import React, { useState, useCallback } from 'react';
import { MessageType } from '@shared/types';
import ImagePreview from './ImagePreview';
import VideoPlayer from './VideoPlayer';
import LinkPreview from './LinkPreview';
import BurnableMessage from './BurnableMessage';
import './MessageBubble.css';

interface MessageBubbleProps {
  msgId: string;
  from: string;
  content: string;
  type: MessageType;
  timestamp: number;
  isOwn: boolean;
  replyTo?: string;
  burnAfterSec?: number;
  onReply?: (msgId: string) => void;
  onBurn?: (msgId: string) => void;
  remainingSeconds?: number | null;
}

export default function MessageBubble({
  msgId,
  from,
  content,
  type,
  timestamp,
  isOwn,
  replyTo,
  burnAfterSec,
  onReply,
  onBurn,
  remainingSeconds,
}: MessageBubbleProps) {
  const [expanded, setExpanded] = useState(false);

  const renderContent = () => {
    switch (type) {
      case MessageType.IMAGE:
        return (
          <ImagePreview
            src={content}
            size="medium"
            onClick={() => setExpanded(!expanded)}
          />
        );
      
      case MessageType.VOICE:
        return (
          <div className="voice-message">
            <span className="voice-icon">🎵</span>
            <span className="voice-content">{content}</span>
          </div>
        );
      
      case MessageType.LINK_PREVIEW:
        try {
          const linkData = JSON.parse(content);
          return <LinkPreview data={linkData} />;
        } catch {
          return <LinkPreview data={{ url: content, title: content }} />;
        }
      
      case MessageType.FILE:
        return (
          <div className="file-message">
            <span className="file-icon">📎</span>
            <span className="file-name">{content}</span>
          </div>
        );
      
      case MessageType.INVITE:
        try {
          const invite = JSON.parse(content);
          return (
            <div className="invite-message">
              <span>🎉 邀请加入群组</span>
              <span className="invite-name">{invite.groupName}</span>
            </div>
          );
        } catch {
          return <div className="invite-message">{content}</div>;
        }
      
      default:
        return <div className="text-content">{content}</div>;
    }
  };

  const formatTime = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleView = useCallback(() => {
    if (burnAfterSec && onReply) {
      onReply(msgId);
    }
  }, [burnAfterSec, onReply, msgId]);

  const messageContent = (
    <>
      {renderContent()}
      <div className="message-meta">
        {replyTo && (
          <span className="reply-indicator">回复</span>
        )}
        <span className="message-time">{formatTime(timestamp)}</span>
      </div>
    </>
  );

  // Wrap with burnable if needed
  if (burnAfterSec) {
    return (
      <BurnableMessage
        message={{ msgId, from, type, content, timestamp, burnAfterSec } as any}
        remainingSeconds={remainingSeconds}
        onView={handleView}
        onBurn={() => onBurn?.(msgId)}
      >
        <div className={`message-bubble ${isOwn ? 'sent' : 'received'}`}>
          {messageContent}
        </div>
      </BurnableMessage>
    );
  }

  return (
    <div className={`message-bubble ${isOwn ? 'sent' : 'received'}`}>
      {messageContent}
    </div>
  );
}