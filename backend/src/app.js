import express from 'express';
import cors from 'cors';
import companyRoutes    from '../routes/company.routes.js';
import tenantRoutes     from '../routes/tenant.routes.js';
import authRoutes       from '../routes/auth.routes.js';
import invoiceRoutes    from '../routes/invoice.routes.js';
import statsRoutes      from '../routes/stats.routes.js';
import gstRoutes        from '../routes/gst.routes.js';
import ledgerRoutes     from '../routes/ledger.routes.js';
import otherPartyRoutes  from '../routes/otherParty.routes.js';
import workflowRoutes    from '../routes/workflow.routes.js';
import userRoutes        from '../routes/user.routes.js';
import slackRoutes       from '../routes/slack.routes.js';
import { isUsingMockData } from './mockData.js';

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

  app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/ping', (req, res) => res.send('pong'));

  app.get('/api/status', (req, res) => {
    res.json({ isDemo: isUsingMockData.value, database: isUsingMockData.value ? 'Local/Mock' : 'MongoDB Atlas' });
  });

  app.use('/api/companies',     companyRoutes);
  app.use('/api/auth',          authRoutes);
  app.use('/api/tenants',       tenantRoutes);
  app.use('/api/invoices',      invoiceRoutes);
  app.use('/api/stats',         statsRoutes);
  app.use('/api/gst',           gstRoutes);
  app.use('/api/ledger',        ledgerRoutes);
  app.use('/api/other-parties', otherPartyRoutes);
  app.use('/api/workflow',      workflowRoutes);
  app.use('/api/users',         userRoutes);
  app.use('/api/slack',         slackRoutes);

  app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  });

  app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Neoteric Backend API is running', version: '1.0.0' });
  });

  return app;
}