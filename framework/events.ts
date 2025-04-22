// Custom event bus for the mini-framework

type EventCallback = (payload?: any) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback) {
    this.events.get(event)?.delete(callback);
  }

  emit(event: string, payload?: any) {
    this.events.get(event)?.forEach(cb => cb(payload));
  }
}

export const eventBus = new EventBus();
