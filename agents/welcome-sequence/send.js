#!/usr/bin/env node
/**
 * Grithos Welcome Email Sequence
 * Sends 5 emails over 10 days to new subscribers.
 *
 * Usage:
 *   node send.js                  # Normal run — send due emails
 *   node send.js --dry-run        # Show what would be sent without sending
 *   node send.js --retroactive    # Send all due emails to existing subscribers
 */

const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) { console.error('RESEND_API_KEY not set'); process.exit(1); }
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || '39145f4b-0e37-4a81-82c7-ba4d891b50b2';
const FROM_ADDRESS = 'Grithos <richard@grithos.com>';
const STATE_FILE = path.join(__dirname, 'welcome-state.json');
const TEMPLATE_FILE = '/Users/willowsbrain/.openclaw/workspace/content/welcome-sequence.md';

const DRY_RUN = process.argv.includes('--dry-run');
const RETROACTIVE = process.argv.includes('--retroactive');

// ── Email schedule ──────────────────────────────────────────────────────────
const SEQUENCE = [
  { id: 1, dayDelay: 0,  subject: 'Welcome to Grithos — This Is Why It Exists',              tag: '1' },
  { id: 2, dayDelay: 2,  subject: 'The Four Pillars of Grithos',                              tag: '2' },
  { id: 3, dayDelay: 4,  subject: 'What 5:55 AM Looks Like — The Daily Practice',             tag: '3' },
  { id: 4, dayDelay: 7,  subject: 'The Lineage — 45 Thinkers, One Thread',                    tag: '4' },
  { id: 5, dayDelay: 10, subject: 'The Invitation — Share Grithos With One Person',            tag: '5' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return { subscribers: {} };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function extractTemplates() {
  const md = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  const htmlBlocks = [];
  const regex = /```html\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(md)) !== null) {
    htmlBlocks.push(match[1].trim());
  }
  if (htmlBlocks.length !== 5) {
    throw new Error(`Expected 5 HTML templates, found ${htmlBlocks.length}`);
  }
  return htmlBlocks;
}

function daysSince(dateStr) {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
}

// ── Resend API ──────────────────────────────────────────────────────────────

async function resendFetch(urlPath, options = {}) {
  const url = `https://api.resend.com${urlPath}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Resend API ${res.status}: ${body}`);
  }
  return body ? JSON.parse(body) : null;
}

async function getContacts() {
  // Resend audience contacts endpoint — paginate if needed
  const allContacts = [];
  let url = `/audiences/${AUDIENCE_ID}/contacts`;

  const data = await resendFetch(url);
  if (data && data.data) {
    allContacts.push(...data.data);
  }
  return allContacts;
}

async function sendEmail(to, subject, html, sequenceNum) {
  return resendFetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      html,
      tags: [
        { name: 'category', value: 'welcome-sequence' },
        { name: 'sequence', value: String(sequenceNum) },
      ],
    }),
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log(`Welcome Sequence Runner — ${DRY_RUN ? 'DRY RUN' : 'LIVE'} ${RETROACTIVE ? '(retroactive)' : ''}`);

  // Load templates
  const templates = extractTemplates();
  log(`Loaded ${templates.length} email templates`);

  // Load state
  const state = loadState();

  // Fetch subscribers from Resend
  let contacts;
  try {
    contacts = await getContacts();
    log(`Found ${contacts.length} contacts in audience`);
  } catch (err) {
    log(`ERROR fetching contacts: ${err.message}`);
    process.exit(1);
  }

  let sentCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const contact of contacts) {
    const email = contact.email;
    const createdAt = contact.created_at;

    if (!createdAt) {
      log(`SKIP ${email} — no created_at date`);
      skippedCount++;
      continue;
    }

    // Unsubscribed contacts
    if (contact.unsubscribed === true) {
      log(`SKIP ${email} — unsubscribed`);
      skippedCount++;
      continue;
    }

    const daysElapsed = daysSince(createdAt);

    // Init subscriber state if needed
    if (!state.subscribers[email]) {
      state.subscribers[email] = { created_at: createdAt, sent: [] };
    }

    const subState = state.subscribers[email];

    for (const step of SEQUENCE) {
      // Already sent?
      if (subState.sent.includes(step.id)) {
        continue;
      }

      // Is it time?
      if (daysElapsed < step.dayDelay) {
        continue;
      }

      // For non-retroactive runs, only send email 1 if subscriber was created today,
      // and only send later emails if they're exactly on schedule
      // For retroactive, send all due emails
      if (!RETROACTIVE && step.id > 1) {
        // In normal mode, we only send the next unsent email in sequence
        const prevIds = SEQUENCE.filter(s => s.id < step.id).map(s => s.id);
        const allPrevSent = prevIds.every(id => subState.sent.includes(id));
        if (!allPrevSent) {
          continue;
        }
      }

      if (DRY_RUN) {
        log(`DRY RUN: Would send Email ${step.id} to ${email} — "${step.subject}" (${daysElapsed} days since signup)`);
        sentCount++;
      } else {
        try {
          await sendEmail(email, step.subject, templates[step.id - 1], step.id);
          subState.sent.push(step.id);
          log(`SENT Email ${step.id} to ${email} — "${step.subject}"`);
          sentCount++;
        } catch (err) {
          log(`ERROR sending Email ${step.id} to ${email}: ${err.message}`);
          errorCount++;
        }
        // Rate limit: max 4 req/s to stay under Resend's 5 req/s limit
        await sleep(250);
      }
    }
  }

  // Save state (even on dry run to persist created_at info)
  if (!DRY_RUN) {
    saveState(state);
    log(`State saved to ${STATE_FILE}`);
  }

  log(`Done. Sent: ${sentCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
