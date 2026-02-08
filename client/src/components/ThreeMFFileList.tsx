import { useState } from 'react';
import { FileInfo } from '../types';

interface ThreeMFFileListProps {
  files: FileInfo[];
  currentFile: FileInfo | null;
  onFileSelect: (file: FileInfo) => void;
  onDeleteClick: (file: FileInfo) => void;
  onRename: (file: FileInfo, newName: string) => void;
}

export default function ThreeMFFileList({
  files,
  currentFile,
  onFileSelect,
  onDeleteClick,
  onRename,
}: ThreeMFFileListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (file: FileInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFile(file.name);
    setEditName(file.name.replace(/\.3mf$/i, ''));
  }

  const submitRename = (file: FileInfo) => {
    const newName = `${editName.trim()}.3mf`;
    if (editName.trim() && newName !== file.name) {
      onRename(file, newName);
    }
    setEditingFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, file: FileInfo) => {
    if (e.key === 'Enter') {
      submitRename(file);
    } else if (e.key === 'Escape') {
      setEditingFile(null);
    }
  }

  return (
    <div className="viewer-file-list">
      <div className="viewer-file-list-search">
        <input
          type="text"
          placeholder="Search 3MF files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="viewer-file-list-count">
        {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
      </div>
      <div className="viewer-file-list-items">
        {filteredFiles.map((file) => (
          <div
            key={file.name}
            className={`viewer-file-list-item ${file.name === currentFile?.name ? 'active' : ''}`}
            onClick={() => onFileSelect(file)}
          >
            {editingFile === file.name ? (
              <div className="viewer-file-list-item-edit" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => submitRename(file)}
                  onKeyDown={(e) => handleKeyDown(e, file)}
                  autoFocus
                />
                <span className="viewer-file-list-item-ext">.3mf</span>
              </div>
            ) : (
              <span className="viewer-file-list-item-name">{file.name}</span>
            )}
            <div className="viewer-file-list-item-actions">
              <button
                className="viewer-file-list-item-rename"
                onClick={(e) => startRename(file, e)}
                title="Rename file"
              >
                &#9998;
              </button>
              <button
                className="viewer-file-list-item-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClick(file);
                }}
                title="Delete file"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
