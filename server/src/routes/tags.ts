import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/tags
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT name FROM tags ORDER BY id ASC');
    const tags = result.rows.map((row) => row.name);
    return res.status(200).json({ tags });
  } catch (err: any) {
    return res.status(500).json({ errors: { server: [err.message] } });
  }
});

export default router;
