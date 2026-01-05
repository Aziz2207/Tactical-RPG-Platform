import { TestBed } from '@angular/core/testing';

import { PrivateRoomService } from './private-room.service';

describe('PrivateRoomService', () => {
  let service: PrivateRoomService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrivateRoomService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
