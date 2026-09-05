import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { isTokenRevoked } from '../redis';

export const JWT_SECRET = process.env.JWT_SECRET || 'articlehub-secret-key-12345';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    exp?: number;
    iat?: number;
  };
  rawToken?: string;
}

export function extractToken(authHeader: string): string {
  let token = authHeader.trim();
  // Strip repeated Token or Bearer prefixes if accidentally duplicated
  while (/^(Token|Bearer)\s+/i.test(token)) {
    token = token.replace(/^(Token|Bearer)\s+/i, '').trim();
  }
  return token;
}

export async function authRequired(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ errors: { authorization: ["can't be blank"] } });
  }

  const token = extractToken(authHeader);
  try {
    const revoked = await isTokenRevoked(token);
    if (revoked) {
      return res.status(401).json({ errors: { authorization: ['token has been revoked'] } });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    req.rawToken = token;
    next();
  } catch (err) {
    return res.status(401).json({ errors: { authorization: ['is invalid or expired'] } });
  }
}

export async function authOptional(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = extractToken(authHeader);
    try {
      const revoked = await isTokenRevoked(token);
      if (!revoked) {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = decoded;
        req.rawToken = token;
      } else {
        console.warn(`\x1b[33m[AuthOptional]\x1b[0m Token is revoked, treating request as unauthenticated.`);
      }
    } catch (err: any) {
      console.warn(`\x1b[33m[AuthOptional Warning]\x1b[0m Token verification failed: ${err.message}`);
    }
  }
  next();
}
