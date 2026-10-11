import { logger } from './logger';

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export function readableServiceError(error: unknown) {
  if (error instanceof ServiceError) return error;
  const rawMessage = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error && typeof error.message === 'string'
      ? error.message
      : null;
  const rawCode = typeof error === 'object' && error && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'unexpected_error';

  if (rawMessage) {
    const message = rawMessage.toLowerCase();
    logger.error('service', error, { code: rawCode });
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('abort')) {
      return new ServiceError("You're offline or the connection timed out. Connect to the internet and try again.", 'network_error', error);
    }
    if (message.includes('jwt') || message.includes('auth_required') || message.includes('session') || message.includes('refresh token')) {
      return new ServiceError('Your session has expired. Please sign in again.', 'auth_required', error);
    }
    if (rawCode === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
      return new ServiceError('You do not have permission to do that.', 'permission_denied', error);
    }
    if (rawCode === '23505' || message.includes('duplicate key')) {
      return new ServiceError('That username or connection already exists.', 'duplicate_record', error);
    }
    if (message.includes('not found')) {
      return new ServiceError('That item is no longer available.', 'not_found', error);
    }
    return new ServiceError('Something went wrong. Please try again.', rawCode, error);
  }
  return new ServiceError('Something went wrong. Please try again.', 'unexpected_error', error);
}
