import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import companyRoutes from '../routes/company.routes';
import tenantRoutes from '../routes/tenant.routes';
import authRoutes from '../routes/auth.routes';
import invoiceRoutes from '../routes/invoice.routes';
import statsRoutes from '../routes/stats.routes';
import gstRoutes from '../routes/gst.routes';
import ledgerRoutes from '../routes/ledger.routes';
import { isUsingMockData } from './mockData';

export async function createApp() {
  const app = express();

  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      /\.vercel\.app$/,
      process.env.FRONTEND_URL || '*',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Debug Logging Middleware
  app.use((req, res, next) => {
    console.log(`[API-DEBUG] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
  });

  // Simple Ping for external check
  app.get('/ping', (req, res) => res.send('pong'));

  // Status API
  app.get('/api/status', (req, res) => {
    res.json({ isDemo: isUsingMockData.value, database: isUsingMockData.value ? 'Local/Mock' : 'MongoDB Atlas' });
  });

  // API Routes
  app.use('/api/companies', companyRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/tenants', tenantRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/gst', gstRoutes);
  app.use('/api/ledger', ledgerRoutes);

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  });

  // Vite dev server (local only)
  // Production mein frontend Vercel pe serve hota hai — yahan sirf API
  if (process.env.NODE_ENV !== 'production') {
    try {
      const vite = await createViteServer({
        root: 'frontend',
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.log('Vite dev server skipped');
    }
  } else {
    // Production: API only — frontend is on Vercel
    app.get('/', (req, res) => {
      res.json({ status: 'ok', message: 'Neoteric Backend API is running', version: '1.0.0' });
    });
  }

  return app;
}
