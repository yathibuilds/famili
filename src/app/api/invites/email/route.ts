import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.invitedEmail) {
    return NextResponse.json(
      { message: "Invite email is required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.INVITE_BASE_URL ||
    "http://localhost:3000";

  if (!apiKey || !from) {
    return NextResponse.json(
      {
        message:
          "Invite saved, but email delivery is not configured yet. Add RESEND_API_KEY and RESEND_FROM_EMAIL to enable it.",
      },
      { status: 501 }
    );
  }

  const acceptUrl = `${baseUrl}/#family`;
  const subject = `Famili invite to join ${body.familyName || "a family"}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2>You have a Famili invite</h2>
      <p>${body.inviterName || "A family member"} invited you to join <strong>${body.familyName || "their family"}</strong>.</p>
      <p>Role: <strong>${body.role || "member"}</strong></p>
      ${body.displayLabel ? `<p>Relationship label: <strong>${body.displayLabel}</strong></p>` : ""}
      <p>You can open Famili and accept the invite from your Family Access section.</p>
      <p><a href="${acceptUrl}" style="display:inline-block;padding:12px 18px;background:#06b6d4;color:#0a0a0a;text-decoration:none;border-radius:12px;font-weight:600;">Open Famili</a></p>
      <p style="font-size:12px;color:#6b7280;">Invite token: ${body.inviteToken || ""}</p>
    </div>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [body.invitedEmail],
      subject,
      html,
    }),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    return NextResponse.json(
      { message: `Invite saved, but email delivery failed: ${errorText}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ message: "Invite email sent." });
}
