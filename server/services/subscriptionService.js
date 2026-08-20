/**
 * Subscription Service
 * Handles subscription management, trials, cancellation, and billing
 */

const db = require('../database');
const { v4: uuidv4 } = require('uuid');

class SubscriptionService {
  /**
   * Get all available subscription plans
   */
  getPlans() {
    const plans = db.all(`
      SELECT id, name, description, amount, currency, interval, trial_period_days, features, active
      FROM subscription_plans
      WHERE active = 1
      ORDER BY amount ASC
    `);

    return plans.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      amount: p.amount,
      currency: p.currency,
      interval: p.interval,
      trialPeriodDays: p.trial_period_days,
      features: p.features ? JSON.parse(p.features) : [],
      active: !!p.active
    }));
  }

  /**
   * Get current subscription for a user
   */
  getCurrentSubscription(userId) {
    const subscription = db.get(`
      SELECT s.*, sp.name as plan_name, sp.description as plan_description, sp.features, sp.amount as plan_amount
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.user_id = ? AND s.status IN ('active', 'trialing')
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId]);

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      planId: subscription.plan_id,
      planName: subscription.plan_name,
      planDescription: subscription.plan_description,
      features: subscription.features ? JSON.parse(subscription.features) : [],
      status: subscription.status,
      amount: subscription.amount,
      currency: subscription.currency,
      interval: subscription.interval,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      trialStart: subscription.trial_start,
      trialEnd: subscription.trial_end,
      cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at,
      endedAt: subscription.ended_at
    };
  }

  /**
   * Check if user has already used their trial
   */
  hasUsedTrial(userId) {
    const result = db.get(`
      SELECT trial_used FROM users WHERE id = ?
    `, [userId]);

    return result ? !!result.trial_used : false;
  }

  /**
   * Create a new subscription (with optional trial)
   */
  createSubscription(userId, planId, options = {}) {
    const {
      useTrial = true,
      paymentMethodId = null
    } = options;

    return db.transaction(() => {
      // Get plan details
      const plan = db.get(`
        SELECT * FROM subscription_plans WHERE id = ? AND active = 1
      `, [planId]);

      if (!plan) {
        throw new Error('Plan not found');
      }

      // Check if user already has an active subscription
      const existing = db.get(`
        SELECT id FROM subscriptions
        WHERE user_id = ? AND status IN ('active', 'trialing')
      `, [userId]);

      if (existing) {
        throw new Error('User already has an active subscription');
      }

      const now = Math.floor(Date.now() / 1000);
      const subscriptionId = uuidv4();
      let status = 'active';
      let trialStart = null;
      let trialEnd = null;
      let currentPeriodStart = now;
      let currentPeriodEnd;

      // Check if user is eligible for trial
      const user = db.get('SELECT trial_used FROM users WHERE id = ?', [userId]);
      const trialEligible = useTrial && !user.trial_used && plan.trial_period_days > 0;

      if (trialEligible) {
        status = 'trialing';
        trialStart = now;
        trialEnd = now + (plan.trial_period_days * 24 * 60 * 60);
        currentPeriodEnd = trialEnd;

        // Mark trial as used
        db.run('UPDATE users SET trial_used = 1, trial_ends_at = ? WHERE id = ?', [trialEnd, userId]);
      } else {
        // Calculate period end based on interval
        if (plan.interval === 'month') {
          currentPeriodEnd = now + (30 * 24 * 60 * 60);
        } else if (plan.interval === 'year') {
          currentPeriodEnd = now + (365 * 24 * 60 * 60);
        } else {
          currentPeriodEnd = now + (30 * 24 * 60 * 60);
        }
      }

      // Create subscription
      db.run(`
        INSERT INTO subscriptions (id, user_id, plan_id, status, amount, currency, interval,
                                   trial_start, trial_end, current_period_start, current_period_end,
                                   payment_method_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        subscriptionId, userId, planId, status, plan.amount, plan.currency, plan.interval,
        trialStart, trialEnd, currentPeriodStart, currentPeriodEnd,
        paymentMethodId, now, now
      ]);

      // Update user subscription status
      db.run(`
        UPDATE users SET subscription_status = ?, subscription_ends_at = ?, trial_ends_at = ?
        WHERE id = ?
      `, [status, currentPeriodEnd, trialEnd, userId]);

      // Create first invoice
      const invoiceId = uuidv4();
      const invoiceDueAt = trialEligible ? trialEnd : now + 7 * 24 * 60 * 60; // Due at trial end or in 7 days

      db.run(`
        INSERT INTO invoices (id, subscription_id, user_id, amount, status, due_at, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
      `, [invoiceId, subscriptionId, userId, plan.amount, invoiceDueAt, now]);

      return {
        id: subscriptionId,
        planId: plan.id,
        planName: plan.name,
        status,
        amount: plan.amount,
        currency: plan.currency,
        interval: plan.interval,
        trialStart,
        trialEnd,
        currentPeriodStart,
        currentPeriodEnd,
        nextBillingDate: currentPeriodEnd,
        trialUsed: trialEligible
      };
    })();
  }

  /**
   * Initiate cancellation (first step - shows confirmation)
   */
  initiateCancellation(userId) {
    const subscription = this.getCurrentSubscription(userId);

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    if (subscription.cancelAtPeriodEnd) {
      throw new Error('Subscription is already scheduled for cancellation');
    }

    return {
      subscription: {
        id: subscription.id,
        planName: subscription.planName,
        amount: subscription.amount,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEnd: subscription.trialEnd,
        isTrial: subscription.status === 'trialing'
      },
      requiresConfirmation: true,
      message: 'Are you sure you want to cancel your subscription?'
    };
  }

  /**
   * Confirm cancellation with survey
   */
  confirmCancellation(userId, cancellationData) {
    const { reason, feedback, wouldReturn } = cancellationData;

    return db.transaction(() => {
      const subscription = this.getCurrentSubscription(userId);

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      if (subscription.cancelAtPeriodEnd) {
        throw new Error('Subscription is already scheduled for cancellation');
      }

      const now = Math.floor(Date.now() / 1000);
      const surveyId = uuidv4();

      // Save cancellation survey
      db.run(`
        INSERT INTO cancellation_surveys (id, subscription_id, user_id, reason, feedback, would_return, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [surveyId, subscription.id, userId, reason, feedback || null, wouldReturn || null, now]);

      // Update subscription
      db.run(`
        UPDATE subscriptions
        SET cancel_at_period_end = 1, canceled_at = ?
        WHERE id = ?
      `, [now, subscription.id]);

      // Update user
      db.run(`
        UPDATE users SET cancel_at_period_end = 1
        WHERE id = ?
      `, [userId]);

      return {
        success: true,
        message: 'Subscription scheduled for cancellation',
        subscription: {
          id: subscription.id,
          planName: subscription.planName,
          status: subscription.status,
          cancelAtPeriodEnd: true,
          accessUntil: subscription.currentPeriodEnd,
          surveyId
        }
      };
    })();
  }

  /**
   * Resume a canceled subscription (before period ends)
   */
  resumeSubscription(userId) {
    return db.transaction(() => {
      const subscription = this.getCurrentSubscription(userId);

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      if (!subscription.cancelAtPeriodEnd) {
        throw new Error('Subscription is not scheduled for cancellation');
      }

      const now = Math.floor(Date.now() / 1000);

      // Remove cancellation flag
      db.run(`
        UPDATE subscriptions
        SET cancel_at_period_end = 0, canceled_at = NULL
        WHERE id = ?
      `, [subscription.id]);

      // Update user
      db.run(`
        UPDATE users SET cancel_at_period_end = 0
        WHERE id = ?
      `, [userId]);

      return {
        success: true,
        message: 'Subscription resumed',
        subscription: {
          id: subscription.id,
          planName: subscription.planName,
          status: subscription.status,
          cancelAtPeriodEnd: false,
          nextBillingDate: subscription.currentPeriodEnd
        }
      };
    })();
  }

  /**
   * Convert trial to paid subscription
   */
  convertTrial(userId, paymentMethodId) {
    return db.transaction(() => {
      const subscription = this.getCurrentSubscription(userId);

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      if (subscription.status !== 'trialing') {
        throw new Error('Subscription is not in trial period');
      }

      const now = Math.floor(Date.now() / 1000);

      // Update subscription to active
      db.run(`
        UPDATE subscriptions
        SET status = 'active', payment_method_id = ?
        WHERE id = ?
      `, [paymentMethodId, subscription.id]);

      // Update user
      db.run(`
        UPDATE users SET subscription_status = 'active'
        WHERE id = ?
      `, [userId]);

      return {
        success: true,
        message: 'Trial converted to paid subscription',
        subscription: {
          id: subscription.id,
          planName: subscription.planName,
          status: 'active',
          nextBillingDate: subscription.trialEnd
        }
      };
    })();
  }

  /**
   * Get billing history for a user
   */
  getBillingHistory(userId, limit = 20) {
    const invoices = db.all(`
      SELECT id, subscription_id, amount, status, due_at, paid_at, created_at
      FROM invoices
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [userId, limit]);

    return invoices.map(i => ({
      id: i.id,
      subscriptionId: i.subscription_id,
      amount: i.amount,
      status: i.status,
      dueAt: i.due_at,
      paidAt: i.paid_at,
      createdAt: i.created_at
    }));
  }

  /**
   * Process subscription renewal (cron job would call this)
   */
  processRenewals() {
    const now = Math.floor(Date.now() / 1000);

    return db.transaction(() => {
      // Find subscriptions that need renewal
      const renewals = db.all(`
        SELECT s.*, u.*
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        WHERE s.status IN ('active', 'trialing')
          AND s.cancel_at_period_end = 0
          AND s.current_period_end <= ?
      `, [now]);

      const results = {
        renewed: 0,
        canceled: 0,
        failed: 0
      };

      renewals.forEach(sub => {
        // Check if trial is ending
        if (sub.status === 'trialing' && sub.trial_end <= now) {
          // Trial ended - would need payment method to continue
          // For now, we'll cancel the subscription
          db.run(`
            UPDATE subscriptions
            SET status = 'canceled', ended_at = ?, cancel_at_period_end = 0
            WHERE id = ?
          `, [now, sub.id]);

          db.run(`
            UPDATE users SET subscription_status = 'inactive'
            WHERE id = ?
          `, [sub.user_id]);

          results.canceled++;
        } else if (sub.current_period_end <= now) {
          // Regular renewal
          const newPeriodEnd = sub.interval === 'month'
            ? now + (30 * 24 * 60 * 60)
            : now + (365 * 24 * 60 * 60);

          db.run(`
            UPDATE subscriptions
            SET current_period_start = ?, current_period_end = ?
            WHERE id = ?
          `, [now, newPeriodEnd, sub.id]);

          // Create new invoice
          const invoiceId = uuidv4();
          db.run(`
            INSERT INTO invoices (id, subscription_id, user_id, amount, status, due_at, created_at)
            VALUES (?, ?, ?, ?, 'pending', ?, ?)
          `, [invoiceId, sub.id, sub.user_id, sub.amount, now + 7 * 24 * 60 * 60, now]);

          results.renewed++;
        }
      });

      return results;
    })();
  }

  /**
   * Get cancellation survey statistics (admin)
   */
  getCancellationStats(startDate, endDate) {
    const query = `
      SELECT 
        reason,
        COUNT(*) as count,
        AVG(would_return) as avg_would_return
      FROM cancellation_surveys
      WHERE submitted_at >= ? AND submitted_at <= ?
      GROUP BY reason
    `;

    return db.all(query, [startDate, endDate]);
  }
}

module.exports = new SubscriptionService();