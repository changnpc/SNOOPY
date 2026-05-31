import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { ApiResponse } from '../../../models';

/**
 * Optional base for thin REST API services that follow the standard
 * collection convention: GET /x, GET /x/:id, POST /x, PUT /x/:id, DELETE /x/:id
 * with JSON bodies.
 *
 * Services with non-standard needs (FormData uploads, client-side caching,
 * extra endpoints) should NOT force-fit this — extend it and add/override, or
 * keep their own thin wrapper. Readability first.
 */
export abstract class ResourceService<T> {
  /** Collection path, e.g. '/events'. */
  protected abstract readonly path: string;

  constructor(protected api: ApiService) {}

  getAll(params?: Record<string, string | number | boolean>): Observable<ApiResponse<T[]>> {
    return this.api.get<ApiResponse<T[]>>(this.path, params);
  }
  getById(id: string): Observable<ApiResponse<T>> {
    return this.api.get<ApiResponse<T>>(`${this.path}/${id}`);
  }
  create(body: Partial<T>): Observable<ApiResponse<T>> {
    return this.api.post<ApiResponse<T>>(this.path, body);
  }
  update(id: string, body: Partial<T>): Observable<ApiResponse<T>> {
    return this.api.put<ApiResponse<T>>(`${this.path}/${id}`, body);
  }
  delete(id: string): Observable<ApiResponse<null>> {
    return this.api.delete<ApiResponse<null>>(`${this.path}/${id}`);
  }
}
