import { supabaseDb } from "./supabaseDb";
import { isSupabaseAdminConfigured } from "./supabaseAdmin";

class MaturityWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private lastRunAt: string | null = null;
  private totalMatured = 0;

  /**
   * Executes a robust, idempotent maturity sweep across all eligible active investments
   */
  public async runSweep(): Promise<{
    success: boolean;
    matured: number;
    matured_ids: string[];
    durationMs: number;
    lastRunAt: string;
  }> {
    if (this.isRunning) {
      return {
        success: true,
        matured: 0,
        matured_ids: [],
        durationMs: 0,
        lastRunAt: this.lastRunAt || new Date().toISOString(),
      };
    }

    if (!isSupabaseAdminConfigured()) {
      return {
        success: false,
        matured: 0,
        matured_ids: [],
        durationMs: 0,
        lastRunAt: new Date().toISOString(),
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const result = await supabaseDb.runMaturitySweep();
      const durationMs = Date.now() - startTime;
      this.lastRunAt = new Date().toISOString();
      this.totalMatured += result.matured;

      if (result.matured > 0) {
        console.log(
          `[EasyX Maturity Worker] Successfully processed ${result.matured} matured investment(s) in ${durationMs}ms.`
        );
      }

      return {
        success: true,
        matured: result.matured,
        matured_ids: result.matured_ids,
        durationMs,
        lastRunAt: this.lastRunAt,
      };
    } catch (err: any) {
      console.error("[EasyX Maturity Worker] Error during maturity sweep:", err.message || err);
      return {
        success: false,
        matured: 0,
        matured_ids: [],
        durationMs: Date.now() - startTime,
        lastRunAt: new Date().toISOString(),
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Starts the background scheduler with an initial delayed startup run and 60-second intervals
   */
  public start(intervalMs = 60000): void {
    if (this.timer) return;

    // Initial delayed run 5 seconds after server startup
    setTimeout(() => {
      this.runSweep().catch(() => {});
    }, 5000);

    this.timer = setInterval(() => {
      this.runSweep().catch(() => {});
    }, intervalMs);

    if (this.timer.unref) {
      this.timer.unref();
    }

    console.log(`[EasyX Maturity Worker] Started background maturity processing worker (${intervalMs / 1000}s interval).`);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public getStatus() {
    return {
      active: Boolean(this.timer),
      isProcessing: this.isRunning,
      lastRunAt: this.lastRunAt,
      totalMaturedLifetime: this.totalMatured,
    };
  }
}

export const maturityWorker = new MaturityWorker();
