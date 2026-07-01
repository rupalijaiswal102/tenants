import express from 'express';
import { getWorkflow, completeStep, undoStep, updateStepMeta, getWorkflowStats, getWorkflowList } from '../controllers/workflow.controller.js';
import { authMiddleware } from './auth.routes.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/stats',                getWorkflowStats);
router.get('/list',                 getWorkflowList);
router.get('/:invoiceId',           getWorkflow);
router.post('/:invoiceId/complete', completeStep);
router.post('/:invoiceId/undo',      undoStep);
router.patch('/:invoiceId/step-meta', updateStepMeta);

export default router;