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
// Use branded address if domain is verified, fallback to Resend default
const FROM = process.env.RESEND_FROM || "Grithos Daily Practice <richard@grithos.com>";
const FALLBACK_FROM = "Grithos Daily Practice <onboarding@resend.dev>";
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
// Table-based layout for Gmail/email client compatibility
// Gmail in light mode strips CSS background from <body> — bgcolor on tables is the fix
// Colors: --void #2a2a2a, --gold #b8a88e, --text #e8e4de, --text-secondary #8a8d94, --text-muted #5e6168
// Fonts: Cormorant Garamond (headings), Source Sans 3 (body), JetBrains Mono (labels/mono)
// Logo: Text-based "GRITHOS" with gold "GRIT" — same as nav on grithos.com
const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Grithos Daily Practice</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Source+Sans+3:wght@400;500;600&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<!--[if mso]>
<style>table,td{font-family:Arial,Helvetica,sans-serif!important;}</style>
<![endif]-->
<style>
  :root{color-scheme:dark only;}
  u+.body{background:#2a2a2a!important;}
  body,#body-table{background-color:#2a2a2a!important;}
  [data-ogsc] body,[data-ogsc] #body-table{background-color:#2a2a2a!important;}
  @media(prefers-color-scheme:light){
    body,#body-table,.dark-bg{background-color:#2a2a2a!important;}
    .text-cream{color:#e8e4de!important;}
    .text-gold{color:#b8a88e!important;}
    .text-secondary{color:#8a8d94!important;}
    .text-muted{color:#5e6168!important;}
  }
  @media(prefers-color-scheme:dark){
    body,#body-table,.dark-bg{background-color:#2a2a2a!important;}
    .text-cream{color:#e8e4de!important;}
    .text-gold{color:#b8a88e!important;}
    .text-secondary{color:#8a8d94!important;}
    .text-muted{color:#5e6168!important;}
  }
</style>
</head>
<body class="body" bgcolor="#2a2a2a" style="margin:0;padding:0;background-color:#2a2a2a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<!-- Full-width outer wrapper table — bgcolor survives Gmail light mode -->
<table role="presentation" id="body-table" class="dark-bg" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#2a2a2a" style="background-color:#2a2a2a;margin:0;padding:0;">
<tr>
<td align="center" valign="top" bgcolor="#2a2a2a" style="background-color:#2a2a2a;">

<!-- Inner content table — 580px max -->
<table role="presentation" class="dark-bg" cellpadding="0" cellspacing="0" border="0" width="580" bgcolor="#2a2a2a" style="background-color:#2a2a2a;max-width:580px;width:100%;">

<!-- Top spacing -->
<tr><td bgcolor="#2a2a2a" style="background-color:#2a2a2a;padding:48px 28px 0 28px;">

<!-- Gold line divider -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td bgcolor="#2a2a2a" style="background-color:#2a2a2a;height:1px;font-size:1px;line-height:1px;background-image:linear-gradient(90deg,transparent 0%,rgba(196,168,130,.08) 15%,rgba(196,168,130,.35) 50%,rgba(196,168,130,.08) 85%,transparent 100%);">&nbsp;</td>
</tr></table>

</td></tr>

<!-- Logo -->
<tr><td bgcolor="#2a2a2a" style="background-color:#2a2a2a;padding:32px 28px 0 28px;text-align:center;">
<a href="${SITE_URL}" style="text-decoration:none;"><img src="${SITE_URL}/assets/images/grithos-logo.jpg" alt="Grithos — Grit. Ethos. Grithos." width="260" style="width:260px;max-width:100%;height:auto;border:0;display:inline-block;" /></a>
</td></tr>

<!-- Date -->
<tr><td bgcolor="#2a2a2a" style="background-color:#2a2a2a;padding:24px 28px 0 28px;text-align:center;">
<span class="text-gold" style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:#b8a88e;">${dateStr}</span>
</td></tr>

<!-- Tenet label -->
<tr><td bgcolor="#2a2a2a" style="background-color:#2a2a2a;padding:6px 28px 0 28px;text-align:center;">
<span class="text-secondary" style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8a8d94;">${tenet.tenet.split("—")[0].trim()}</span>
</td></tr>

${isForgeDay ? `<!-- Forge Day badge -->
<tr><td bgcolor="#2a2a2a" style="background-color:#2a2a2a;padding:20px 28px 0 28px;text-align:center;">
<span style="display:inline-block;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:#2a2a2a;background-color:#b8a88e;padding:5px 16px;border-radius:8px;">FORGE DAY</span>
</td></tr>` : ""}

<!-- Practice text -->
<tr><td bgcolor="#2a2a2a" style="background-color:#2a2a2a;padding:36px 40px 0 40px;text-align:center;">
<p class="text-cream" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;line-height:1.5;color:#e8e4de;font-weight:600;margin:0;">${practice}</p>
</td></tr>

<!-- Divider -->
<tr><td bgcolor="#2a2a2a" style="background-color:#2a2a2a;padding:40px 0 0 0;text-align:center;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
<td style="width:60px;height:1px;font-size:1px;line-height:1px;background-color:rgba(196,168,130,.35);">&nbsp;</td>
</tr></table>
</td></tr>

<!-- Quote -->
<tr><td bgcolor="#2a2a2a" style="background-color:#2a2a2a;padding:40px 48px 0 48px;text-align:center;">
<p class="text-cream" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;font-style:italic;color:#e8e4de;line-height:1.65;margin:0 0 10px 0;opacity:0.85;">&ldquo;${quote}&rdquo;</p>
<span class="text-secondary" style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.2em;color:#8a8d94;text-transform:uppercase;">&mdash; ${tenet.lineage_figure}</span>
</td></tr>

<!-- Pillar -->
<tr><td bgcolor="#2a2a2a" style="background-color:#2a2a2a;padding:40px 28px 0 28px;text-align:center;">
<span class="text-secondary" style="display:block;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:#8a8d94;margin-bottom:6px;">THIS MONTH&rsquo;S PILLAR</span>
<span class="text-gold" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;color:#b8a88e;font-weight:600;">${tenet.pillar}</span>
</td></tr>

<!-- CTA button -->
<tr><td bgcolor="#2a2a2a" style="background-color:#2a2a2a;padding:40px 28px 0 28px;text-align:center;">
<a href="${SITE_URL}/practice" class="text-gold" style="display:inline-block;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#b8a88e;text-decoration:none;border:1px solid rgba(196,168,130,.25);padding:12px 32px;border-radius:8px;">View the Full Calendar &rarr;</a>
</td></tr>

<!-- Bottom gold line -->
<tr><td bgcolor="#2a2a2a" style="background-color:#2a2a2a;padding:40px 28px 0 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td bgcolor="#2a2a2a" style="background-color:#2a2a2a;height:1px;font-size:1px;line-height:1px;background-image:linear-gradient(90deg,transparent 0%,rgba(196,168,130,.08) 15%,rgba(196,168,130,.35) 50%,rgba(196,168,130,.08) 85%,transparent 100%);">&nbsp;</td>
</tr></table>
</td></tr>

<!-- Footer -->
<tr><td bgcolor="#2a2a2a" style="background-color:#2a2a2a;padding:28px 28px 40px 28px;text-align:center;">
<span class="text-secondary" style="display:block;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#8a8d94;margin-bottom:10px;">GRITHOS</span>
<a href="${SITE_URL}" class="text-secondary" style="font-family:'Source Sans 3','Source Sans Pro',sans-serif;font-size:13px;color:#8a8d94;text-decoration:none;">grithos.com</a>
<span class="text-muted" style="display:block;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.15em;color:#5e6168;margin-top:12px;text-transform:uppercase;">Do right. Regardless.</span>
<span class="text-muted" style="display:block;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;color:#5e6168;margin-top:8px;">AI-assisted. Human-founded. Actionable by design.</span>
<span style="display:block;font-family:'Source Sans 3','Source Sans Pro',sans-serif;font-size:11px;color:#5e6168;margin-top:16px;">
<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" class="text-secondary" style="color:#8a8d94;text-decoration:underline;">Unsubscribe</a>
</span>
</td></tr>

</table>
<!-- /Inner content table -->

</td>
</tr>
</table>
<!-- /Full-width outer wrapper -->
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

  // Check if domain is verified, use fallback if not
  let fromAddress = FROM;
  try {
    const domainRes = await fetch(
      "https://api.resend.com/domains/717dd73c-bc58-4d1a-8e05-f5f2b8ebc179",
      { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } }
    );
    const domainData = await domainRes.json();
    if (domainData.status !== "verified") {
      console.log(`Domain status: ${domainData.status} — using fallback sender`);
      fromAddress = FALLBACK_FROM;
    } else {
      console.log("Domain verified — using branded sender");
    }
  } catch (e) {
    console.log("Could not check domain — using fallback sender");
    fromAddress = FALLBACK_FROM;
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
      from: fromAddress,
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
