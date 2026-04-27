import type { TenantId } from '@core/types.js';

/**
 * Event types emitted by the memory system.
 */
export type MemoryEventType =
  | 'memory:extracted'
  | 'memory:stored'
  | 'memory:retrieved'
  | 'memory:contradiction:detected'
  | 'memory:contradiction:resolved'
  | 'memory:contradiction:pending_review'
  | 'memory:decayed'
  | 'memory:forgotten'
  | 'memory:consolidated';

/**
 * A memory lifecycle event.
 */
export interface MemoryEvent {
  type: MemoryEventType;
  timestamp: Date;
  tenantId: TenantId;
  payload: unknown;
}

/**
 * Handler function for memory events.
 */
export type MemoryEventHandler = (event: MemoryEvent) => Promise<void> | void;

/**
 * Event bus for publishing and subscribing to memory events.
 */
export interface MemoryEventBus {
  on(event: MemoryEventType, handler: MemoryEventHandler): void;
  off(event: MemoryEventType, handler: MemoryEventHandler): void;
  once(event: MemoryEventType, handler: MemoryEventHandler): void;
  emit(event: MemoryEvent): Promise<void>;
}
