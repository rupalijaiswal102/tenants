import mongoose from 'mongoose';
import { InvoiceWorkflow, WORKFLOW_STEPS, ROLE_PERMISSIONS, getInvoiceStatus } from '../models/InvoiceWorkflow.js';
import { Invoice } from '../models/Invoice.js';

// ── Helper: get user from request ────────────────────────────────────────────
const getUser = (req) => {
  const user = req.user || {};
  return {
    id:   user._id || user.id || req.userId || null,
    name: user.name || user.email || 'Admin',
    role: user.role || req.userRole || 'Admin',
  };
};

// ── Helper: check role permission ────────────────────────────────────────────
const canPerformStep = (userRole, step) => {
  // Admin and Super Admin can do everything
  if (userRole === 'Admin' || userRole === 'Super Admin') return true;
  const allowed = ROLE_PERMISSIONS[userRole] || [];
  return allowed.includes(step);
};

// ── GET workflow for an invoice ───────────────────────────────────────────────
export const getWorkflow = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    let workflow = await InvoiceWorkflow.findOne({ invoiceId }).populate('auditLog.completedBy', 'name role');

    // Create if doesn't exist
    if (!workflow) {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      const user = getUser(req);
      try {
        workflow = new InvoiceWorkflow({
          invoiceId,
          completedSteps: ['GENERATED'],
          currentStatus: 'Pending Approval',
          auditLog: [{
            step:        'GENERATED',
            stepLabel:   WORKFLOW_STEPS.GENERATED.label,
            ...(user.id ? { completedBy: user.id } : {}),
            userName:    user.name,
            userRole:    user.role,
            notes:       'Invoice created',
          }],
        });
        await workflow.save();
      } catch (saveErr) {
        if (saveErr.code === 11000) {
          // Race condition: another concurrent request created it first — just fetch it
          workflow = await InvoiceWorkflow.findOne({ invoiceId }).populate('auditLog.completedBy', 'name role');
          if (!workflow) throw saveErr;
        } else {
          throw saveErr;
        }
      }
    }

    // Build full steps array with status
    const steps = Object.entries(WORKFLOW_STEPS).map(([key, meta]) => {
      const logEntry = workflow.auditLog.find(l => l.step === key && !l.undone);
      return {
        key,
        order:       meta.order,
        label:       meta.label,
        requiredRole:meta.role,
        completed:   workflow.completedSteps.includes(key),
        completedAt: logEntry?.completedAt || null,
        completedBy: logEntry?.userName    || null,
        userRole:    logEntry?.userRole    || null,
        notes:       logEntry?.notes       || '',
      };
    });

    res.json({
      invoiceId,
      currentStatus:  workflow.currentStatus,
      completedSteps: workflow.completedSteps,
      steps,
      auditLog:       workflow.auditLog.filter(l => !l.undone).sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt)),
      meta: {
        tallyVoucherId: workflow.tallyVoucherId,
        emailSentTo:    workflow.emailSentTo,
        dispatchMode:   workflow.dispatchMode,
        dispatchRef:    workflow.dispatchRef,
        paymentRef:     workflow.paymentRef,
        tallyReceiptId: workflow.tallyReceiptId,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── COMPLETE a workflow step ──────────────────────────────────────────────────
export const completeStep = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    const { step, notes = '', ...meta } = req.body;
    const user = getUser(req);

    // Validate step
    if (!WORKFLOW_STEPS[step]) return res.status(400).json({ error: `Invalid step: ${step}` });

    // Check permission
    if (!canPerformStep(user.role, step)) {
      return res.status(403).json({
        error: `Role '${user.role}' cannot complete step '${WORKFLOW_STEPS[step].label}'. Required: ${WORKFLOW_STEPS[step].role}`
      });
    }

    let workflow = await InvoiceWorkflow.findOne({ invoiceId });
    if (!workflow) {
      workflow = new InvoiceWorkflow({ invoiceId, completedSteps: [], auditLog: [] });
    }

    // Already completed check
    if (workflow.completedSteps.includes(step)) {
      return res.status(400).json({ error: `Step '${WORKFLOW_STEPS[step].label}' already completed` });
    }

    // Check order — must complete previous steps first (except Admin)
    if (user.role !== 'Admin' && user.role !== 'Super Admin') {
      const stepOrder = WORKFLOW_STEPS[step].order;
      const prevSteps = Object.entries(WORKFLOW_STEPS)
        .filter(([, v]) => v.order < stepOrder)
        .map(([k]) => k);
      const missingPrev = prevSteps.filter(s => !workflow.completedSteps.includes(s));
      if (missingPrev.length) {
        const missingLabel = WORKFLOW_STEPS[missingPrev[0]].label;
        return res.status(400).json({ error: `Complete '${missingLabel}' first` });
      }
    }

    // Save meta fields
    if (meta.tallyVoucherId) workflow.tallyVoucherId = meta.tallyVoucherId;
    if (meta.emailSentTo)    workflow.emailSentTo    = meta.emailSentTo;
    if (meta.dispatchMode)   workflow.dispatchMode   = meta.dispatchMode;
    if (meta.dispatchRef)    workflow.dispatchRef    = meta.dispatchRef;
    if (meta.paymentRef)     workflow.paymentRef     = meta.paymentRef;
    if (meta.tallyReceiptId) workflow.tallyReceiptId = meta.tallyReceiptId;
    if (meta.signatureImage) workflow.signatureImage = meta.signatureImage;

    // Add to completed steps + audit log
    workflow.completedSteps.push(step);
    const logEntry = {
      step,
      stepLabel:   WORKFLOW_STEPS[step].label,
      userName:    user.name,
      userRole:    user.role,
      notes,
      completedAt: new Date(),
    };
    if (user.id) logEntry.completedBy = user.id;
    workflow.auditLog.push(logEntry);

    try {
      await workflow.save();
    } catch (saveErr) {
      if (saveErr.code === 11000) {
        return res.status(400).json({ error: 'Workflow was updated concurrently, please refresh and try again' });
      }
      throw saveErr;
    }

    // Update invoice approved field if APPROVED step
    if (step === 'APPROVED') {
      await Invoice.findByIdAndUpdate(invoiceId, {
        approved:      true,
        approvedBy:    user.name,
        signatureImage: meta.signatureImage || workflow.signatureImage,
      });
    }

    res.json({
      success:       true,
      currentStatus: workflow.currentStatus,
      completedSteps:workflow.completedSteps,
      step,
      completedAt:   new Date(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── UNDO a workflow step (Admin only) ────────────────────────────────────────
export const undoStep = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    const { step } = req.body;
    const user = getUser(req);

    if (user.role !== 'Admin' && user.role !== 'Super Admin') return res.status(403).json({ error: 'Only Admin can undo steps' });

    const workflow = await InvoiceWorkflow.findOne({ invoiceId });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    // Remove from completed
    workflow.completedSteps = workflow.completedSteps.filter(s => s !== step);

    // Mark in audit log as undone
    const logEntry = workflow.auditLog.find(l => l.step === step && !l.undone);
    if (logEntry) { logEntry.undone = true; logEntry.undoneBy = user.name; logEntry.undoneAt = new Date(); }

    await workflow.save();
    res.json({ success: true, currentStatus: workflow.currentStatus });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── Dashboard pending counts ──────────────────────────────────────────────────
export const getWorkflowStats = async (req, res) => {
  try {
    const all = await InvoiceWorkflow.find({});

    const pendingApprovals    = all.filter(w => w.completedSteps.includes('GENERATED')        && !w.completedSteps.includes('APPROVED')).length;
    const pendingTallyEntry   = all.filter(w => w.completedSteps.includes('APPROVED')         && !w.completedSteps.includes('TALLY_ENTRY')).length;
    const pendingEmail        = all.filter(w => w.completedSteps.includes('TALLY_ENTRY')      && !w.completedSteps.includes('EMAIL_SENT')).length;
    const pendingDispatch     = all.filter(w => w.completedSteps.includes('EMAIL_SENT')       && !w.completedSteps.includes('DISPATCHED')).length;
    const pendingFiling       = all.filter(w => w.completedSteps.includes('DISPATCHED')       && !w.completedSteps.includes('FILING')).length;
    const pendingPayment      = all.filter(w => w.completedSteps.includes('FILING')           && !w.completedSteps.includes('PAYMENT_RECEIVED')).length;
    const pendingTallyReceipt = all.filter(w => w.completedSteps.includes('PAYMENT_RECEIVED') && !w.completedSteps.includes('TALLY_RECEIPT')).length;

    res.json({
      pendingApprovals,
      pendingTallyEntry,
      pendingEmail,
      pendingDispatch,
      pendingFiling,
      pendingPayment,
      pendingTallyReceipt,
      total: all.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET all invoices with workflow status (for filtered views) ────────────────
export const getWorkflowList = async (req, res) => {
  try {
    const { status, role } = req.query;
    let workflows = await InvoiceWorkflow.find({}).populate({ path: 'invoiceId', populate: { path: 'companyId', select: 'companyName' } });

    if (status) workflows = workflows.filter(w => w.currentStatus === status);

    res.json(workflows.map(w => ({
      workflowId:     w._id,
      invoiceId:      w.invoiceId?._id,
      invoiceNo:      w.invoiceId?.invoiceNo,
      partyName:      w.invoiceId?.partyName,
      company:        w.invoiceId?.company,
      totalInvoice:   w.invoiceId?.totalInvoice,
      billDate:       w.invoiceId?.billDate,
      currentStatus:  w.currentStatus,
      completedSteps: w.completedSteps,
      lastUpdated:    w.updatedAt,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};