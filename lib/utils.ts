import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Lightweight HTTP response helpers for API handlers
export const http = {
  ok: (data?: any) => ({ body: data ?? { success: true }, init: { status: 200 } }),
  badRequest: (message: string, details?: any) => ({ body: { error: message, details }, init: { status: 400 } }),
  notFound: (message = 'Not found') => ({ body: { error: message }, init: { status: 404 } }),
  serverError: (message = 'Internal server error') => ({ body: { error: message }, init: { status: 500 } }),
}

