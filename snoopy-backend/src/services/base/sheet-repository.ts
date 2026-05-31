import { findAll, findOne, appendRow, updateRow, getHeaders } from '../google-sheets.service';
import { generateId } from '../../utils/id-generator';
import { nowStr } from '../../utils/date';

/**
 * Strategy for how an entity is "deleted".
 *
 * Most sheets use soft-delete: either a status flag (is_active = FALSE) or a
 * tombstone marker (title = '[DELETED]'). `mark` returns the fields to overwrite;
 * `cascade` optionally soft-deletes dependent rows in other sheets.
 */
export interface SoftDeleteStrategy<T> {
  mark(record: T): Partial<T>;
  cascade?(id: string): Promise<void>;
}

/** Common soft-delete strategies. */
export const TombstoneTitle = <T extends { title?: string }>(cascade?: (id: string) => Promise<void>): SoftDeleteStrategy<T> => ({
  mark: () => ({ title: '[DELETED]' } as Partial<T>),
  cascade,
});
export const DeactivateFlag = <T extends { is_active?: string }>(cascade?: (id: string) => Promise<void>): SoftDeleteStrategy<T> => ({
  mark: () => ({ is_active: 'FALSE' } as Partial<T>),
  cascade,
});

/**
 * Generic data-access layer for one Google Sheet tab.
 *
 * Centralises the findOne→getHeaders→map→updateRow boilerplate that every
 * service repeated. Services keep their domain logic (defaults, RBAC, notifs)
 * and delegate the row mechanics here.
 */
export class SheetRepository<T extends Record<string, any>> {
  constructor(
    protected readonly sheet: string,
    protected readonly idField: keyof T & string,
    protected readonly idPrefix: string,
    protected readonly notFoundCode = 'NOT_FOUND',
    protected readonly notFoundMessage = 'ไม่พบข้อมูล',
  ) {}

  /** Generate a new id with this entity's prefix (e.g. ACT_xxx). */
  newId(): string { return generateId(this.idPrefix); }

  findAll(): Promise<T[]> { return findAll<T>(this.sheet); }

  find(id: string): Promise<{ data: T; rowIndex: number } | null> {
    return findOne<T>(this.sheet, this.idField, id);
  }

  /** Find by id or throw a typed NOT_FOUND error. */
  async findOrThrow(id: string): Promise<{ data: T; rowIndex: number }> {
    const found = await this.find(id);
    if (!found) throw Object.assign(new Error(this.notFoundMessage), { code: this.notFoundCode });
    return found;
  }

  /** Append a fully-formed record (caller sets id + timestamps). */
  async insert(record: T): Promise<T> {
    await appendRow(this.sheet, await this.toRow(record));
    return record;
  }

  /** Merge a patch onto the existing row and stamp updated_at. */
  async update(id: string, patch: Partial<T>): Promise<T> {
    const found = await this.findOrThrow(id);
    const updated = { ...found.data, ...patch, updated_at: nowStr() } as T;
    await updateRow(this.sheet, found.rowIndex, await this.toRow(updated));
    return updated;
  }

  /** Soft-delete via the given strategy, then run any cascade. */
  async softDelete(id: string, strategy: SoftDeleteStrategy<T>): Promise<void> {
    const found = await this.findOrThrow(id);
    const updated = { ...found.data, ...strategy.mark(found.data), updated_at: nowStr() } as T;
    await updateRow(this.sheet, found.rowIndex, await this.toRow(updated));
    if (strategy.cascade) await strategy.cascade(id);
  }

  /** Order a record's fields to match the sheet's header columns. */
  protected async toRow(record: T): Promise<string[]> {
    const headers = await getHeaders(this.sheet);
    return headers.map(h => String(record[h] ?? ''));
  }
}
