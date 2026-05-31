import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { ResourceService } from './base/resource.service';
import { CalendarEvent } from '../../models';

@Injectable({ providedIn: 'root' })
export class EventsService extends ResourceService<CalendarEvent> {
  protected readonly path = '/events';
  constructor(api: ApiService) { super(api); }
  // Inherits getAll/getById/create/update/delete from ResourceService.
  // getAll() accepts optional { date_from, date_to } filters via the base signature.
}
