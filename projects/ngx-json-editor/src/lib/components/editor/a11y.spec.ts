import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import axe from 'axe-core';
import { NgxJsonEditorComponent } from './ngx-json-editor.component';

/**
 * Accessibility gate: the rendered editor must have zero serious/critical axe
 * violations (spec §7). Run against tree and table modes with real content.
 */
describe('NgxJsonEditorComponent a11y (axe-core)', () => {
  let fixture: ComponentFixture<NgxJsonEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxJsonEditorComponent],
      providers: [provideNoopAnimations(), providePrimeNG({ theme: { preset: Aura } })],
    }).compileComponents();
    fixture = TestBed.createComponent(NgxJsonEditorComponent);
  });

  async function expectNoSeriousViolations(): Promise<void> {
    const results = await axe.run(fixture.nativeElement as HTMLElement, {
      // Color contrast needs real layout/paint that headless karma doesn't
      // fully provide; it's verified visually. Everything else is enforced.
      rules: { 'color-contrast': { enabled: false } },
    });
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    const summary = serious.map((v) => `${v.id}: ${v.help}`).join('\n');
    expect(serious.length).withContext(`axe serious/critical violations:\n${summary}`).toBe(0);
  }

  it('has no serious/critical violations in tree mode', async () => {
    fixture.componentRef.setInput('content', {
      json: { name: 'Ada', tags: ['a', 'b'], active: true, meta: { score: 1 } },
    });
    fixture.detectChanges();
    await expectNoSeriousViolations();
  });

  it('has no serious/critical violations in table mode', async () => {
    fixture.componentRef.setInput('content', {
      json: [
        { a: 1, b: 'x' },
        { a: 2, b: 'y' },
      ],
    });
    fixture.componentRef.setInput('mode', 'table');
    fixture.detectChanges();
    await expectNoSeriousViolations();
  });
});
