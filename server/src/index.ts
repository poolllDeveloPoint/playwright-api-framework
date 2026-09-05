import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import { initDb } from './db';
import { connectRedis } from './redis';
import authRouter from './routes/auth';
import tagsRouter from './routes/tags';
import articlesRouter from './routes/articles';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

// HTTP Request Logger via morgan (Industry Standard)
app.use(morgan('dev', {
  skip: (req) => req.originalUrl.startsWith('/api-docs/') && req.originalUrl !== '/api-docs/'
}));

// 1. Swagger UI Setup
try {
  const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'ArticleHub API - Playwright Portfolio Docs',
    customCss: `
      .topbar { background-color: #1a1e24; }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
    `
  }));
} catch (err: any) {
  console.warn(`[Swagger] Warning loading swagger.yaml: ${err.message}`);
}

// 2. Health check route
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 3. API Routes
app.use('/api/users', authRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/articles', articlesRouter);

// 4. Server Bootstrapper
export async function startServer() {
  console.log('--- Starting ArticleHub Mock Server ---');
  
  // Initialize Database
  try {
    await initDb();
    console.log('[PostgreSQL] Database tables initialized & seeded.');
  } catch (err: any) {
    console.error(`[PostgreSQL] Database init error: ${err.message}`);
    console.warn(`[PostgreSQL] Ensure docker container is running (docker compose up -d)`);
  }

  // Connect Redis
  await connectRedis();

  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Mock API Server running at: http://localhost:${PORT}/api`);
    console.log(`📖 Swagger API Docs UI at:     http://localhost:${PORT}/api-docs`);
    console.log(`=======================================================`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

export default app;
