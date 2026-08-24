-- Innova Ecosystem Database Schema
-- Version 2.0.0 - Complete Backend Infrastructure

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- USERS TABLE (Single Source of Truth)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    wallet_address TEXT,
    tenant_id TEXT DEFAULT 'innova',
    tier TEXT DEFAULT 'basic',
    
    -- Profile Data (Global Sync)
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    
    -- Security
    password_hash TEXT,
    public_key TEXT,
    verified INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_verified_at INTEGER,
    
    -- Subscription Status
    subscription_status TEXT DEFAULT 'inactive',
    trial_ends_at INTEGER,
    subscription_ends_at INTEGER,
    cancel_at_period_end INTEGER DEFAULT 0
);

-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    device_id TEXT,
    device_name TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    revoked INTEGER DEFAULT 0,
    last_used_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ============================================
-- TRUSTED DEVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS trusted_devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_identifier TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT, -- 'tv_webos', 'tv_tizen', 'tv_roku', 'tv_firetv', 'web'
    last_used_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, device_identifier)
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_identifier ON trusted_devices(device_identifier);

-- ============================================
-- PROFILE SYNC LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profile_sync_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    synced_at INTEGER NOT NULL,
    sync_source TEXT, -- 'web', 'tv', 'api'
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profile_sync_log_user_id ON profile_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_sync_log_synced_at ON profile_sync_log(synced_at);

-- ============================================
-- PAIRING CODES TABLE (TV Pairing)
-- ============================================
CREATE TABLE IF NOT EXISTS pairing_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL, -- 6-digit alphanumeric
    user_id TEXT, -- NULL until confirmed
    device_id TEXT,
    device_name TEXT,
    device_type TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'expired', 'used'
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    confirmed_at INTEGER,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pairing_codes_code ON pairing_codes(code);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_status ON pairing_codes(status);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_user_id ON pairing_codes(user_id);

