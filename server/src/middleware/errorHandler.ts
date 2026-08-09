import { NextFunction, Request, Response } from "express";
import { AuthError } from "../services/AuthService";
import { AdminAuthError } from "../services/AdminService";
import {
  PhotoTooLargeError,
  ResumeAccessError,
  ResumeLimitError,
  ResumeNotFoundError,
  TemplateAccessError,
  VisibilityAccessError,
} from "../services/ResumeService";

const STATUS_BY_ERROR = [
  { type: AuthError, status: 401 },
  { type: AdminAuthError, status: 401 },
  { type: ResumeNotFoundError, status: 404 },
  { type: ResumeAccessError, status: 403 },
  { type: ResumeLimitError, status: 402 },
  { type: TemplateAccessError, status: 402 },
  { type: VisibilityAccessError, status: 402 },
  { type: PhotoTooLargeError, status: 400 },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const match = STATUS_BY_ERROR.find(({ type }) => err instanceof type);
  const status = match?.status ?? 500;
  const message = err instanceof Error ? err.message : "Unexpected server error.";
  const reason = err instanceof ResumeAccessError ? err.reason : undefined;
  if (status === 500) console.error(err);
  res.status(status).json({ error: message, ...(reason ? { reason } : {}) });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found." });
}
