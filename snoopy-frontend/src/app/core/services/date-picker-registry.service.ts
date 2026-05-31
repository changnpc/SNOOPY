import { Injectable } from '@angular/core';

/**
 * Global registry so only one DatePicker dropdown is open at a time.
 * Each DatePickerComponent registers a close callback here; when any
 * picker opens it calls closeAll() first to shut the others.
 */
@Injectable({ providedIn: 'root' })
export class DatePickerRegistryService {
  private closers = new Set<() => void>();

  register(closer: () => void): () => void {
    this.closers.add(closer);
    return () => this.closers.delete(closer); // returns unregister fn
  }

  closeAll(except?: () => void): void {
    this.closers.forEach(fn => { if (fn !== except) fn(); });
  }
}
