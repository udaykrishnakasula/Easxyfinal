import type { Response } from "express";
import jwt from "jsonwebtoken";

export interface StreamClient {
  id: string;
  userId: string;
  role: "admin" | "user";
  email?: string;
  res: Response;
  connectedAt: string;
  heartbeatTimer: NodeJS.Timeout;
}

export class RealtimeManager {
  private userClients: Map<string, Set<StreamClient>> = new Map();
  private adminClients: Set<StreamClient> = new Set();
  private jwtSecret: string;

  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret;
  }

  /**
   * Validates token and returns user info
   */
  public verifyToken(token: string): { id: string; role: "admin" | "user"; email?: string } | null {
    try {
      if (!token || token === "null" || token === "undefined" || token === "[object Object]") return null;
      let cleanToken = token.trim();
      if ((cleanToken.startsWith('"') && cleanToken.endsWith('"')) || (cleanToken.startsWith("'") && cleanToken.endsWith("'"))) {
        cleanToken = cleanToken.slice(1, -1).trim();
      }
      if (cleanToken.startsWith("Bearer ")) {
        cleanToken = cleanToken.slice(7).trim();
      }
      if (cleanToken.split(".").length !== 3) return null;

      const decoded: any = jwt.verify(cleanToken, this.jwtSecret);
      const userId = decoded?.sub || decoded?.id;
      if (!userId) return null;
      return {
        id: userId,
        role: decoded.role === "admin" ? "admin" : "user",
        email: decoded.email,
      };
    } catch {
      return null;
    }
  }

  /**
   * Registers a new SSE stream client
   */
  public registerClient(
    user: { id: string; role: "admin" | "user"; email?: string },
    res: Response,
    initialUnreadCount: number
  ): () => void {
    const clientId = `${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Set up SSE response headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    // Set up 15-second heartbeat ping to prevent timeouts
    const heartbeatTimer = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        cleanup();
      }
    }, 15000);

    const client: StreamClient = {
      id: clientId,
      userId: user.id,
      role: user.role,
      email: user.email,
      res,
      connectedAt: new Date().toISOString(),
      heartbeatTimer,
    };

    // Add to user map
    if (!this.userClients.has(user.id)) {
      this.userClients.set(user.id, new Set());
    }
    this.userClients.get(user.id)!.add(client);

    // If admin, also add to admin clients set
    if (user.role === "admin") {
      this.adminClients.add(client);
    }

    // Send initial connected handshake event
    this.sendEventToClient(client, "connected", {
      clientId,
      userId: user.id,
      role: user.role,
      unreadCount: initialUnreadCount,
      serverTime: new Date().toISOString(),
    });

    const cleanup = () => {
      clearInterval(heartbeatTimer);
      const userSet = this.userClients.get(user.id);
      if (userSet) {
        userSet.delete(client);
        if (userSet.size === 0) {
          this.userClients.delete(user.id);
        }
      }
      if (user.role === "admin") {
        this.adminClients.delete(client);
      }
    };

    return cleanup;
  }

  /**
   * Helper to write a named SSE event to a specific client
   */
  private sendEventToClient(client: StreamClient, event: string, data: any) {
    try {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.warn(`[RealtimeManager] Failed writing to client ${client.id}:`, err);
    }
  }

  /**
   * Broadcast an event to all open connections of a specific user
   */
  public broadcastToUser(userId: string, event: string, payload: any) {
    const clients = this.userClients.get(userId);
    if (!clients || clients.size === 0) return;

    for (const client of clients) {
      this.sendEventToClient(client, event, payload);
    }
  }

  /**
   * Broadcast an event to all connected admin tabs
   */
  public broadcastToAdmins(event: string, payload: any) {
    if (this.adminClients.size === 0) return;

    for (const client of this.adminClients) {
      this.sendEventToClient(client, event, payload);
    }
  }

  /**
   * Real-time notification created for a user
   */
  public notifyUserCreated(notification: any, unreadCount: number) {
    const payload = {
      type: "notification.created",
      notification: {
        id: notification.id,
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        body: notification.body || "",
        channel: notification.channel || "in_app",
        action_url: notification.action_url || null,
        action_text: notification.action_text || null,
        is_read: false,
        metadata: notification.metadata || null,
        created_at: notification.created_at || new Date().toISOString(),
      },
      unreadCount,
    };

    this.broadcastToUser(notification.user_id, "notification.created", payload);
  }

  /**
   * Real-time single notification marked read
   */
  public notifyUserRead(userId: string, notificationId: string, unreadCount: number) {
    this.broadcastToUser(userId, "notification.read", {
      type: "notification.read",
      notificationId,
      unreadCount,
    });
  }

  /**
   * Real-time all notifications marked read
   */
  public notifyUserReadAll(userId: string, unreadCount: number) {
    this.broadcastToUser(userId, "notification.read_all", {
      type: "notification.read_all",
      unreadCount,
    });
  }

  /**
   * Real-time admin alert event (new deposit, new KYC, new user, etc.)
   */
  public notifyAdminEvent(event: {
    type: string;
    title: string;
    body: string;
    category?: string;
    entityId?: string;
    data?: any;
  }) {
    const payload = {
      type: "admin.notification.created",
      event: {
        id: `admin_evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: event.type,
        title: event.title,
        body: event.body,
        category: event.category || "general",
        entityId: event.entityId || null,
        data: event.data || null,
        created_at: new Date().toISOString(),
      },
    };

    this.broadcastToAdmins("admin.notification.created", payload);
  }

  /**
   * Returns connection metrics for debugging/health check
   */
  public getMetrics() {
    let totalConnections = 0;
    for (const clients of this.userClients.values()) {
      totalConnections += clients.size;
    }
    return {
      connectedUsers: this.userClients.size,
      totalConnections,
      adminConnections: this.adminClients.size,
    };
  }
}
