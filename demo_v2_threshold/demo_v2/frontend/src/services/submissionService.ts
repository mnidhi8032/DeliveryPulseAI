import type { Submission, SubmissionCreatePayload } from "../types/submission";
import { apiClient } from "./apiClient";

export async function listSubmissions(): Promise<Submission[]> {
  const { data } = await apiClient.get<Submission[]>("/submissions");
  return data;
}

export async function getSubmission(submissionId: string): Promise<Submission> {
  const { data } = await apiClient.get<Submission>(`/submissions/${submissionId}`);
  return data;
}

export async function createDraftSubmission(payload: SubmissionCreatePayload): Promise<Submission> {
  const { data } = await apiClient.post<Submission>("/submissions", payload);
  return data;
}

export async function submitSubmission(submissionId: string): Promise<Submission> {
  const { data } = await apiClient.post<Submission>(`/submissions/${submissionId}/submit`);
  return data;
}

export async function approveSubmission(submissionId: string): Promise<Submission> {
  const { data } = await apiClient.post<Submission>(`/submissions/${submissionId}/approve`);
  return data;
}

export async function rejectSubmission(
  submissionId: string,
  reviewComments: string,
): Promise<Submission> {
  const { data } = await apiClient.post<Submission>(`/submissions/${submissionId}/reject`, {
    review_comments: reviewComments,
  });
  return data;
}

export async function reopenSubmission(
  submissionId: string,
  reviewComments: string,
): Promise<Submission> {
  const { data } = await apiClient.post<Submission>(`/submissions/${submissionId}/reopen`, {
    review_comments: reviewComments,
  });
  return data;
}

export async function lockSubmission(submissionId: string): Promise<Submission> {
  const { data } = await apiClient.post<Submission>(`/submissions/${submissionId}/lock`);
  return data;
}

export async function deleteSubmission(submissionId: string): Promise<void> {
  await apiClient.delete(`/submissions/${submissionId}`);
}
