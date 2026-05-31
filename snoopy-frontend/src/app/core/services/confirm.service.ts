import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private _options$ = new BehaviorSubject<ConfirmOptions | null>(null);
  private _result$ = new Subject<boolean>();

  options$ = this._options$.asObservable();

  confirm(opts: ConfirmOptions): Observable<boolean> {
    this._options$.next(opts);
    return new Observable(observer => {
      const sub = this._result$.subscribe(result => {
        observer.next(result);
        observer.complete();
        sub.unsubscribe();
      });
    });
  }

  resolve(result: boolean) {
    this._options$.next(null);
    this._result$.next(result);
  }
}
