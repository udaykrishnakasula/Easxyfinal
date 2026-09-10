import crypto from "crypto";
import { emailService } from "./emailService";

export interface WithdrawalOtpSession {
  userId: string;
  userEmail: string;
  amount: number;
  network: string;
  toAddress: string;
  salt: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
}

interface UserRateLimitState {
  lastRequestAt: number;
  hourlyRequests: number[];
}

class WithdrawalOtpService {
  private sessions = new Map<string, WithdrawalOtpSession>();
  private rateLimits = new Map<string, UserRateLimitState>();

  private maskEmail(email: string): string {
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) {
      return `${name[0]}*@${domain}`;
    }
    return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
  }

  /**
   * Generates and dispatches a cryptographically secure 6-digit OTP for withdrawal authorization
   */
  public async requestWithdrawalOtp(params: {
    userId: string;
    userEmail: string;
    userName?: string;
    amount: number;
    network: string;
    toAddress: string;
    kycStatus: string;
    availableBalance: number;
  }): Promise<{
    success: boolean;
    message: string;
    expiresIn: number;
    emailMasked: string;
  }> {
    // 1. Enforce strict KYC validation
    if (params.kycStatus !== "approved") {
      throw new Error("Identity verification (KYC) must be approved before requesting withdrawals.");
    }

    // 2. Enforce minimum $100 USDT validation
    const numAmt = Number(params.amount);
    if (isNaN(numAmt) || numAmt < 100) {
      throw new Error("Minimum withdrawal amount is 100.00 USDT.");
    }

    // 3. Enforce available balance validation
    if (params.availableBalance < numAmt) {
      throw new Error(
        `Insufficient available balance (${params.availableBalance.toFixed(2)} USDT) for requested withdrawal (${numAmt.toFixed(2)} USDT).`
      );
    }

    // 4. Validate destination address
    const cleanAddress = (params.toAddress || "").trim();
    if (cleanAddress.length < 8) {
      throw new Error("Invalid destination wallet address.");
    }

    // 5. Rate limiting: 60-second cooldown between requests and max 5 requests per hour
    const now = Date.now();
    let rl = this.rateLimits.get(params.userId);
    if (!rl) {
      rl = { lastRequestAt: 0, hourlyRequests: [] };
      this.rateLimits.set(params.userId, rl);
    }

    // Prune requests older than 1 hour
    rl.hourlyRequests = rl.hourlyRequests.filter((t) => now - t < 3600000);

    if (now - rl.lastRequestAt < 60000) {
      const waitSec = Math.ceil((60000 - (now - rl.lastRequestAt)) / 1000);
      throw new Error(`Please wait ${waitSec} seconds before requesting a new verification code.`);
    }

    if (rl.hourlyRequests.length >= 5) {
      throw new Error("Too many withdrawal OTP requests. Please wait an hour before trying again.");
    }

    // 6. Generate cryptographically secure 6-digit numeric OTP
    const plainOtp = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString("hex");
    const otpHash = crypto.createHash("sha256").update(salt + plainOtp).digest("hex");

    const expiresInSeconds = 300; // 5 minutes
    const session: WithdrawalOtpSession = {
      userId: params.userId,
      userEmail: params.userEmail.trim().toLowerCase(),
      amount: numAmt,
      network: params.network.toUpperCase(),
      toAddress: cleanAddress,
      salt,
      otpHash,
      expiresAt: now + expiresInSeconds * 1000,
      attempts: 0,
      maxAttempts: 3,
      createdAt: now,
    };

    // Store hashed session (overwriting any prior session for this user)
    this.sessions.set(params.userId, session);
    rl.lastRequestAt = now;
    rl.hourlyRequests.push(now);

    // 7. Dispatch OTP to the verified account email only
    await emailService.sendWithdrawalOtpEmail({
      to: params.userEmail,
      name: params.userName,
      code: plainOtp,
      amount: numAmt,
      network: session.network,
      toAddress: cleanAddress,
      expiresInMinutes: 5,
    });

    return {
      success: true,
      message: "A 6-digit security verification code has been sent to your verified email address.",
      expiresIn: expiresInSeconds,
      emailMasked: this.maskEmail(params.userEmail),
    };
  }

  /**
   * Verifies the submitted OTP against the cryptographically hashed session
   */
  public verifyWithdrawalOtp(params: {
    userId: string;
    otp: string;
    amount: number;
    network: string;
    toAddress: string;
  }): boolean {
    const cleanOtp = (params.otp || "").trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      throw new Error("Please enter a valid 6-digit verification code.");
    }

    const session = this.sessions.get(params.userId);
    const now = Date.now();

    if (!session) {
      throw new Error("No active withdrawal verification session found. Please request a verification code.");
    }

    if (now > session.expiresAt) {
      this.sessions.delete(params.userId);
      throw new Error("Verification code has expired. Please request a new code.");
    }

    if (session.attempts >= session.maxAttempts) {
      this.sessions.delete(params.userId);
      throw new Error("Maximum failed attempts exceeded. Please request a new verification code.");
    }

    // Verify parameter consistency to prevent transaction tampering
    if (Math.abs(session.amount - Number(params.amount)) > 0.0001) {
      this.sessions.delete(params.userId);
      throw new Error("Withdrawal amount mismatch from authorization session. Please request a new code.");
    }

    if (session.network.toUpperCase() !== params.network.toUpperCase()) {
      this.sessions.delete(params.userId);
      throw new Error("Withdrawal network mismatch from authorization session. Please request a new code.");
    }

    if (session.toAddress.toLowerCase() !== params.toAddress.trim().toLowerCase()) {
      this.sessions.delete(params.userId);
      throw new Error("Destination address mismatch from authorization session. Please request a new code.");
    }

    // Verify hash
    const candidateHash = crypto.createHash("sha256").update(session.salt + cleanOtp).digest("hex");
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(candidateHash, "hex"),
      Buffer.from(session.otpHash, "hex")
    );

    if (!isMatch) {
      session.attempts++;
      const remaining = session.maxAttempts - session.attempts;
      if (remaining <= 0) {
        this.sessions.delete(params.userId);
        throw new Error("Incorrect verification code. Maximum attempts exceeded. Please request a new code.");
      }
      throw new Error(`Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
    }

    // Single-use guarantee: Invalidate immediately upon successful verification
    this.sessions.delete(params.userId);
    return true;
  }
}

export const withdrawalOtpService = new WithdrawalOtpService();
