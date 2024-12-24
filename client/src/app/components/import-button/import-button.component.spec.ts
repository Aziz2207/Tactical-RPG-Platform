import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportButtonComponent } from './import-button.component';

describe('ImportButtonComponent', () => {
    let component: ImportButtonComponent;
    let fixture: ComponentFixture<ImportButtonComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ImportButtonComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ImportButtonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should inform when the selected file is invalid', () => {
        const mockFile = new File(['invalid json'], 'game.json', { type: 'application/json' });
        const mockEvent = { target: { files: [mockFile] } } as unknown as Event;

        const fileReaderMock = {
            onload: null,
            readAsText: jasmine.createSpy('readAsText').and.callFake(function (this: FileReader) {
                this.onload?.({ target: { result: 'invalid json' } } as ProgressEvent<FileReader>);
            }),
        } as unknown as FileReader;

        spyOn(window, 'FileReader').and.returnValue(fileReaderMock);
        spyOn(window, 'alert');

        component.importGame(mockEvent);

        expect(fileReaderMock.readAsText).toHaveBeenCalledWith(mockFile);
        expect(window.alert).toHaveBeenCalledWith('Le fichier JSON est invalide');
    });

    it('should do nothing if no file is selected', () => {
        const mockEvent = { target: { files: [] } } as unknown as Event;

        const emitSpy = spyOn(component.importEvent, 'emit');
        component.importGame(mockEvent);

        expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should trigger input click when triggerImport is called', () => {
        const inputElementMock = {
            click: jasmine.createSpy('click'),
        } as unknown as HTMLInputElement;

        spyOn(document, 'getElementById').and.returnValue(inputElementMock);

        component.triggerImport();

        expect(document.getElementById).toHaveBeenCalledWith('import-game');
        expect(inputElementMock.click).toHaveBeenCalled();
    });

    it('should handle missing input element', () => {
        spyOn(console, 'error');
        component.triggerImport();

        expect(console.error).not.toHaveBeenCalled();
    });
});
