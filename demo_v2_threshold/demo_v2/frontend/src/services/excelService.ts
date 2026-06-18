import { apiClient } from "./apiClient";
import type { ExcelImportBatch, ExcelApplyRequest } from "../types/excel";

export async function downloadExcelTemplate(): Promise<Blob> {
  const { data } = await apiClient.get("/excel/template", {
    responseType: "blob",
  });
  return data;
}

export async function uploadExcelFile(
  file: File,
  submissionId?: string
): Promise<ExcelImportBatch> {
  const formData = new FormData();
  formData.append("file", file);
  if (submissionId) {
    formData.append("submission_id", submissionId);
  }

  const { data } = await apiClient.post<ExcelImportBatch>(
    "/excel/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return data;
}

export async function getImportBatch(batchId: string): Promise<ExcelImportBatch> {
  const { data } = await apiClient.get<ExcelImportBatch>(`/excel/batch/${batchId}`);
  return data;
}

export async function applyExcelImportBatch(
  batchId: string,
  payload: ExcelApplyRequest
): Promise<ExcelImportBatch> {
  const { data } = await apiClient.post<ExcelImportBatch>(
    `/excel/batch/${batchId}/apply`,
    payload
  );
  return data;
}
