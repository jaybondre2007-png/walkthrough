const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.RESEND_FROM ?? "WalkThrough <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[email disabled] Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to,
      subject: "Reset your WalkThrough password",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="margin-bottom: 4px;">Reset your password</h2>
          <p style="color: #555;">We got a request to reset the password for your WalkThrough account. This link expires in 30 minutes.</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="background: #2a78d6; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset password</a>
          </p>
          <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Failed to send password reset email:", res.status, body);
  }
}
