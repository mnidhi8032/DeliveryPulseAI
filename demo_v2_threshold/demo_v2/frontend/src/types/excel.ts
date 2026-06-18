export interface ExcelImportRowPreview {
  id: string;
  metric_code: string;
  raw_value: string | null;
  parsed_value: number | null;
  validation_errors: string[];
  row_number: number;
}

export interface ExcelImportBatch {
  id: string;
  filename: string;
  status: string;
  submission_id: string | null;
  uploaded_at: string;
  validation_summary: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    error_count: number;
  } | null;
  rows: ExcelImportRowPreview[];
}

export interface ExcelApplyRowEdit {
  metric_code: string;
  value: number | string;
}

export interface ExcelApplyRequest {
  submission_id: string;
  rows: ExcelApplyRowEdit[] | null;
}
