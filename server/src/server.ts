import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { testDbConnection } from './config/db.js';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import labRoutes from './routes/laboratory.routes.js';
import instrumentRoutes from './routes/instrument.routes.js';

const app = express();

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration (restricted to client URL)
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// System Health Check Endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  const dbConnected = await testDbConnection();
  res.status(200).json({
    success: true,
    service: 'nawi-r76-api',
    status: dbConnected ? 'healthy' : 'degraded',
    details: {
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv
    }
  });
});

import testSessionRoutes from './routes/test-session.routes.js';

// Functional Modules
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/laboratories', labRoutes);
app.use('/api/instruments', instrumentRoutes);
app.use('/api', testSessionRoutes);

app.use('/api/reports', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Report Generation & QR will be available in Phase 4.'
    }
  });
});

// 404 Route Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested API endpoint does not exist.'
    }
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, async () => {
    console.log(`[NAWI R-76 API] Running at http://localhost:${config.port}`);
    console.log(`[NAWI R-76 API] Environment: ${config.nodeEnv}`);
    const isDbConnected = await testDbConnection();
    console.log(`[NAWI R-76 API] PostgreSQL Connection: ${isDbConnected ? 'ACTIVE' : 'FAILED'}`);
  });
}

export default app;
