import { useState, useEffect, useCallback } from 'react';
import { FileInfo, ApiResponse, LoadingState } from '../types';

interface UseFilesReturn {
  files: FileInfo[];
  state: LoadingState;
  error: string | null;
  refetch: () => void;
  setFiles: React.Dispatch<React.SetStateAction<FileInfo[]>>;
}

export function useFiles(type: '3mf' | 'images'): UseFilesReturn {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [state, setState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (files.length === 0) {
      setState('loading');
    }
    setError(null);

    try {
      const endpoint = type === '3mf' ? '/api/files/3mf' : '/api/files/images';
      const response = await fetch(endpoint);
      const data: ApiResponse<FileInfo[]> = await response.json();

      if (data.success && data.data) {
        setFiles(data.data);
        setState('success');
      } else {
        setError(data.error || 'Unknown error');
        setState('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
      setState('error');
    }
  }, [type]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return { files, state, error, refetch: fetchFiles, setFiles };
}
