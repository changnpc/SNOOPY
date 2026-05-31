import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler,
  HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retryWhen, mergeMap } from 'rxjs/operators';
import { ToastService } from '../services/toast.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private toast: ToastService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((err, attempt) => {
            // Retry on 429 with exponential backoff (max 3 times)
            if (err.status === 429 && attempt < 3) {
              return timer(Math.pow(2, attempt) * 1000);
            }
            return throwError(() => err);
          })
        )
      ),
      catchError((err: HttpErrorResponse) => {
        const msg = err.error?.error?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
        if (err.status === 0)         this.toast.error('ไม่สามารถเชื่อมต่อ Server');
        else if (err.status === 403)  this.toast.error('ไม่มีสิทธิ์ดำเนินการ');
        else if (err.status === 404)  this.toast.warning('ไม่พบข้อมูลที่ต้องการ');
        else if (err.status === 409)  this.toast.warning(msg);
        else if (err.status >= 500)   this.toast.error('เกิดข้อผิดพลาดของระบบ');
        return throwError(() => err);
      })
    );
  }
}
