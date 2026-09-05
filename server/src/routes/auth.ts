import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { pool } from '../db';
import { JWT_SECRET, authRequired, AuthenticatedRequest } from '../middleware/auth';
import { revokeToken } from '../redis';

const router = Router();

// POST /api/users/login
router.post('/login', async (req: Request, res: Response) => {
  const { user } = req.body || {};
  if (!user || !user.email || !user.password) {
    return res.status(422).json({
      errors: {
        email: !user?.email ? ["can't be blank"] : undefined,
        password: !user?.password ? ["can't be blank"] : undefined,
      },
    });
  }

  try {
    const queryRes = await pool.query('SELECT * FROM users WHERE email = $1', [user.email]);
    if (queryRes.rows.length === 0 || queryRes.rows[0].password !== user.password) {
      return res.status(401).json({
        errors: { 'email or password': ['is invalid'] },
      });
    }

    const dbUser = queryRes.rows[0];
    const token = jwt.sign(
      {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        jti: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      user: {
        email: dbUser.email,
        token: token,
        username: dbUser.username,
        bio: dbUser.bio,
        image: dbUser.image,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ errors: { server: [err.message] } });
  }
});

// POST /api/users (Register / User creation)
router.post('/', async (req: Request, res: Response) => {
  const { user } = req.body || {};
  const username = user?.username;
  const email = user?.email;
  const password = user?.password;

  const errors: Record<string, string[]> = {};

  if (typeof username === 'string') {
    if (username.length < 3) {
      errors.username = ['is too short (minimum is 3 characters)'];
    } else if (username.length > 20) {
      errors.username = ['is too long (maximum is 20 characters)'];
    }
  } else {
    errors.username = ["can't be blank"];
  }

  if (!email) {
    errors.email = ["can't be blank"];
  }
  if (!password) {
    errors.password = ["can't be blank"];
  }

  // If there are validation errors, return 422
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ errors });
  }

  try {
    const existing = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length > 0) {
      return res.status(422).json({
        errors: { username: ['has already been taken'] },
      });
    }

    const insertRes = await pool.query(
      `INSERT INTO users (username, email, password, bio, image)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [username, email, password, null, 'https://api.realworld.io/images/smiley-cyrus.jpg']
    );

    const newUser = insertRes.rows[0];
    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        jti: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      user: {
        email: newUser.email,
        token: token,
        username: newUser.username,
        bio: newUser.bio,
        image: newUser.image,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ errors: { server: [err.message] } });
  }
});

// POST /api/users/logout (Revoke JWT token via Redis blocklist)
router.post('/logout', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.rawToken;
    if (!token) {
      return res.status(401).json({ errors: { authorization: ["can't be blank"] } });
    }

    // Calculate remaining TTL from token exp or default to 7 days
    const exp = req.user?.exp;
    const nowInSec = Math.floor(Date.now() / 1000);
    const remainingTtl = exp && exp > nowInSec ? exp - nowInSec : 7 * 24 * 3600;

    await revokeToken(token, remainingTtl);
    return res.status(200).json({ message: 'Successfully logged out' });
  } catch (err: any) {
    return res.status(500).json({ errors: { server: [err.message] } });
  }
});

export default router;
