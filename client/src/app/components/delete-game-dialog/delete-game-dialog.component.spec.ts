import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { DeleteGameDialogComponent } from './delete-game-dialog.component';
import { MatButtonModule } from '@angular/material/button';

describe('DeleteGameDialogComponent', () => {
    let component: DeleteGameDialogComponent;
    let fixture: ComponentFixture<DeleteGameDialogComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<DeleteGameDialogComponent>>;

    beforeEach(async () => {
        const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [MatDialogModule, MatButtonModule],
            providers: [{ provide: MatDialogRef, useValue: dialogRefSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(DeleteGameDialogComponent);
        component = fixture.componentInstance;
        mockDialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<DeleteGameDialogComponent>>;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close dialog when onNoClick is called', () => {
        component.onNoClick();
        expect(mockDialogRef.close).toHaveBeenCalled();
    });
});
