import type { Request, Response, NextFunction } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    public errorCode: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    errorCode: 'NOT_FOUND',
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      details: err.details,
    });
    return;
  }
  // Log full error server-side; never expose stack to client
  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    errorCode: 'INTERNAL_ERROR',
  });
}
