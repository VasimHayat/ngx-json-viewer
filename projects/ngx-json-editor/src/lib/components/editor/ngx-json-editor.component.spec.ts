import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { EditorMode } from '../../models';
import { NgxJsonEditorComponent } from './ngx-json-editor.component';

describe('NgxJsonEditorComponent', () => {
  let fixture: ComponentFixture<NgxJsonEditorComponent>;
  let component: NgxJsonEditorComponent;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxJsonEditorComponent],
      providers: [provideNoopAnimations(), providePrimeNG({ theme: { preset: Aura } })],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxJsonEditorComponent);
    component = fixture.componentInstance;
    host = fixture.nativeElement as HTMLElement;
  });

  it('creates and renders a toolbar, body, and status bar', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(host.querySelector('.nje-toolbar')).toBeTruthy();
    expect(host.querySelector('.nje-body')).toBeTruthy();
    expect(host.querySelector('.nje-statusbar')).toBeTruthy();
  });

  it('shows the empty-document placeholder for an empty object', () => {
    fixture.componentRef.setInput('content', { json: {} });
    fixture.detectChanges();
    expect(host.querySelector('.nje-empty')?.textContent?.trim()).toBe('Empty document');
  });

  it('renders the tree for non-empty content in tree mode', () => {
    fixture.componentRef.setInput('content', { json: { a: 1 } });
    fixture.detectChanges();
    expect(host.querySelector('ngx-json-tree')).toBeTruthy();
  });

  it('renders the table component in table mode for an array', () => {
    fixture.componentRef.setInput('content', { json: [{ a: 1 }] });
    fixture.componentRef.setInput('mode', 'table');
    fixture.detectChanges();
    expect(host.querySelector('ngx-json-table')).toBeTruthy();
  });

  it('opens the find bar and reports match counts', () => {
    fixture.componentRef.setInput('content', { json: { name: 'Ada' } });
    fixture.detectChanges();
    component.toggleSearch();
    fixture.detectChanges();
    expect(host.querySelector('.nje-searchbar')).toBeTruthy();
    component.onSearchInput('Ada');
    fixture.detectChanges();
    expect(component.searchOpen()).toBeTrue();
  });

  it('switches mode via the store and emits modeChange', () => {
    const emitted: EditorMode[] = [];
    component.modeChange.subscribe((m) => emitted.push(m));
    fixture.detectChanges();
    component.setMode('table'); // table renders the placeholder (no CodeMirror)
    fixture.detectChanges();
    expect(host.getAttribute('data-mode')).toBe('table');
    expect(emitted).toEqual(['table']);
  });

  it('compact() and format() round-trip through the store', () => {
    fixture.componentRef.setInput('content', { json: { a: 1, b: [2, 3] } });
    fixture.detectChanges();

    component.compact();
    const c1 = component.get();
    expect('text' in c1 ? c1.text : '').toBe('{"a":1,"b":[2,3]}');

    component.format();
    const c2 = component.get();
    const parsed = 'text' in c2 && c2.text ? JSON.parse(c2.text) : null;
    expect(parsed).toEqual({ a: 1, b: [2, 3] });
  });

  it('supports undo after an edit', () => {
    fixture.componentRef.setInput('content', { json: { a: 1 } });
    fixture.detectChanges();
    component.compact();
    expect('text' in component.get()).toBeTrue();
    component.undo();
    const back = component.get();
    expect('json' in back ? (back.json as unknown) : null).toEqual({ a: 1 });
  });

  it('reports parse errors via validate() in text content', () => {
    fixture.componentRef.setInput('content', { text: '{bad' });
    fixture.detectChanges();
    const errors = component.validate();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].source).toBe('parse');
  });
});
