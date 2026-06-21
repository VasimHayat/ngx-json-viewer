import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { NgxJsonEditorComponent } from './ngx-json-editor.component';

describe('NgxJsonEditorComponent', () => {
  let fixture: ComponentFixture<NgxJsonEditorComponent>;
  let component: NgxJsonEditorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxJsonEditorComponent],
      providers: [provideNoopAnimations(), providePrimeNG({ theme: { preset: Aura } })],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxJsonEditorComponent);
    component = fixture.componentInstance;
  });

  it('creates and renders a toolbar, body, and status bar', () => {
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(component).toBeTruthy();
    expect(host.querySelector('.nje-toolbar')).toBeTruthy();
    expect(host.querySelector('.nje-body')).toBeTruthy();
    expect(host.querySelector('.nje-statusbar')).toBeTruthy();
  });

  it('shows the empty-document placeholder for an empty object', () => {
    fixture.componentRef.setInput('content', { json: {} });
    fixture.detectChanges();
    const empty = (fixture.nativeElement as HTMLElement).querySelector('.nje-empty');
    expect(empty?.textContent?.trim()).toBe('Empty document');
  });

  it('renders the document text for non-empty content', () => {
    fixture.componentRef.setInput('content', { json: { a: 1 } });
    fixture.detectChanges();
    const preview = (fixture.nativeElement as HTMLElement).querySelector('.nje-preview');
    expect(preview?.textContent).toContain('"a": 1');
  });

  it('switches mode and emits modeChange', () => {
    const emitted: string[] = [];
    component.modeChange.subscribe((m) => emitted.push(m));
    fixture.detectChanges();
    component.setMode('text');
    expect(component.activeMode()).toBe('text');
    expect(emitted).toEqual(['text']);
  });

  it('format() and compact() round-trip the document', () => {
    fixture.componentRef.setInput('content', { json: { a: 1, b: [2, 3] } });
    fixture.detectChanges();
    component.compact();
    expect(component.get()).toEqual({ text: '{"a":1,"b":[2,3]}' });
    component.format();
    const got = component.get();
    expect(('json' in got ? got.json : null) as unknown).toEqual({ a: 1, b: [2, 3] });
  });
});
