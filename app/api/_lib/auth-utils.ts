import { NextRequest } from 'next/server';
import { QueryResultRow } from 'pg';
import { query } from '@/app/api/_lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
}

export interface AuthContext {
  userId: string;
  email: string;
  orgId: string | null; // Nullable for users without org (during onboarding)
  role?: string | null; // Nullable for users without org
}

// --------------------
// Basic auth helpers (server-only)
// --------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Authenticate a request and get user context with org_id
 * @param requiresOrg - If true, throws error if user has no org (default: true)
 * @throws Error if authentication fails
 */
export async function authenticateRequest(
  request: NextRequest,
  requiresOrg: boolean = true
): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization');
  const token = getTokenFromHeader(authHeader);

  if (!token) {
    throw new Error('No authentication token provided');
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new Error('Invalid or expired token');
  }

  // Get user's org_id from database (may be null for new users)
  const result = await query<
    { org_id: string | null; role: string | null } & QueryResultRow
  >(
    `SELECT om.org_id, om.role 
     FROM organization_members om 
     WHERE om.user_id = $1 
     LIMIT 1`,
    [payload.userId]
  );

  // Check if org is required but user has none
  if (requiresOrg && result.rows.length === 0) {
    throw new Error('User not associated with any organization');
  }

  return {
    userId: payload.userId,
    email: payload.email,
    orgId: result.rows[0]?.org_id || null,
    role: result.rows[0]?.role || null,
  };
}

/**
 * Require user to be org owner
 * @throws Error if user is not an owner
 */
export function requireOwner(authContext: AuthContext): void {
  if (authContext.role !== 'owner') {
    throw new Error('Owner access required');
  }
}

/**
 * Require user to be org admin or owner
 * @throws Error if user is not admin/owner
 */
export function requireAdmin(authContext: AuthContext): void {
  if (!authContext.role || !['owner', 'admin'].includes(authContext.role)) {
    throw new Error('Admin access required');
  }
}