-- ============================================
-- SUBSCRIPTION PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT DEFAULT 'USD',
    interval TEXT DEFAULT 'month',
    trial_period_days INTEGER DEFAULT 14,
    features TEXT, -- JSON array of features
    active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'trialing', 'canceled', 'past_due', 'incomplete'
    
    -- Trial
    trial_start INTEGER,
    trial_end INTEGER,
    trial_used INTEGER DEFAULT 0, -- Has user used their 14-day trial?
    
    -- Billing
    current_period_start INTEGER,
    current_period_end INTEGER,
    cancel_at_period_end INTEGER DEFAULT 0,
    canceled_at INTEGER,
    ended_at INTEGER,
    
    -- Pricing
    amount INTEGER NOT NULL, -- In cents
    currency TEXT DEFAULT 'USD',
    interval TEXT DEFAULT 'month',
    
    -- Metadata
    payment_method_id TEXT,
    subscription_item_id TEXT, -- External payment processor reference
    
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- CANCELLATION SURVEYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cancellation_surveys (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reason TEXT NOT NULL, -- 'too_expensive', 'not_using', 'found_alternative', 'technical_issues', 'other'
    feedback TEXT,
    would_return INTEGER, -- 1-5 scale
    submitted_at INTEGER NOT NULL,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cancellation_surveys_subscription_id ON cancellation_surveys(subscription_id);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    due_at INTEGER,
    paid_at INTEGER,
    invoice_pdf_url TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================
-- DEVICE AUTHORIZATION CODES (RFC 8628)
-- ============================================
CREATE TABLE IF NOT EXISTS device_codes (
    id TEXT PRIMARY KEY,
    device_code TEXT UNIQUE NOT NULL,
    user_code TEXT UNIQUE NOT NULL,
    device_code_hash TEXT NOT NULL,
    user_code_hash TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_name TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'authorized', 'denied', 'expired'
    user_id TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    authorized_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_device_codes_device_code ON device_codes(device_code);
CREATE INDEX IF NOT EXISTS idx_device_codes_user_code ON device_codes(user_code);
CREATE INDEX IF NOT EXISTS idx_device_codes_status ON device_codes(status);

-- ============================================
-- ACCESS TOKENS (Short-lived)
-- ============================================
CREATE TABLE IF NOT EXISTS access_tokens (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL,
    user_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    device_code_id TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_code_id) REFERENCES device_codes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_access_tokens_token_hash ON access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_access_tokens_user_id ON access_tokens(user_id);

-- ============================================
-- DELETION REQUESTS TABLE (Compliance)
-- ============================================
CREATE TABLE IF NOT EXISTS deletion_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    requested_at INTEGER NOT NULL,
    completed_at INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    reason TEXT,
    export_url TEXT, -- URL to download data export
    completed_by TEXT, -- admin who completed deletion
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- SESSIONS TABLE (Active Sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_token_hash TEXT NOT NULL,
    device_info TEXT, -- JSON with device info
    ip_address TEXT,
    user_agent TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    last_active_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(session_token_hash);

-- ============================================
-- AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL, -- 'login', 'logout', 'profile_update', 'subscription_change', etc.
    resource_type TEXT, -- 'user', 'subscription', 'device', etc.
    resource_id TEXT,
    details TEXT, -- JSON with additional details
    ip_address TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- ============================================================
-- SUBMISSIONS TABLE
-- Unified content submission system for all platforms
-- ============================================================
CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('kreation', 'archaven', 'streamshare', 'hektic', 'mvn')),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    genre TEXT,
    tags TEXT, -- JSON array of tags
    media_urls TEXT NOT NULL, -- JSON array of media URLs
    thumbnail_url TEXT,
    metadata TEXT, -- JSON for platform-specific additional data
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
    is_approved INTEGER DEFAULT 0,
    rejection_reason TEXT,
    submitted_at INTEGER NOT NULL,
    approved_at INTEGER,
    approved_by TEXT,
    updated_at INTEGER,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_submissions_platform ON submissions(platform);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_category ON submissions(category);
CREATE INDEX IF NOT EXISTS idx_submissions_approved ON submissions(is_approved);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);

-- ============================================================
-- SUBMISSION VALIDATION LOG
-- Tracks validation attempts for submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS submission_validation_log (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    validation_type TEXT NOT NULL,
    passed INTEGER NOT NULL,
    errors TEXT, -- JSON array of error messages
    validated_at INTEGER NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_submission_validation_submission_id ON submission_validation_log(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_validation_type ON submission_validation_log(validation_type);

-- ============================================================
-- SUBMISSION MODERATION QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS submission_moderation_queue (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'flag', 'request_changes')),
    notes TEXT,
    reviewed_at INTEGER NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_submission_moderation_submission_id ON submission_moderation_queue(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_moderation_moderator_id ON submission_moderation_queue(moderator_id);

-- ============================================================
-- SUBMISSION ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS submission_analytics (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    metadata TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_submission_analytics_submission_id ON submission_analytics(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_analytics_event_type ON submission_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_submission_analytics_created_at ON submission_analytics(created_at);

-- ============================================================
-- CONVERSATIONS TABLE (Node-to-Node Messaging)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    participant_1_id TEXT NOT NULL,
    participant_2_id TEXT NOT NULL,
    last_message_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (participant_1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_2_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(participant_1_id, participant_2_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at);

-- ============================================================
-- MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    metadata TEXT, -- JSON for additional data (file URLs, etc.)
    is_read INTEGER DEFAULT 0,
    read_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- ============================================================
-- USER ONLINE STATUS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_presence (
    user_id TEXT PRIMARY KEY,
    is_online INTEGER DEFAULT 0,
    last_seen_at INTEGER,
    socket_id TEXT,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_presence_online ON user_presence(is_online);

-- ============================================================
-- STREAMSHARE DELIVERIES TABLE
-- Product delivery system for StreamShare platform
-- ============================================================
CREATE TABLE IF NOT EXISTS streamshare_deliveries (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    description TEXT,
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    conversation_id TEXT,
    status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'revisions_requested', 'approved', 'cancelled')),
    revision_count INTEGER DEFAULT 0,
    revision_notes TEXT,
    approved_at INTEGER,
    delivered_at INTEGER NOT NULL,
    updated_at INTEGER,
    metadata TEXT, -- JSON for additional delivery data
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_streamshare_deliveries_creator ON streamshare_deliveries(creator_id);
CREATE INDEX IF NOT EXISTS idx_streamshare_deliveries_client ON streamshare_deliveries(client_id);
CREATE INDEX IF NOT EXISTS idx_streamshare_deliveries_status ON streamshare_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_streamshare_deliveries_conversation ON streamshare_deliveries(conversation_id);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default subscription plans
INSERT OR IGNORE INTO subscription_plans (id, name, description, amount, currency, interval, trial_period_days, features, active, created_at, updated_at)
VALUES 
    (
        'basic',
        'Basic',
        'Essential features for getting started',
        999,
        'USD',
        'month',
        14,
        '["Access to all platforms", "Basic analytics", "Community support"]',
        1,
        strftime('%s', 'now'),
        strftime('%s', 'now')
    ),
    (
        'pro',
        'Pro',
        'Advanced features for power users',
        1999,
        'USD',
        'month',
        14,
        '["Everything in Basic", "Advanced analytics", "Priority support", "Custom branding", "API access"]',
        1,
        strftime('%s', 'now'),
        strftime('%s', 'now')
    ),
    (
        'enterprise',
        'Enterprise',
        'Full platform access for organizations',
        4999,
        'USD',
        'month',
        14,
        '["Everything in Pro", "Unlimited users", "Dedicated support", "Custom integrations", "SLA guarantee", "White-label options"]',
        1,
        strftime('%s', 'now'),
        strftime('%s', 'now')
    );