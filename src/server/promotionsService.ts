import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface PromotionMediaItem {
  id: string;
  title: string;
  subtitle: string;
  media_type: "image" | "video";
  media_url: string;
  thumbnail_url?: string;
  badge_text?: string;
  badge_color?: "amber" | "emerald" | "violet" | "sky" | "rose" | "indigo";
  cta_text?: string;
  cta_link?: string;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  order: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PROMOTIONS: PromotionMediaItem[] = [];

const STORAGE_FILE = path.join(process.cwd(), "promotions_data.json");

export class PromotionsService {
  private items: PromotionMediaItem[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.items = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn("[PromotionsService] Could not read storage file, loading defaults.", e);
    }
    this.items = [];
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.items, null, 2), "utf-8");
    } catch (e) {
      console.warn("[PromotionsService] Could not persist promotions data.", e);
    }
  }

  public getActivePromotions(): PromotionMediaItem[] {
    return this.items
      .filter((item) => item.status === "PUBLISHED")
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public getAllPromotions(): PromotionMediaItem[] {
    return [...this.items].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public getPromotionById(id: string): PromotionMediaItem | undefined {
    return this.items.find((i) => i.id === id);
  }

  public createPromotion(data: Partial<PromotionMediaItem>): PromotionMediaItem {
    const id = `promo_${crypto.randomBytes(6).toString("hex")}`;
    const maxOrder = this.items.reduce((max, i) => Math.max(max, i.order || 0), 0);
    const now = new Date().toISOString();

    const newItem: PromotionMediaItem = {
      id,
      title: (data.title || "New Promotion").trim(),
      subtitle: (data.subtitle || "").trim(),
      media_type: data.media_type === "video" ? "video" : "image",
      media_url: (data.media_url || "/coin.png").trim(),
      thumbnail_url: data.thumbnail_url?.trim() || undefined,
      badge_text: data.badge_text?.trim() || "Featured",
      badge_color: data.badge_color || "violet",
      cta_text: data.cta_text?.trim() || "Learn More",
      cta_link: data.cta_link?.trim() || "/dashboard",
      status: data.status === "DRAFT" ? "DRAFT" : "PUBLISHED",
      order: typeof data.order === "number" ? data.order : maxOrder + 1,
      created_at: now,
      updated_at: now,
    };

    this.items.push(newItem);
    this.saveToStorage();
    return newItem;
  }

  public updatePromotion(id: string, patch: Partial<PromotionMediaItem>): PromotionMediaItem | null {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return null;

    const current = this.items[idx];
    const updated: PromotionMediaItem = {
      ...current,
      ...patch,
      id: current.id, // cannot change id
      updated_at: new Date().toISOString(),
    };

    this.items[idx] = updated;
    this.saveToStorage();
    return updated;
  }

  public setStatus(id: string, status: "PUBLISHED" | "DRAFT" | "ARCHIVED"): PromotionMediaItem | null {
    return this.updatePromotion(id, { status });
  }

  public deletePromotion(id: string): boolean {
    const initialLen = this.items.length;
    this.items = this.items.filter((i) => i.id !== id);
    if (this.items.length !== initialLen) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public reorder(orderedIds: string[]): PromotionMediaItem[] {
    const map = new Map(this.items.map((item) => [item.id, item]));
    const newItems: PromotionMediaItem[] = [];

    orderedIds.forEach((id, index) => {
      const item = map.get(id);
      if (item) {
        item.order = index + 1;
        item.updated_at = new Date().toISOString();
        newItems.push(item);
        map.delete(id);
      }
    });

    // append any unmentioned items at the end
    map.forEach((item) => {
      newItems.push(item);
    });

    this.items = newItems;
    this.saveToStorage();
    return this.getAllPromotions();
  }

  public resetToDefaults(): PromotionMediaItem[] {
    this.items = [...DEFAULT_PROMOTIONS];
    this.saveToStorage();
    return this.getAllPromotions();
  }
}

export const promotionsService = new PromotionsService();
