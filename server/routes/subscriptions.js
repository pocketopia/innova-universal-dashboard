/**
 * Subscription Routes
 * Handles subscription checkout, cancellation flow, and billing
 */

const express = require('express');
const router = express.Router();
const subscriptionService = require('../services/subscriptionService');
const { authenticate, requireActiveSubscription } = require('../middleware/auth');

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', (req, res) => {
  try {
    const plans = subscriptionService.getPlans();

    res.json({
      success: true,
      plans: plans.map(p => ({
        ...p,
        // Format amount for display
        displayPrice: `$${(p.amount / 100).toFixed(2)}/${p.interval}`
      }))
    });
  } catch (error) {
    console.error('[SUBSCRIPTION] Get plans error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch subscription plans'
    });
  }
});

/**
 * GET /api/subscriptions/current
 * Get current user's subscription
 */
router.get('/current', authenticate, (req, res) => {
  try {
    const subscription = subscriptionService.getCurrentSubscription(req.userId);
    const trialUsed = subscriptionService.hasUsedTrial(req.userId);

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        trialEligible: !trialUsed
      });
    }

    res.json({
      success: true,
      subscription: {
        ...subscription,
        displayPrice: `$${(subscription.amount / 100).toFixed(2)}/${subscription.interval}`,
        daysRemaining: subscription.currentPeriodEnd
          ? Math.max(0, Math.floor((subscription.currentPeriodEnd - Math.floor(Date.now() / 1000)) / 86400))
          : 0,
        trialDaysRemaining: subscription.trialEnd
          ? Math.max(0, Math.floor((subscription.trialEnd - Math.floor(Date.now() / 1000)) / 86400))
          : 0
      },
      trialEligible: !trialUsed && subscription.status !== 'trialing'
    });
  } catch (error) {
    console.error('[SUBSCRIPTION] Get current error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch subscription'
    });
  }
});

/**
 * POST /api/subscriptions/checkout
 * Start subscription checkout (with trial option)
 */
router.post('/checkout', authenticate, (req, res) => {
  try {
    const { planId, useTrial = true, paymentMethodId } = req.body;

    if (!planId) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Plan ID is required'
      });
    }

    // Check if user already has a subscription
    const existing = subscriptionService.getCurrentSubscription(req.userId);
    if (existing) {
      return res.status(400).json({
        error: 'already_subscribed',
        message: 'You already have an active subscription',
        currentSubscription: {
          planName: existing.planName,
          status: existing.status
        }
      });
    }

    // Check trial eligibility
    const trialUsed = subscriptionService.hasUsedTrial(req.userId);
    const effectiveUseTrial = useTrial && !trialUsed;

    const subscription = subscriptionService.createSubscription(req.userId, planId, {
      useTrial: effectiveUseTrial,
      paymentMethodId
    });

    res.status(201).json({
      success: true,
      message: effectiveUseTrial
        ? 'Trial started! You have 14 days free.'
        : 'Subscription activated!',
      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        planName: subscription.planName,
        status: subscription.status,
        amount: subscription.amount,
        currency: subscription.currency,
        interval: subscription.interval,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        nextBillingDate: subscription.nextBillingDate,
        trialUsed: subscription.trialUsed,
        displayPrice: `$${(subscription.amount / 100).toFixed(2)}/${subscription.interval}`
      }
    });
  } catch (error) {
    console.error('[SUBSCRIPTION] Checkout error:', error);

    if (error.message === 'Plan not found') {
      return res.status(404).json({
        error: 'plan_not_found',
        message: error.message
      });
    }

    if (error.message === 'User already has an active subscription') {
      return res.status(400).json({
        error: 'already_subscribed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'checkout_failed',
      message: 'Failed to create subscription'
    });
  }
});

/**
 * POST /api/subscriptions/cancel/initiate
 * Start cancellation flow (shows confirmation prompt)
 */
