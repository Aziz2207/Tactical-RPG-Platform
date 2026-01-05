import { TestBed } from '@angular/core/testing';

import { AvatarsPurchaseService } from './avatars-purchase.service';

describe('AvatarsPurchaseService', () => {
  let service: AvatarsPurchaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AvatarsPurchaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
