#!/usr/bin/env node
/**
 * Grithos Daily Practice Agent
 * Sends the morning practice email via Resend.com
 *
 * Usage: RESEND_API_KEY=re_xxx node send.js [--dry-run] [--date 2026-03-17]
 *
 * Cron: runs daily at 6:00 AM CT via OpenClaw
 */

const fs = require("fs");
const path = require("path");

// ── Config ──────────────────────────────────────────────────────────────
const FROM = process.env.RESEND_FROM || "Grithos Daily Practice <richard@grithos.com>";
const AUDIENCE_TAG = "daily-practice";
const SITE_URL = "https://grithos.com";

// ── Args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dateIdx = args.indexOf("--date");
const now =
  dateIdx !== -1 ? new Date(args[dateIdx + 1] + "T06:00:00-05:00") : new Date();

const month = now.getMonth(); // 0-11
const day = now.getDate(); // 1-31

// ── Load data ───────────────────────────────────────────────────────────
const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "practices.json"), "utf8")
);

const tenet = data.tenets[month];
const practice = data.practices[month]?.[day - 1];

if (!practice) {
  console.error(`No practice found for month=${month} day=${day}`);
  process.exit(1);
}

// Pick a lineage quote (rotate by day-of-year)
const dayOfYear =
  Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
const quote =
  tenet.lineage_quotes[dayOfYear % tenet.lineage_quotes.length];

// ── Months array ────────────────────────────────────────────────────────
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const dateStr = `${MONTHS[month]} ${day}`;
const isForgeDay = month === 2 && day === 13;

