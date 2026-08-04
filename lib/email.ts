/**
 * Minimal Resend wrapper for the "you're on the clock" email. Swap the
 * fetch call for any provider (Postmark, SendGrid, Supabase's own SMTP
 * integration) — this is the only place that needs to change.
 *
 * Requires RESEND_API_KEY + EMAIL_FROM in .env.local. If they're not set,
 * this silently no-ops so local dev without an email provider still works.
 */
export async function sendYourTurnEmail(params: {
  to: string;
  teamName: string;
  leagueName: string;
  leagueId: string;
  deadline: string | null;
  pickNumber: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("RESEND_API_KEY / EMAIL_FROM not set — skipping draft email.");
    return;
  }

  const draftUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/leagues/${params.leagueId}/draft`;
  const deadlineText = params.deadline
    ? `You have until ${new Date(params.deadline).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })} to make your pick before it's auto-selected for you.`
    : "";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: `You're on the clock in ${params.leagueName} — pick #${params.pickNumber}`,
      html: `
        <p>Hey ${params.teamName},</p>
        <p>It's your turn to draft in <strong>${params.leagueName}</strong>.</p>
        <p>${deadlineText}</p>
        <p><a href="${draftUrl}">Make your pick →</a></p>
      `,
    }),
  });
}
