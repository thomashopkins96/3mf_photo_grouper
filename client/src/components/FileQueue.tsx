import { useState } from 'react';
import { FileInfo } from '../types';

interface FileQueueProps {
  files: FileInfo[];
  currentFile: FileInfo | null;
  onFileSelect: (file: FileInfo) => void;
  onSaveClick: () => void;
  canSave: boolean;
}

export default function FileQueue({
  files,
  currentFile,
  onFileSelect,
  onSaveClick,
  canSave,
}: FileQueueProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentIndex = currentFile
    ? files.findIndex((f) => f.name === currentFile.name)
    : -1;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onFileSelect(filteredFiles[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredFiles.length - 1) {
      onFileSelect(filteredFiles[currentIndex + 1]);
    }
  };

  return (
    <div className="file-queue">
      <div className="file-queue-nav">
        <div className="file-queue-search">
          <input
            type="text"
            placeholder="Search 3MF files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="file-queue-position">
          {currentIndex >= 0 ? currentIndex + 1 : 0} / {filteredFiles.length}
        </span>
        <button onClick={handlePrevious} disabled={currentIndex <= 0}>
          Previous
        </button>
        <button onClick={handleNext} disabled={currentIndex >= files.length - 1}>
          Next
        </button>
      </div>

      <div className="file-queue-current">
        {currentFile ? (
          <>
            <span className="file-queue-name">{currentFile.name}</span>
            <button
              className="file-queue-save"
              onClick={onSaveClick}
              disabled={!canSave}
            >
              Save Group
            </button>
          </>
        ) : (
          <span className="file-queue-empty">
            {files.length > 0 ? 'Select a file to begin' : 'No 3MF files found'}
          </span>
        )}
      </div>

      <div className="file-queue-list">
        {filteredFiles.map((file, index) => (
          <div
            key={file.name}
            className={`file-queue-item ${file.name === currentFile?.name ? 'active': ''}`}
            onClick={() => onFileSelect(file)}
          >
            <span className="file-queue-item-index">{index + 1}</span>
            <span className="file-queue-item-name">{file.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
