export interface FileInfo {
  name: string;
  size: number;
  updated: string;
}

export interface SelectedImage {
  name: string;
  newName: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

