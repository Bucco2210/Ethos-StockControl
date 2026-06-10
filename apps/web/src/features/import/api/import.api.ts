import { apiClient } from '@/lib/api-client';

export interface UploadResult {
  jobId: string;
  sheetNames?: string[];
  headers: string[];
  autoMapping: Record<string, string>;
  totalRows: number;
  sampleRows: Record<string, unknown>[];
  autoParsed?: boolean;
  parserKey?: string;
  warnings?: Array<{ line?: number; message: string }>;
}

export interface PreviewRow {
  rowNumber: number;
  data: Record<string, unknown>;
  status: 'valid' | 'error' | 'duplicate';
  errors?: string[];
}

export interface PreviewResult {
  jobId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  preview: PreviewRow[];
}

export interface ConfirmResult {
  jobId: string;
  status: string;
  productsCreated: number;
  familiesCreated: number;
  subfamiliesCreated: number;
  /** Only populated for supplier imports */
  supplierProductsCreated?: number;
  /** Only populated for supplier imports */
  supplierProductsUpdated?: number;
  errors: Array<{ row: number; message: string }>;
}

export const importApi = {
  // ─── Standard Product Import ───
  upload: async (
    file: File,
    sheetName?: string,
    onProgress?: (pct: number) => void,
  ): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    if (sheetName) formData.append('sheetName', sheetName);
    const res = await apiClient.post('/import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return res.data;
  },

  preview: async (
    jobId: string,
    file: File,
    mapping: Record<string, string>,
    sheetName?: string,
  ): Promise<PreviewResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    if (sheetName) formData.append('sheetName', sheetName);
    const res = await apiClient.post(`/import/${jobId}/preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  confirm: async (jobId: string): Promise<ConfirmResult> => {
    const res = await apiClient.post(`/import/${jobId}/confirm`);
    return res.data;
  },

  // ─── Supplier Product Import ───
  uploadSupplier: async (
    file: File,
    supplierId: string,
    sheetName?: string,
    onProgress?: (pct: number) => void,
  ): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('supplierId', supplierId);
    if (sheetName) formData.append('sheetName', sheetName);
    const res = await apiClient.post('/import/supplier/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return res.data;
  },

  previewSupplier: async (
    jobId: string,
    file: File,
    mapping: Record<string, string>,
    sheetName?: string,
  ): Promise<PreviewResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    if (sheetName) formData.append('sheetName', sheetName);
    const res = await apiClient.post(`/import/supplier/${jobId}/preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  confirmSupplier: async (jobId: string): Promise<ConfirmResult> => {
    const res = await apiClient.post(`/import/supplier/${jobId}/confirm`);
    return res.data;
  },

  impactStockSupplier: async (
    jobId: string,
  ): Promise<{
    jobId: string;
    productsCreated: number;
    productsUpdated: number;
    errors: Array<{ row: number; message: string }>;
  }> => {
    const res = await apiClient.post(`/import/supplier/${jobId}/impact-stock`);
    return res.data;
  },

  getSupplierHistory: async (): Promise<SupplierImportJob[]> => {
    const res = await apiClient.get('/import/supplier/history');
    return res.data;
  },

  revertSupplier: async (
    jobId: string,
  ): Promise<{
    jobId: string;
    restored: number;
    deleted: number;
    errors: Array<{ message: string }>;
  }> => {
    const res = await apiClient.post(`/import/supplier/${jobId}/revert`);
    return res.data;
  },
};

export interface SupplierImportJob {
  _id: string;
  fileName: string;
  originalName: string;
  status: 'pending' | 'processing' | 'preview' | 'completed' | 'failed' | 'reverted';
  totalRows: number;
  validRows: number;
  errorRows: number;
  supplierId?: { _id: string; name: string; code?: string } | string;
  uploadedBy?: { _id: string; firstName: string; lastName: string } | string;
  revertedBy?: { _id: string; firstName: string; lastName: string } | string;
  completedAt?: string;
  revertedAt?: string;
  createdAt: string;
  result?: {
    supplierProductsCreated?: number;
    supplierProductsUpdated?: number;
  };
}
