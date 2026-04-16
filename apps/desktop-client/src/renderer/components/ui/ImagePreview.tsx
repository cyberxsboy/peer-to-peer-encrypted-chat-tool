import React, { useState, useCallback } from 'react';
import './ImagePreview.css';

interface ImagePreviewProps {
  src: string;
  thumbnail?: string;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export default function ImagePreview({
  src,
  thumbnail,
  onClick,
  size = 'medium',
}: ImagePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullscreen(false);
  };

  return (
    <>
      <div 
        className={`image-preview image-preview-${size} ${loaded ? 'loaded' : ''}`}
        onClick={handleClick}
      >
        <img
          src={thumbnail || src}
          alt="Preview"
          onLoad={() => setLoaded(true)}
          className="preview-image"
        />
        {!loaded && <div className="preview-loading">Loading...</div>}
      </div>

      {isFullscreen && (
        <div className="image-fullscreen" onClick={handleClose}>
          <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <img src={src} alt="Fullscreen" />
            <button className="fullscreen-close" onClick={handleClose}>
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}