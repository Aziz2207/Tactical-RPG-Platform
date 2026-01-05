import { TestBed } from '@angular/core/testing';

import { ThemePurchaseService } from './theme-purchase.service';

describe('ThemePurchaseService', () => {
  let service: ThemePurchaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemePurchaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