router.post('/cancel/initiate', authenticate, requireActiveSubscription, (req, res) => {
  try {
    const result = subscriptionService.initiateCancellation(req.userId);

    res.json({
      success: true,
      requiresConfirmation: true,
      subscription: result.subscription,
      message: result.message,
      surveyRequired: true,
      surveyOptions: {
        reasons: [
          { value: 'too_expensive', label: 'Too expensive' },
          { value: 'not_using', label: 'Not using enough' },
          { value: 'found_alternative', label: 'Found an alternative' },
          { value: 'technical_issues', label: 'Technical issues' },
          { value: 'other', label: 'Other' }
        ],
        wouldReturnScale: {
          min: 1,
          max: 5,
          minLabel: 'Very unlikely',
          maxLabel: 'Very likely'
        }
      }
    });
  } catch (error) {
    console.error('[SUBSCRIPTION] Cancel initiate error:', error);

    if (error.message === 'No active subscription found') {
      return res.status(404).json({
        error: 'subscription_not_found',
        message: error.message
      });
    }

    if (error.message === 'Subscription is already scheduled for cancellation') {
      return res.status(400).json({
        error: 'already_canceling',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'cancel_initiate_failed',
      message: 'Failed to initiate cancellation'
    });
  }
});

/**
 * POST /api/subscriptions/cancel/confirm
 * Confirm cancellation with exit survey
 */
router.post('/cancel/confirm', authenticate, requireActiveSubscription, (req, res) => {
  try {
    const { reason, feedback, wouldReturn } = req.body;

    // Validate survey data
    const validReasons = ['too_expensive', 'not_using', 'found_alternative', 'technical_issues', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Please select a reason for cancellation'
      });
    }

    if (wouldReturn !== undefined && (wouldReturn < 1 || wouldReturn > 5)) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Please rate likelihood to return (1-5)'
      });
    }

    const result = subscriptionService.confirmCancellation(req.userId, {
      reason,
      feedback: feedback || '',
      wouldReturn: wouldReturn || null
    });

    res.json({
      success: true,
      message: 'Subscription scheduled for cancellation',
      subscription: result.subscription,
      accessUntil: result.subscription.accessUntil,
      accessUntilFormatted: new Date(result.subscription.accessUntil * 1000).toLocaleDateString(),
      canResume: true,
      surveyId: result.subscription.surveyId
    });
  } catch (error) {
    console.error('[SUBSCRIPTION] Cancel confirm error:', error);

    if (error.message === 'No active subscription found') {
      return res.status(404).json({
        error: 'subscription_not_found',
        message: error.message
      });
    }

    if (error.message === 'Subscription is already scheduled for cancellation') {
      return res.status(400).json({
        error: 'already_canceling',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'cancel_confirm_failed',
      message: 'Failed to confirm cancellation'
    });
  }
});

/**
 * POST /api/subscriptions/resume
 * Resume a canceled subscription (before period ends)
 */
router.post('/resume', authenticate, (req, res) => {
  try {
    const result = subscriptionService.resumeSubscription(req.userId);

    res.json({
      success: true,
      message: 'Subscription resumed',
      subscription: result.subscription
    });
  } catch (error) {
    console.error('[SUBSCRIPTION] Resume error:', error);

    if (error.message === 'No active subscription found') {
      return res.status(404).json({
        error: 'subscription_not_found',
        message: error.message
      });
    }

    if (error.message === 'Subscription is not scheduled for cancellation') {
      return res.status(400).json({
        error: 'not_canceling',
        message: 'Subscription is not scheduled for cancellation'
      });
    }

    res.status(500).json({
      error: 'resume_failed',
      message: 'Failed to resume subscription'
    });
  }
});

/**
 * POST /api/subscriptions/trial/convert
 * Convert trial to paid subscription
 */
router.post('/trial/convert', authenticate, requireActiveSubscription, (req, res) => {
  try {
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Payment method is required'
      });
    }

    const result = subscriptionService.convertTrial(req.userId, paymentMethodId);

    res.json({
      success: true,
      message: 'Trial converted to paid subscription',
      subscription: result.subscription
    });
  } catch (error) {
    console.error('[SUBSCRIPTION] Trial convert error:', error);

    if (error.message === 'No active subscription found') {
      return res.status(404).json({
        error: 'subscription_not_found',
        message: error.message
      });
    }

    if (error.message === 'Subscription is not in trial period') {
      return res.status(400).json({
        error: 'not_trial',
        message: 'Subscription is not in trial period'
      });
    }

    res.status(500).json({
      error: 'trial_convert_failed',
      message: 'Failed to convert trial'
    });
  }
});

/**
 * GET /api/subscriptions/invoices
 * Get billing history
 */
router.get('/invoices', authenticate, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const invoices = subscriptionService.getBillingHistory(req.userId, limit);

    res.json({
      success: true,
      invoices: invoices.map(i => ({
        ...i,
        displayAmount: `$${(i.amount / 100).toFixed(2)}`,
        dueDate: i.dueAt ? new Date(i.dueAt * 1000).toLocaleDateString() : null,
        paidDate: i.paidAt ? new Date(i.paidAt * 1000).toLocaleDateString() : null
      }))
    });
  } catch (error) {
    console.error('[SUBSCRIPTION] Get invoices error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch invoices'
    });
  }
});

/**
 * GET /api/subscriptions/eligibility
 * Check subscription/trial eligibility
 */
router.get('/eligibility', authenticate, (req, res) => {
  try {
    const trialUsed = subscriptionService.hasUsedTrial(req.userId);
    const currentSubscription = subscriptionService.getCurrentSubscription(req.userId);

    res.json({
      success: true,
      eligibility: {
        trialAvailable: !trialUsed,
        canSubscribe: !currentSubscription,
        currentStatus: currentSubscription?.status || 'none',
        trialEndsAt: currentSubscription?.trialEnd || null
      }
    });
  } catch (error) {
    console.error('[SUBSCRIPTION] Eligibility error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to check eligibility'
    });
  }
});

module.exports = router;