import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FriendsBarComponent } from './friends-bar.component';

describe('FriendsListComponent', () => {
  let component: FriendsBarComponent;
  let fixture: ComponentFixture<FriendsBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FriendsBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FriendsBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
