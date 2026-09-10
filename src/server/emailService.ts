import crypto from "crypto";

export interface EmailSendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category?: "verification" | "password_reset" | "security_alert" | "notification";
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: "resend" | "sendgrid" | "smtp" | "console_mock";
  error?: string;
}

class EmailService {
  private getEmailProvider(): string {
    if (process.env.RESEND_API_KEY) return "resend";
    if (process.env.SENDGRID_API_KEY) return "sendgrid";
    if (process.env.EMAIL_PROVIDER) return process.env.EMAIL_PROVIDER.toLowerCase();
    return "console_mock";
  }

  private getFromAddress(): string {
    return (
      process.env.EMAIL_FROM ||
      process.env.SMTP_FROM ||
      "EasyX Security <no-reply@easyx.io>"
    );
  }

  public getAppUrl(requestOrigin?: string): string {
    if (process.env.APP_URL && !process.env.APP_URL.includes("localhost")) {
      return process.env.APP_URL.replace(/\/$/, "");
    }
    if (requestOrigin && !requestOrigin.includes("localhost") && !requestOrigin.includes("127.0.0.1")) {
      return requestOrigin.replace(/\/$/, "");
    }
    if (process.env.APP_URL) {
      return process.env.APP_URL.replace(/\/$/, "");
    }
    return requestOrigin ? requestOrigin.replace(/\/$/, "") : "https://app.easyx.io";
  }

