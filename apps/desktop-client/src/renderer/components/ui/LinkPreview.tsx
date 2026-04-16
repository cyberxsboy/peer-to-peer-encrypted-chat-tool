import React, { useState, useCallback } from 'react';
import './LinkPreview.css';

interface LinkPreviewData {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
}

interface LinkPreviewProps {
  data?: LinkPreviewData;
  loading?: boolean;
  onLoadPreview?: (url: string) => void;
}

export default function LinkPreview({
  data,
  loading = false,
  onLoadPreview,
}: LinkPreviewProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (url && onLoadPreview) {
        onLoadPreview(url);
      }
    },
    [url, onLoadPreview]
  );

  const openLink = useCallback(() => {
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  }, [data?.url]);

  if (loading) {
    return (
      <div className="link-preview loading">
        <div className="loading-spinner"></div>
        <span>正在获取链接预览...</span>
      </div>
    );
  }

  if (!data && onLoadPreview) {
    return (
      <form onSubmit={handleSubmit} className="link-input-form">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="输入链接地址..."
          className="link-input"
        />
        <button type="submit" className="link-submit">
          获取预览
        </button>
      </form>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="link-preview" onClick={openLink}>
      {data.image && (
        <div className="link-image">
          <img src={data.image} alt={data.title} />
        </div>
      )}
      <div className="link-content">
        {data.siteName && <span className="link-site">{data.siteName}</span>}
        <div className="link-title">{data.title}</div>
        {data.description && (
          <div className="link-description">{data.description}</div>
        )}
        <div className="link-url">{data.url}</div>
      </div>
    </div>
  );
}