// ── Email HTML ──────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; padding:0; background:#1c2029; font-family:'Georgia','Times New Roman',serif; }
  .container { max-width:580px; margin:0 auto; padding:40px 24px; }
  .gold-line { height:3px; background:linear-gradient(90deg,transparent,#c9935a,transparent); margin-bottom:40px; }
  .date { font-family:'Courier New',monospace; font-size:11px; letter-spacing:4px; text-transform:uppercase; color:#c9935a; text-align:center; margin-bottom:8px; }
  .tenet-label { font-family:'Courier New',monospace; font-size:10px; letter-spacing:3px; text-transform:uppercase; color:#70685e; text-align:center; margin-bottom:32px; }
  .forge-badge { display:inline-block; font-family:'Courier New',monospace; font-size:10px; letter-spacing:3px; text-transform:uppercase; color:#1c2029; background:#c9935a; padding:4px 14px; border-radius:3px; margin-bottom:16px; }
  .practice { font-size:22px; line-height:1.6; color:#f5f0eb; text-align:center; font-weight:600; padding:0 16px; margin-bottom:36px; }
  .divider { width:40px; height:1px; background:#c9935a; margin:0 auto 36px; opacity:0.4; }
  .quote-block { text-align:center; padding:0 24px; margin-bottom:36px; }
  .quote { font-size:15px; font-style:italic; color:#a09888; line-height:1.6; margin-bottom:8px; }
  .quote-attr { font-family:'Courier New',monospace; font-size:10px; letter-spacing:2px; color:#70685e; text-transform:uppercase; }
  .pillar-block { text-align:center; margin-bottom:36px; }
  .pillar-label { font-family:'Courier New',monospace; font-size:10px; letter-spacing:3px; text-transform:uppercase; color:#70685e; margin-bottom:4px; }
  .pillar-name { font-size:16px; color:#c9935a; font-weight:600; }
  .cta { text-align:center; margin-bottom:40px; }
  .cta a { display:inline-block; font-family:'Courier New',monospace; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#c9935a; text-decoration:none; border:1px solid rgba(201,147,90,0.3); padding:10px 28px; border-radius:4px; }
  .gold-line-bottom { height:3px; background:linear-gradient(90deg,transparent,#c9935a,transparent); margin-top:40px; margin-bottom:24px; }
  .footer { text-align:center; font-family:'Courier New',monospace; font-size:10px; letter-spacing:2px; color:#4a443c; }
  .footer a { color:#70685e; text-decoration:none; }
  .footer .brand { font-size:13px; letter-spacing:4px; color:#70685e; margin-bottom:8px; display:block; }
</style>
</head>
<body>
<div class="container">
  <div class="gold-line"></div>

  <div class="date">${dateStr}</div>
  <div class="tenet-label">${tenet.tenet.split("—")[0].trim()}</div>

  ${isForgeDay ? '<div style="text-align:center;margin-bottom:20px;"><span class="forge-badge">FORGE DAY</span></div>' : ""}

  <div class="practice">${practice}</div>

  <div class="divider"></div>

  <div class="quote-block">
    <div class="quote">"${quote}"</div>
    <div class="quote-attr">— ${tenet.lineage_figure}</div>
  </div>

  <div class="pillar-block">
    <div class="pillar-label">THIS MONTH'S PILLAR</div>
    <div class="pillar-name">${tenet.pillar}</div>
  </div>

  <div class="cta">
    <a href="${SITE_URL}/practice">View the Full Calendar →</a>
  </div>

  <div class="gold-line-bottom"></div>

  <div class="footer">
    <span class="brand">GRITHOS</span>
    <a href="${SITE_URL}">grithos.com</a><br><br>
    Do right. Regardless.
  </div>
</div>
</body>
</html>`;

const subject = isForgeDay
  ? `⚡ FORGE DAY — ${practice.slice(0, 60)}…`
  : `${dateStr} — ${practice.length > 60 ? practice.slice(0, 60) + "…" : practice}`;

// ── Send ────────────────────────────────────────────────────────────────
async function send() {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set");
    process.exit(1);
  }

  const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || "39145f4b-0e37-4a81-82c7-ba4d891b50b2";

  // If audience ID is set, fetch contacts and send individually
  // Otherwise, send to a single test address
  const testTo = process.env.RESEND_TEST_TO;

  let recipients = [];

  if (AUDIENCE_ID) {
    // Fetch audience contacts from Resend
    const listRes = await fetch(
      `https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`,
      { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } }
    );
    const listData = await listRes.json();
    recipients = (listData.data || [])
      .filter((c) => !c.unsubscribed)
      .map((c) => c.email);
    console.log(`Audience: ${recipients.length} active subscribers`);
  } else if (testTo) {
    recipients = [testTo];
    console.log(`Test mode: sending to ${testTo}`);
  } else {
    console.error(
      "Set RESEND_AUDIENCE_ID for production or RESEND_TEST_TO for testing"
    );
    process.exit(1);
  }

  if (recipients.length === 0) {
    console.log("No recipients. Skipping send.");
    return;
  }

  // Resend batch send (up to 100 per call)
  const batches = [];
  for (let i = 0; i < recipients.length; i += 100) {
    batches.push(recipients.slice(i, i + 100));
  }

  let sent = 0;
  for (const batch of batches) {
    const emails = batch.map((to) => ({
      from: FROM,
      to,
      subject,
      html,
      tags: [{ name: "category", value: AUDIENCE_TAG }],
    }));

    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emails),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Batch send failed: ${res.status} ${err}`);
      process.exit(1);
    }

    sent += batch.length;
  }

  console.log(
    `✅ Sent "${subject}" to ${sent} recipient${sent === 1 ? "" : "s"}`
  );
}

// ── Main ────────────────────────────────────────────────────────────────
if (dryRun) {
  console.log("=== DRY RUN ===");
  console.log(`Date: ${dateStr}`);
  console.log(`Tenet: ${tenet.tenet}`);
  console.log(`Pillar: ${tenet.pillar}`);
  console.log(`Practice: ${practice}`);
  console.log(`Quote: "${quote}" — ${tenet.lineage_figure}`);
  console.log(`Subject: ${subject}`);
  console.log(`Forge Day: ${isForgeDay}`);
  console.log("=== HTML Preview ===");
  // Write preview to temp file
  const previewPath = path.join(__dirname, "preview.html");
  fs.writeFileSync(previewPath, html);
  console.log(`Preview saved: ${previewPath}`);
} else {
  send().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
