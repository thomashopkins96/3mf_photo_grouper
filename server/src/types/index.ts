export interface FileInfo {
  name: string;
  size: number;
  updated: string;
}

export interface GroupRequest {
  threeMfName: string;
  images: {
    originalName: string;
    newName: string;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
