import { useState } from 'react';
import { SelectedImage, ApiResponse, LoadingState } from '../types';

interface UseGroupsReturn {
  saveGroup: (threeMfName: string, images: SelectedImage[]) => Promise<boolean>;
  state: LoadingState;
  error: string | null;
}

export function useGroups(): UseGroupsReturn {
  const [state, setState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const saveGroup = async (
    threeMfName: string,
    images: SelectedImage[]
    ): Promise<boolean> => {
      setState('loading');
      setError(null);

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threeMfName,
          images: images.map((img) => ({
            originalName: img.name,
            newName: img.newName,
          })),
        }),
      });

      const data: ApiResponse<string> = await response.json();

      if (data.success) {
        setState('success');
        return true;
      } else {
        setError(data.error || 'Failed to save group');
        setState('error');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setState('error');
      return false
    }
  };

  return { saveGroup, state, error };
}
