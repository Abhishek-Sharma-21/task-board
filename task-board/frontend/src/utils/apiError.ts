import { isAxiosError } from 'axios';

/**
 * Safely extracts a user-friendly error message from any caught error.
 */
export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (isAxiosError(err)) {
    const serverMessage = err.response?.data?.message;
    if (typeof serverMessage === 'string' && serverMessage.trim()) {
      return serverMessage;
    }
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
