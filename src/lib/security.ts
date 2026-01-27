/**
 * Security Utilities for Chama App
 * Provides input validation, XSS protection, and rate limiting
 */

import { z } from 'zod';

// ===========================================
// INPUT VALIDATION SCHEMAS
// ===========================================

/** Email validation with length limits */
export const emailSchema = z
  .string()
  .trim()
  .email({ message: 'Invalid email address' })
  .max(255, { message: 'Email must be less than 255 characters' })
  .toLowerCase();

/** Phone number validation (Kenyan format) */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+254|254|0)?[17]\d{8}$/, { 
    message: 'Invalid phone number. Use format: 0712345678 or +254712345678' 
  })
  .transform((val) => {
    // Normalize to +254 format
    let phone = val.replace(/\s/g, '');
    if (phone.startsWith('0')) {
      phone = '+254' + phone.substring(1);
    } else if (phone.startsWith('254')) {
      phone = '+' + phone;
    } else if (!phone.startsWith('+')) {
      phone = '+254' + phone;
    }
    return phone;
  });

/** Password validation with strength requirements */
export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(128, { message: 'Password must be less than 128 characters' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' });

/** Full name validation */
export const nameSchema = z
  .string()
  .trim()
  .min(2, { message: 'Name must be at least 2 characters' })
  .max(100, { message: 'Name must be less than 100 characters' })
  .regex(/^[a-zA-Z\s'-]+$/, { message: 'Name can only contain letters, spaces, hyphens, and apostrophes' });

/** Amount validation for contributions/loans */
export const amountSchema = z
  .number()
  .positive({ message: 'Amount must be positive' })
  .min(10, { message: 'Minimum amount is KES 10' })
  .max(1000000, { message: 'Maximum amount is KES 1,000,000' });

/** Generic text field with XSS protection */
export const safeTextSchema = z
  .string()
  .trim()
  .max(1000, { message: 'Text must be less than 1000 characters' })
  .transform((val) => sanitizeHtml(val));

// ===========================================
// XSS PROTECTION
// ===========================================

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes all HTML tags and encodes special characters
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;')
    .replace(/=/g, '&#x3D;');
}

/**
 * Sanitize input for use in URLs
 */
export function sanitizeForUrl(input: string): string {
  if (!input) return '';
  return encodeURIComponent(input.trim());
}

/**
 * Validate and sanitize UUID
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ===========================================
// RATE LIMITING (Client-side)
// ===========================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Client-side rate limiter
 * @param key - Unique identifier for the action (e.g., 'login', 'api-call')
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up expired entries
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(key);
  }

  const current = rateLimitStore.get(key);

  if (!current) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

/**
 * Get remaining time until rate limit resets (in seconds)
 */
export function getRateLimitResetTime(key: string): number {
  const entry = rateLimitStore.get(key);
  if (!entry) return 0;
  
  const remaining = Math.max(0, entry.resetTime - Date.now());
  return Math.ceil(remaining / 1000);
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// ===========================================
// CSRF PROTECTION
// ===========================================

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store CSRF token in sessionStorage
 */
export function storeCsrfToken(token: string): void {
  try {
    sessionStorage.setItem('csrf_token', token);
  } catch {
    // Session storage not available
  }
}

/**
 * Get stored CSRF token
 */
export function getCsrfToken(): string | null {
  try {
    return sessionStorage.getItem('csrf_token');
  } catch {
    return null;
  }
}

// ===========================================
// SESSION SECURITY
// ===========================================

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
let lastActivityTime = Date.now();
let sessionTimeoutCallback: (() => void) | null = null;

/**
 * Update last activity timestamp
 */
export function updateLastActivity(): void {
  lastActivityTime = Date.now();
}

/**
 * Check if session has timed out due to inactivity
 */
export function isSessionExpired(): boolean {
  return Date.now() - lastActivityTime > SESSION_TIMEOUT_MS;
}

/**
 * Start session timeout monitoring
 */
export function startSessionMonitor(onTimeout: () => void): void {
  sessionTimeoutCallback = onTimeout;
  
  // Check every minute
  setInterval(() => {
    if (isSessionExpired() && sessionTimeoutCallback) {
      sessionTimeoutCallback();
    }
  }, 60000);

  // Update activity on user interactions
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, updateLastActivity, { passive: true });
  });
}

// ===========================================
// SECURE LOGGING (No Sensitive Data)
// ===========================================

/**
 * Safe logger that masks sensitive data
 */
export const secureLog = {
  info: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, maskSensitiveData(data));
    }
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, maskSensitiveData(data));
  },
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error?.message);
  },
};

/**
 * Mask sensitive fields in log data
 */
function maskSensitiveData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined;
  
  const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'phone', 'email'];
  const masked = { ...data };
  
  for (const key of Object.keys(masked)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      masked[key] = '***MASKED***';
    }
  }
  
  return masked;
}

// ===========================================
// REQUEST VALIDATION
// ===========================================

/**
 * Validate request payload size
 */
export function validatePayloadSize(data: unknown, maxSizeBytes: number = 1024 * 100): boolean {
  const size = new Blob([JSON.stringify(data)]).size;
  return size <= maxSizeBytes;
}

/**
 * Check if request origin is trusted
 */
export function isTrustedOrigin(origin: string): boolean {
  const trustedOrigins = [
    window.location.origin,
    'https://ukqyvrptezkshebdzcrh.supabase.co',
    'https://id-preview--99668365-71ff-4751-a51d-83f3b05f728c.lovable.app',
  ];
  return trustedOrigins.includes(origin);
}