  /**
   * Universal email dispatcher
   */
  public async sendMail(options: EmailSendOptions): Promise<EmailSendResult> {
    const provider = this.getEmailProvider();
    const from = this.getFromAddress();
    const cleanTo = options.to.trim().toLowerCase();

    // 1. Resend REST API integration (Zero dependencies)
    if (provider === "resend" && process.env.RESEND_API_KEY) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: from,
            to: [cleanTo],
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>?/gm, ""),
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          console.log(`[EasyX Email] Delivered via Resend to ${cleanTo} (ID: ${data.id})`);
          return { success: true, messageId: data.id, provider: "resend" };
        } else {
          const errText = await response.text();
          console.error(`[EasyX Email] Resend delivery failed (${response.status}):`, errText);
          return { success: false, provider: "resend", error: errText };
        }
      } catch (err: any) {
        console.error("[EasyX Email] Resend network error:", err?.message);
        return { success: false, provider: "resend", error: err?.message };
      }
    }

    // 2. SendGrid REST API v3 integration (Zero dependencies)
    if (provider === "sendgrid" && (process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY)) {
      const apiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;
      try {
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: cleanTo }] }],
            from: {
              email: from.includes("<") ? from.split("<")?.[1]?.replace(">", "")?.trim() || from : from,
              name: "EasyX Security",
            },
            subject: options.subject,
            content: [
              {
                type: "text/html",
                value: options.html,
              },
            ],
          }),
        });

        if (response.status >= 200 && response.status < 300) {
          const msgId = response.headers.get("x-message-id") || `sg_${Date.now()}`;
          console.log(`[EasyX Email] Delivered via SendGrid to ${cleanTo} (ID: ${msgId})`);
          return { success: true, messageId: msgId, provider: "sendgrid" };
        } else {
          const errText = await response.text();
          console.error(`[EasyX Email] SendGrid delivery failed (${response.status}):`, errText);
          return { success: false, provider: "sendgrid", error: errText };
        }
      } catch (err: any) {
        console.error("[EasyX Email] SendGrid network error:", err?.message);
        return { success: false, provider: "sendgrid", error: err?.message };
      }
    }

    // 3. Fallback / Test Mode Mock Delivery (Console logging formatted email preview)
    const mockId = `mock_msg_${crypto.randomBytes(8).toString("hex")}`;
    console.log(`\n=================== [EasyX Transactional Email] ===================`);
    console.log(`To: ${cleanTo}`);
    console.log(`From: ${from}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Category: ${options.category || "general"}`);
    console.log(`Preview: ${options.text || options.html.replace(/<[^>]*>?/gm, "").slice(0, 160)}...`);
    console.log(`ID: ${mockId}`);
    console.log(`===================================================================\n`);

    return {
      success: true,
      messageId: mockId,
      provider: "console_mock",
    };
  }

  /**
   * Template: Email Verification (OTP Code + 1-Click Secure Link)
   */
  public async sendEmailVerification(params: {
    to: string;
    name?: string;
    code: string;
    token: string;
    origin?: string;
    expiresInMinutes?: number;
  }): Promise<EmailSendResult> {
    const appUrl = this.getAppUrl(params.origin);
    const verifyUrl = `${appUrl}/verify-email?email=${encodeURIComponent(params.to)}&token=${params.token}&code=${params.code}`;
    const name = params.name || "Valued Investor";
    const expiresMin = params.expiresInMinutes || 1440; // 24 hours

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your EasyX Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0d14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0c0d14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #141622; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <div style="display: inline-block; padding: 10px 18px; background: rgba(147, 51, 234, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 12px; margin-bottom: 12px;">
                <span style="font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #c084fc;">EASYX</span>
              </div>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Verify Your Email Address</h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 24px; color: #d1d5db;">
                Hello <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #9ca3af;">
                Welcome to EasyX. To complete your account verification and secure your high-yield crypto investment account, please use the 6-digit verification code below or click the verification button.
              </p>

              <!-- OTP Code Display -->
              <div style="margin: 28px 0; padding: 20px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; text-align: center;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; margin-bottom: 8px;">Your 6-Digit Verification Code</div>
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #a855f7; font-family: monospace;">${params.code}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 6px;">Valid for ${expiresMin > 60 ? `${Math.floor(expiresMin / 60)} hours` : `${expiresMin} minutes`}</div>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verifyUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 14px rgba(147, 51, 234, 0.4);">
                  Verify Email Address
                </a>
              </div>

              <!-- Fallback Direct URL -->
              <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">If the button above does not work, copy and paste this link into your browser:</p>
                <p style="margin: 0; font-size: 11px; word-break: break-all; color: #a855f7;">${verifyUrl}</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #0e1019; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280;">
                If you did not create an account on EasyX, please disregard this email.
              </p>
              <p style="margin: 0; font-size: 11px; color: #4b5563;">
                &copy; ${new Date().getFullYear()} EasyX Multi-Yield Investment Protocol. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendMail({
      to: params.to,
      subject: `Verify your EasyX account (${params.code})`,
      html,
      category: "verification",
    });
  }

  /**
   * Template: Password Reset Request (OTP Code + 1-Click Secure Link)
   */
  public async sendPasswordResetEmail(params: {
    to: string;
    code: string;
    token: string;
    origin?: string;
    expiresInMinutes?: number;
  }): Promise<EmailSendResult> {
    const appUrl = this.getAppUrl(params.origin);
    const resetUrl = `${appUrl}/forgot-password?email=${encodeURIComponent(params.to)}&token=${params.token}&code=${params.code}`;
    const expiresMin = params.expiresInMinutes || 15;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your EasyX Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0d14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0c0d14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #141622; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <div style="display: inline-block; padding: 10px 18px; background: rgba(225, 29, 72, 0.15); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 12px; margin-bottom: 12px;">
                <span style="font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #fb7185;">EASYX SECURITY</span>
              </div>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Password Reset Request</h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 24px; color: #d1d5db;">
                We received a request to reset the password for your EasyX investment account (<strong>${params.to}</strong>).
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #9ca3af;">
                Enter the 6-digit security code below in your EasyX password reset window, or tap the button to proceed directly to the new password setup:
              </p>

              <!-- OTP Code Display -->
              <div style="margin: 28px 0; padding: 20px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; text-align: center;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; margin-bottom: 8px;">Password Reset Code</div>
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f43f5e; font-family: monospace;">${params.code}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 6px;">Expires strictly in ${expiresMin} minutes</div>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.4);">
                  Reset Password Now
                </a>
              </div>

              <!-- Security Notice -->
              <div style="margin-top: 28px; padding: 16px; background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.2); border-radius: 10px;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #fda4af;">
                  <strong>Security Alert:</strong> If you did not request this password reset, your credentials may be compromised. Please sign in immediately and update your password, or contact EasyX support.
                </p>
              </div>

              <!-- Fallback Direct URL -->
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">Direct Reset Link:</p>
                <p style="margin: 0; font-size: 11px; word-break: break-all; color: #fb7185;">${resetUrl}</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #0e1019; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #4b5563;">
                &copy; ${new Date().getFullYear()} EasyX Multi-Yield Investment Protocol. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendMail({
      to: params.to,
      subject: `EasyX Password Reset Verification Code (${params.code})`,
      html,
      category: "password_reset",
    });
  }

  /**
   * Template: Withdrawal Security Verification OTP
   */
  public async sendWithdrawalOtpEmail(params: {
    to: string;
    name?: string;
    code: string;
    amount: number | string;
    network: string;
    toAddress: string;
    expiresInMinutes?: number;
  }): Promise<EmailSendResult> {
    const expiresMin = params.expiresInMinutes || 5;
    const cleanTo = params.to.trim().toLowerCase();
    const maskedAddr = params.toAddress.length > 12
      ? `${params.toAddress.slice(0, 6)}...${params.toAddress.slice(-4)}`
      : params.toAddress;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>EasyX Withdrawal Authorization Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0d14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <div style="max-width: 560px; margin: 40px auto; background: #141622; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #9333ea; margin: 0 0 8px 0; font-size: 22px;">EasyX Security Verification</h2>
      <p style="color: #9ca3af; margin: 0; font-size: 14px;">Authorize USDT Withdrawal Request</p>
    </div>

    <p style="color: #d1d5db; font-size: 14px; line-height: 22px;">
      Hello ${params.name || "Investor"},<br>
      A withdrawal of <strong>${Number(params.amount).toFixed(2)} USDT</strong> (${params.network}) to destination address <strong>${maskedAddr}</strong> was requested from your EasyX account.
    </p>

    <div style="background: rgba(147, 51, 234, 0.08); border: 1px dashed rgba(147, 51, 234, 0.4); border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #c084fc; margin-bottom: 8px;">One-Time Security Code</div>
      <div style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff;">${params.code}</div>
      <div style="font-size: 12px; color: #9ca3af; margin-top: 8px;">Valid for ${expiresMin} minutes. Never share this code with anyone.</div>
    </div>

    <p style="color: #f87171; font-size: 13px; line-height: 20px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); padding: 12px; border-radius: 8px;">
      <strong>Security Notice:</strong> EasyX staff will NEVER ask for this code. If you did not initiate this withdrawal request, please log into your account and change your password immediately.
    </p>
  </div>
</body>
</html>
    `;

    return this.sendMail({
      to: cleanTo,
      subject: `[EasyX] Security Code: ${params.code} for USDT Withdrawal`,
      html,
      category: "security_alert",
    });
  }

  /**
   * Template: Password Change Confirmation Alert
   */
  public async sendPasswordChangedAlert(params: { to: string; name?: string; ip?: string }): Promise<EmailSendResult> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>EasyX Password Successfully Updated</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0d14; font-family: sans-serif; color: #f3f4f6;">
  <div style="max-width: 560px; margin: 40px auto; background: #141622; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;">
    <h2 style="color: #10b981; margin-top: 0;">Password Successfully Changed</h2>
    <p style="color: #d1d5db; line-height: 24px;">Your EasyX account password was successfully updated on ${new Date().toUTCString()}.</p>
    <p style="color: #9ca3af; font-size: 13px;">If you initiated this change, no further action is required.</p>
    <p style="color: #f87171; font-size: 13px; margin-top: 20px;">If you did NOT make this change, please contact EasyX support immediately to secure your account.</p>
  </div>
</body>
</html>
    `;

    return this.sendMail({
      to: params.to,
      subject: "Security Notification: EasyX Account Password Changed",
      html,
      category: "security_alert",
    });
  }
}

export const emailService = new EmailService();
