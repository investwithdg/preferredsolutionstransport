import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// API Response types
export type ApiError = {
  error: string;
  details?: string | Record<string, any>;
  code?: string;
};

export type ApiSuccess<T = any> = T;

// Common HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Creates a standardized error response
 */
export function errorResponse(
  error: string,
  status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details?: string | Record<string, any>
): NextResponse<ApiError> {
  const body: ApiError = { error };
  if (details) {
    body.details = details;
  }
  
  return NextResponse.json(body, { status });
}

/**
 * Creates a standardized success response
 */
export function successResponse<T>(
  data: T,
  status: number = HTTP_STATUS.OK
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(data, { status });
}

/**
 * Handles Zod validation errors
 */
export function handleValidationError(error: z.ZodError): NextResponse<ApiError> {
  return errorResponse(
    'Invalid input data',
    HTTP_STATUS.BAD_REQUEST,
    error.flatten().fieldErrors
  );
}

/**
 * Generic error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse<ApiError> {
  console.error('API Error:', error);
  
  if (error instanceof z.ZodError) {
    return handleValidationError(error);
  }
  
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error';
    
    return errorResponse(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  
  return errorResponse('An unexpected error occurred', HTTP_STATUS.INTERNAL_SERVER_ERROR);
}

/**
 * Wraps an API handler with error handling
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>
) {
  return async (...args: T): Promise<NextResponse<R | ApiError>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Validates request body with a Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

/**
 * Gets the base URL for the application
 */
export function getBaseUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : (process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : `${request.nextUrl.protocol}//${request.nextUrl.host}`));
}