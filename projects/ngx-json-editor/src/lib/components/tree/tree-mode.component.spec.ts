import { TestBed } from '@angular/core/testing';
import { EditorStore } from '../../state/editor-store';
import { TreeModeComponent } from './tree-mode.component';

describe('TreeModeComponent', () => {
  it('creates with a store and renders a tree viewport', () => {
    TestBed.configureTestingModule({
      imports: [TreeModeComponent],
      providers: [EditorStore],
    });
    const store = TestBed.inject(EditorStore);
    store.replaceDocument({ json: { a: 1, b: { c: 2 } } });

    const fixture = TestBed.createComponent(TreeModeComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    const vp = (fixture.nativeElement as HTMLElement).querySelector('cdk-virtual-scroll-viewport');
    expect(vp).toBeTruthy();
  });
});
