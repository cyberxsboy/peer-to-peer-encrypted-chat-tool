import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '@shared/types';
import './BurnableMessage.css';

interface BurnableMessageProps {
  message: ChatMessage;
  children: React.ReactNode;
  remainingSeconds?: number | null;
  onView?: () => void;
  onBurn?: () => void;
  isPreview?: boolean;
}

export default function BurnableMessage({
  message,
  children,
  remainingSeconds,
  onView,
  onBurn,
  isPreview = false,
}: BurnableMessageProps) {
  const [viewed, setViewed] = useState(false);
  const [burning, setBurning] = useState(false);
  const [progress, setProgress] = useState(100);

  // Calculate progress percentage
  useEffect(() => {
    if (remainingSeconds !== null && remainingSeconds !== undefined && message.burnAfterSec) {
      const pct = (remainingSeconds / message.burnAfterSec) * 100;
      setProgress(pct);
    }
  }, [remainingSeconds, message.burnAfterSec]);

  const handleClick = useCallback(() => {
    if (!viewed && onView) {
      setViewed(true);
      onView();
    }
  }, [viewed, onView]);

  // Show burn animation
  const showBurnAnimation = useCallback(() => {
    setBurning(true);
    setTimeout(() => {
      if (onBurn) onBurn();
    }, 1000);
  }, [onBurn]);

  // Auto-burn when time's up
  useEffect(() => {
    if (remainingSeconds === 0) {
      showBurnAnimation();
    }
  }, [remainingSeconds, showBurnAnimation]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If not viewed yet, show cover
  if (!viewed && !isPreview) {
    return (
      <div className="burnable-message cover" onClick={handleClick}>
        <div className="burn-cover-content">
          <span className="burn-icon">🔥</span>
          <span className="burn-text">阅后即焚</span>
          <span className="burn-hint">点击查看</span>
          {message.burnAfterSec && (
            <span className="burn-timer-preview">
              {formatTime(message.burnAfterSec)}后焚毁
            </span>
          )}
        </div>
      </div>
    );
  }

  // If burning, show animation
  if (burning) {
    return (
      <div className="burnable-message burning">
        <div className="burn-animation">
          <span className="fire">🔥</span>
          <span className="burn-text">焚毁中...</span>
        </div>
      </div>
    );
  }

  // Show message with countdown
  return (
    <div className={`burnable-message ${isPreview ? 'preview' : ''}`}>
      <div className="burn-progress" style={{ width: `${progress}%` }} />
      {children}
      {remainingSeconds !== null && remainingSeconds !== undefined && !isPreview && (
        <div className="burn-timer">
          <span className="burn-icon-small">🔥</span>
          <span>{formatTime(remainingSeconds)}</span>
        </div>
      )}
    </div>
  );
}