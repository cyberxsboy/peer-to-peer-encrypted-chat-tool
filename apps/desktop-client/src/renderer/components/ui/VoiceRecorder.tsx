import React, { useState, useRef, useCallback, useEffect } from 'react';
import './VoiceRecorder.css';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  maxDuration?: number; // in seconds
}

export default function VoiceRecorder({
  onRecordingComplete,
  maxDuration = 60,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [maxDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleSend = useCallback(() => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, recordingTime);
      setAudioBlob(null);
      setRecordingTime(0);
    }
  }, [audioBlob, recordingTime, onRecordingComplete]);

  const handleCancel = useCallback(() => {
    setAudioBlob(null);
    setRecordingTime(0);
  }, []);

  const togglePlayback = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording && !audioBlob) {
    return (
      <button className="voice-recorder-btn" onClick={startRecording}>
        🎤 点击录制语音
      </button>
    );
  }

  if (isRecording) {
    return (
      <div className="voice-recorder-recording">
        <div className="recording-indicator">
          <span className="recording-dot"></span>
          <span>录音中</span>
        </div>
        <div className="recording-time">{formatTime(recordingTime)}</div>
        <div className="recording-actions">
          <button className="recording-cancel" onClick={stopRecording}>
            取消
          </button>
          <button className="recording-stop" onClick={stopRecording}>
            完成
          </button>
        </div>
      </div>
    );
  }

  if (audioBlob) {
    return (
      <div className="voice-recorder-preview">
        {audioBlob && (
          <audio
            ref={audioRef}
            src={URL.createObjectURL(audioBlob)}
            onEnded={() => setIsPlaying(false)}
          />
        )}
        
        <button className="preview-play" onClick={togglePlayback}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <div className="preview-time">{formatTime(recordingTime)}</div>
        
        <div className="preview-actions">
          <button className="preview-cancel" onClick={handleCancel}>
            取消
          </button>
          <button className="preview-send" onClick={handleSend}>
            发送
          </button>
        </div>
      </div>
    );
  }

  return null;
}