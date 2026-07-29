import "server-only";

// Transactional email via the Resend HTTP API (port 443).
// DigitalOcean blocks outbound SMTP (25/465/587) on droplets, so SMTP is not
// an option here — the HTTPS API is. Configure with:
//   RESEND_API_KEY = re_...
//   EMAIL_FROM     = Prime Fleet Verification <verification@oneprimefleet.com>
// The domain (oneprimefleet.com) must be verified in Resend (SPF/DKIM DNS).

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export class EmailError extends Error {}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new EmailError("Email sending is not configured yet.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      reply_to: input.replyTo ? [input.replyTo] : undefined,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new EmailError(`Email failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}
