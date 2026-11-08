const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  try {
    const rawHandle = String(req.query.handle || '').trim().toUpperCase();
    const handle = rawHandle && !rawHandle.startsWith('@') ? '@' + rawHandle : rawHandle;
    const rows = handle
      ? db.all(`SELECT * FROM innova_telegram_messages WHERE UPPER(recipient_handle) = ? OR UPPER(sender_handle) = ? OR UPPER(recipient_handle) = '@ALL_NODES' ORDER BY created_at DESC LIMIT 200`, [handle, handle])
      : db.all(`SELECT * FROM innova_telegram_messages ORDER BY created_at DESC LIMIT 200`);
    res.json({ success: true, messages: rows || [] });
  } catch (err) {
    res.json({ success: true, messages: [] });
  }
});

router.post('/send', (req, res) => {
  try {
    const { id, senderHandle, recipientHandle, subject, body, priority } = req.body || {};
    if (!senderHandle || !recipientHandle || !body) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const msgId = id || ('tg-' + Date.now());
    const now = Date.now();
    db.run(
      `INSERT OR REPLACE INTO innova_telegram_messages (id, sender_handle, recipient_handle, subject, body, priority, read, starred, trashed, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?)`,
      [msgId, String(senderHandle).toUpperCase(), String(recipientHandle).toUpperCase(), String(subject || '(No Subject)'), String(body), priority || 'Standard', now]
    );
    res.status(201).json({ success: true, id: msgId });
  } catch (err) {
    res.status(500).json({ error: 'send_failed', message: err.message });
  }
});

module.exports = router;
