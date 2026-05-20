/**
 * EonSure Event Bus — In-process Event-Driven Architecture
 *
 * Provides a lightweight pub/sub mechanism for claim lifecycle automation.
 * Events are processed asynchronously, decoupling the claim creation from
 * downstream AI analysis (fraud scoring, rules engine, predictive analytics).
 *
 * In production, this can be replaced by a message broker (Redis Streams,
 * RabbitMQ, AWS SQS) without changing the publisher interface.
 */

import { EventEmitter } from "events";

// ─── Event Types ──────────────────────────────────────────────────────────────
export type ClaimCreatedPayload = {
  claimId: number;
  tenantId: number;
  claimType: string;
  claimedAmount: string | null;
  description: string | null;
  performedById: number;
  performedByName: string;
};

export type ClaimStatusChangedPayload = {
  claimId: number;
  tenantId: number;
  fromStatus: string;
  toStatus: string;
  performedById: number;
  performedByName: string;
};

export type FraudAnalysisRequestedPayload = {
  claimId: number;
  tenantId: number;
  requestedById: number;
};

export type EonSureEvent =
  | { type: "claim.created"; payload: ClaimCreatedPayload }
  | { type: "claim.status_changed"; payload: ClaimStatusChangedPayload }
  | { type: "fraud.analysis_requested"; payload: FraudAnalysisRequestedPayload };

// ─── Event Bus Singleton ──────────────────────────────────────────────────────
class EonSureEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
  }

  publish(event: EonSureEvent): void {
    // Fire-and-forget: emit asynchronously so the HTTP response is not blocked
    setImmediate(() => {
      this.emit(event.type, event.payload);
    });
  }

  subscribe<T>(eventType: EonSureEvent["type"], handler: (payload: T) => Promise<void>): void {
    this.on(eventType, async (payload: T) => {
      try {
        await handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error handling "${eventType}":`, err);
      }
    });
  }
}

export const eventBus = new EonSureEventBus();
