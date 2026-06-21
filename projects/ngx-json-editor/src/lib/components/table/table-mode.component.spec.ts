import { TestBed } from '@angular/core/testing';
import { EditorStore } from '../../state/editor-store';
import { TableModeComponent } from './table-mode.component';

describe('TableModeComponent', () => {
  function setup(json: unknown) {
    TestBed.configureTestingModule({
      imports: [TableModeComponent],
      providers: [EditorStore],
    });
    const store = TestBed.inject(EditorStore);
    store.replaceDocument({ json: json as never });
    const fixture = TestBed.createComponent(TableModeComponent);
    fixture.detectChanges();
    return { fixture, store };
  }

  it('renders a header column per unioned key for an array of objects', () => {
    const { fixture } = setup([
      { a: 1, b: 2 },
      { b: 3, c: 4 },
    ]);
    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.nje-th[role="columnheader"]',
    );
    expect(Array.from(headers).map((h) => h.textContent?.trim())).toEqual(['a', 'b', 'c']);
  });

  it('shows a notice when the document is not an array', () => {
    const { fixture } = setup({ a: 1 });
    expect((fixture.nativeElement as HTMLElement).querySelector('.nje-table-notice')).toBeTruthy();
  });
});
