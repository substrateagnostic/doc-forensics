'use client';

import { useState, useCallback, useRef } from 'react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

const validTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const typeLabels: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/tiff': 'TIFF',
  'image/webp': 'WebP',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
};

export function FileUpload({
  onFilesSelected,
  accept = '.pdf,.jpg,.jpeg,.png,.tiff,.tif,.webp,.docx',
  maxSize = 50 * 1024 * 1024,
  maxFiles = 10,
  disabled = false,
  className = '',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!validTypes.includes(file.type)) {
        return `${file.name}: Unsupported file type`;
      }
      if (file.size > maxSize) {
        return `${file.name}: File too large (max ${formatBytes(maxSize)})`;
      }
      return null;
    },
    [maxSize]
  );

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const validFiles: File[] = [];
      const errors: string[] = [];

      fileArray.slice(0, maxFiles - files.length).forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        setError(errors.join('\n'));
      } else {
        setError(null);
      }

      if (validFiles.length > 0) {
        const updatedFiles = [...files, ...validFiles];
        setFiles(updatedFiles);
        onFilesSelected(updatedFiles);
      }
    },
    [files, maxFiles, validateFile, onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!disabled && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const removeFile = useCallback(
    (index: number) => {
      const updatedFiles = files.filter((_, i) => i !== index);
      setFiles(updatedFiles);
      onFilesSelected(updatedFiles);
    },
    [files, onFilesSelected]
  );

  const clearAll = useCallback(() => {
    setFiles([]);
    setError(null);
    onFilesSelected([]);
  }, [onFilesSelected]);

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer
          transition-all duration-200 backdrop-blur-sm
          ${isDragging ? 'border-forensic-highlight bg-forensic-highlight/10 scale-[1.02]' : 'border-gray-600 hover:border-forensic-highlight/50 bg-forensic-mid/30'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-forensic-highlight/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-forensic-highlight" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <div>
            <p className="text-lg font-semibold text-white mb-1">
              Drop files here or click to upload
            </p>
            <p className="text-sm text-gray-400">
              PDF, JPEG, PNG, TIFF, WebP, DOCX up to {formatBytes(maxSize)}
            </p>
            {maxFiles > 1 && (
              <p className="text-xs text-gray-500 mt-1">
                Up to {maxFiles} files at once
              </p>
            )}
          </div>
        </div>

        {isDragging && (
          <div className="absolute inset-0 rounded-2xl bg-forensic-highlight/5 flex items-center justify-center">
            <p className="text-forensic-highlight font-medium">Drop to upload</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400 whitespace-pre-line">{error}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{files.length} file(s) selected</span>
            <button onClick={clearAll} className="text-sm text-red-400 hover:text-red-300">
              Clear all
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3 bg-forensic-mid/50 rounded-xl border border-gray-700/50"
              >
                <div className="w-10 h-10 rounded-lg bg-forensic-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-white">
                    {typeLabels[file.type] || 'FILE'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
