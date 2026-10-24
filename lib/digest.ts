import 'server-only';
import type { Permit } from './permits';
import { TRADE_INFO, type Trade } from './trades';
import { money, shortDate, titleCase } from './format';

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function digestEmail(opts: { trade: Trade; zips: string[]; permits: Permit[]; siteUrl: string; dateLabel: string }) {
  const { trade, zips, permits, siteUrl, dateLabel } = opts;
  const label = TRADE_INFO[trade].label;
  const subject = permits.length
    ? `${permits.length} new ${label.toLowerCase()} ${permits.length === 1 ? 'lead' : 'leads'} in Sarasota · ${dateLabel}`
    : `No new ${label.toLowerCase()} matches this morning · ${dateLabel}`;

  const rows = permits
    .map(
      (p) => `
      <tr><td style="padding:16px 0;border-top:1px solid #dcdfd9">
        <div style="font:500 12px/1.4 monospace;color:#5a615c">${esc(p.app_id)} · Applied ${esc(shortDate(p.applied_date))} · ${esc(p.zip)}</div>
        <div style="font:700 17px/1.3 Arial,sans-serif;color:#16201e;margin-top:4px">
          <a href="${siteUrl}/permits/${encodeURIComponent(p.app_id)}" style="color:#16201e;text-decoration:none">${esc(p.address)}</a>
        </div>
        <div style="font:14px/1.45 Arial,sans-serif;color:#3e4541;margin-top:4px">${esc(p.subtype || p.app_type)}${
          p.valuation != null ? ` · <strong>${esc(money(p.valuation))}</strong>` : ''
        }</div>
        ${p.description ? `<div style="font:14px/1.45 Arial,sans-serif;color:#3e4541;margin-top:4px">${esc(titleCase(p.description).slice(0, 220))}</div>` : ''}
        <div style="margin-top:8px"><span style="display:inline-block;background:#fdeee3;color:#8a3a05;font:600 12px Arial,sans-serif;padding:4px 8px;border-radius:6px">${esc(
          label,
        )} · ${esc(p.tag_reasons?.[trade] ?? 'match')}</span></div>
      </td></tr>`,
    )
    .join('');

  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f2">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f2"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #dcdfd9;border-radius:12px">
    <tr><td style="padding:24px 24px 8px">
      <div style="font:700 13px/1 monospace;letter-spacing:2px;color:#c2540a">PERMIT WATCH · SARASOTA</div>
      <h1 style="font:800 24px/1.2 Arial,sans-serif;color:#16201e;margin:12px 0 4px">${esc(subject.split(' · ')[0])}</h1>
      <div style="font:14px/1.4 Arial,sans-serif;color:#5a615c">${esc(label)} · ZIPs ${esc(zips.join(', '))}</div>
    </td></tr>
    <tr><td style="padding:0 24px">
      ${
        permits.length
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`
          : `<p style="font:15px/1.5 Arial,sans-serif;color:#3e4541;padding:12px 0">The city's portal had no new applications matching your trade and ZIP codes since yesterday's digest. We'll check again tomorrow morning.</p>`
      }
    </td></tr>
    <tr><td style="padding:16px 24px 24px">
      <a href="${siteUrl}/dashboard" style="display:inline-block;background:#0f5c55;color:#ffffff;font:600 15px Arial,sans-serif;padding:12px 18px;border-radius:8px;text-decoration:none">Open your dashboard</a>
      <p style="font:12px/1.5 Arial,sans-serif;color:#5a615c;margin:16px 0 0">Tags are likely follow-on work, not confirmed jobs. Source: City of Sarasota permit portal.
      <a href="${siteUrl}/settings" style="color:#5a615c">Change trade, ZIPs or stop these emails</a>.</p>
    </td></tr>
  </table></td></tr></table></body></html>`;

  const text = [
    subject,
    '',
    ...permits.map(
      (p) => `${p.address} (${p.zip}) · ${p.subtype || p.app_type}${p.valuation != null ? ` · ${money(p.valuation)}` : ''}\n${siteUrl}/permits/${encodeURIComponent(p.app_id)}`,
    ),
    '',
    `Dashboard: ${siteUrl}/dashboard`,
    `Settings: ${siteUrl}/settings`,
  ].join('\n');

  return { subject, html, text };
}

export async function sendEmail(to: string, msg: { subject: string; html: string; text: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.DIGEST_FROM_EMAIL, to, subject: msg.subject, html: msg.html, text: msg.text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
