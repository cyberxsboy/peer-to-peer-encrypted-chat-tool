import React, { useRef, useState, useCallback } from 'react';
import './FileUploader.css';

interface FileUploaderProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
}

export default function FileUploader({
  onFileSelect,
  accept = '*',
  multiple = false,
  maxSize = 100 * 1024 * 1024, // 100MB default
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      setError(null);
      const fileArray = Array.from(files);
      const validFiles: File[] = [];

      for (const file of fileArray) {
        if (file.size > maxSize) {
          setError(`文件 ${file.name} 超过最大限制 ${formatFileSize(maxSize)}`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        setSelectedFiles(multiple ? validFiles : [validFiles[0]]);
        onFileSelect(multiple ? validFiles : [validFiles[0]]);
      }
    },
    [onFileSelect, multiple, maxSize]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect(newFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-uploader">
      <div
        className={`file-drop-zone ${dragActive ? 'active' : ''}`}
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <div className="drop-zone-content">
          <span className="drop-icon">📎</span>
          <span className="drop-text">
            {dragActive ? '释放以上传文件' : '拖拽文件到此处或点击选择'}
          </span>
          <span className="drop-hint">最大文件大小: {formatFileSize(maxSize)}</span>
        </div>
      </div>

      {error && <div className="file-error">{error}</div>}

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          {selectedFiles.map((file, index) => (
            <div key={index} className="file-item">
              <span className="file-icon">{getFileIcon(file.name)}</span>
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatFileSize(file.size)}</span>
              <button
                className="file-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const icons: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    ppt: '📽️',
    pptx: '📽️',
    txt: '📃',
    zip: '📦',
    rar: '📦',
    '7z': '📦',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    mp4: '🎬',
    mov: '🎬',
    avi: '🎬',
    mp3: '🎵',
    wav: '🎵',
  };
  return icons[ext || ''] || '📁';
}