import { useState } from 'react';
import { ApiResponse, LoadingState } from '../types';

interface UseFileActionsReturn {
  deleteFile: (fileName: string) => Promise<boolean>;
  renameFile: (oldName: string, newName: string) => Promise<boolean>;
  deleteImage: (fileName: string) => Promise<boolean>;
  state: LoadingState;
  error: string | null;
}

export function useFileActions(): UseFileActionsReturn {
  const [state, setState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const deleteFile = async (fileName: string): Promise<boolean> => {
    setState('loading');
    setError(null);

    try {
      const response = await fetch(`/api/files/3mf/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });

      const data: ApiResponse<string> = await response.json();

      if (data.success) {
        setState('success');
        return true;
      } else {
        setError(data.error || 'Failed to delete file');
        setState('error');
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setState('error');
      return false;
    }
  };

  const renameFile = async (oldName: string, newName: string): Promise<boolean> => {
    setState('loading');
    setError(null);

    try {
      const response = await fetch(`/api/files/3mf/${encodeURIComponent(oldName)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      });

      const data: ApiResponse<string> = await response.json();

      if (data.success) {
        setState('success');
        return true;
      } else {
        setError(data.error || 'Failed to rename file');
        setState('error');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename');
      setState('error')
      return false;
    }
  };

  const deleteImage = async (fileName: string): Promise<boolean> => {
    setState('loading');
    setError(null);

    try {
      const response = await fetch(`api/files/image/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });

      const data: ApiResponse<string> = await response.json();

      if (data.success) {
        setState('success');
        return true;
      } else {
        setError(data.error || 'Failed to delete image');
        setState('error');
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setState('error');
      return false;
    }
  };

  return { deleteFile, renameFile, deleteImage, state, error };
}
