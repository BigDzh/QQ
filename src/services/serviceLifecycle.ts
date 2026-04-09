type Destroyable = {
  destroy?: () => void;
};

class ServiceLifecycleManager {
  private services: Set<Destroyable> = new Set();
  private isDestroyed = false;

  register(service: Destroyable): () => void {
    if (this.isDestroyed) {
      service.destroy?.();
      return () => {};
    }
    this.services.add(service);
    return () => {
      this.services.delete(service);
    };
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    const errors: Error[] = [];

    this.services.forEach(service => {
      try {
        service.destroy?.();
      } catch (error) {
        if (error instanceof Error) {
          errors.push(error);
        }
      }
    });

    this.services.clear();

    if (errors.length > 0) {
      console.error('[ServiceLifecycle] Errors during destroy:', errors);
    }
  }

  getServiceCount(): number {
    return this.services.size;
  }

  isApplicationDestroyed(): boolean {
    return this.isDestroyed;
  }
}

export const serviceLifecycle = new ServiceLifecycleManager();

export function registerService<T extends Destroyable>(service: T): T {
  serviceLifecycle.register(service);
  return service;
}

export function destroyApplication(): void {
  serviceLifecycle.destroy();
}
