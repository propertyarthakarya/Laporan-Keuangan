import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Central error handler — converts Zod validation errors and Prisma errors
// into clear, user-friendly messages.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const first = err.errors[0];
    const message = first
      ? `${first.path.join('.') || 'field'}: ${first.message}`
      : 'Invalid input.';
    return res.status(400).json({ error: message });
  }

  if (err instanceof Error && err.message.includes('Unique constraint')) {
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }

  if (err instanceof Error && err.message.includes('Foreign key constraint')) {
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Something went wrong on the server.' });
}
