import {
  Component, Input, forwardRef, HostListener, OnChanges, SimpleChanges
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => UiSelectComponent),
    multi: true,
  }],
  template: `
<div class="dp-wrap" (click)="$event.stopPropagation()">
  <!-- Trigger -->
  <button type="button" class="dp-trigger" [class.dp-open]="open" [disabled]="disabled" (click)="toggle()">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" class="dp-icon" style="flex-shrink:0">
      <path d="M7 10l5 5 5-5z"/>
    </svg>
    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
          [style.color]="!selectedLabel ? 'var(--text-muted)' : ''">
      {{ selectedLabel || placeholder }}
    </span>
  </button>

  <!-- Dropdown panel -->
  <div class="dp-dropdown" *ngIf="open" style="width:max-content;min-width:100%;max-width:320px;max-height:280px;overflow-y:auto">
    <div *ngIf="placeholder && allowEmpty"
         class="sl-option" [class.sl-selected]="value === '' || value === null || value === undefined"
         (click)="select('')">
      <span style="color:var(--text-muted)">{{ placeholder }}</span>
    </div>
    <div *ngFor="let opt of options"
         class="sl-option"
         [class.sl-selected]="opt.value === value"
         (click)="select(opt.value)">
      <svg *ngIf="opt.value === value" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:var(--primary);flex-shrink:0">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      <span [style.padding-left]="opt.value !== value ? '22px' : '0'">{{ opt.label }}</span>
    </div>
    <div *ngIf="options.length === 0" style="padding:12px 16px;color:var(--text-muted);font-size:.85rem">ไม่มีตัวเลือก</div>
  </div>
</div>
  `,
})
export class UiSelectComponent implements ControlValueAccessor, OnChanges {
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'เลือก...';
  @Input() allowEmpty = true;   // show placeholder option

  open = false;
  value: string = '';
  disabled = false;

  private onChange = (_: string) => {};
  private onTouched = () => {};

  ngOnChanges(changes: SimpleChanges) {
    // keep value in sync if options list changes
    if (changes['options'] && this.value) {
      const still = this.options.find(o => o.value === this.value);
      if (!still) { this.value = ''; this.onChange(''); }
    }
  }

  get selectedLabel(): string {
    return this.options.find(o => o.value === this.value)?.label ?? '';
  }

  toggle() {
    if (this.disabled) return;
    this.open = !this.open;
  }

  select(val: string) {
    this.value = val;
    this.onChange(val);
    this.onTouched();
    this.open = false;
  }

  @HostListener('document:click')
  onDocumentClick() { this.open = false; }

  writeValue(v: string) { this.value = v ?? ''; }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }
}
