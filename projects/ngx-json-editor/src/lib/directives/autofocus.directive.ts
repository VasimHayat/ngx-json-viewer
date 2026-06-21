import { AfterViewInit, Directive, ElementRef, booleanAttribute, inject, input } from '@angular/core';

/**
 * Focuses (and optionally selects) the host element after it renders. Used for
 * inline editors so a freshly-opened field is ready for typing — an accessible
 * alternative to the discouraged static `autofocus` attribute (the focus is a
 * direct consequence of the user's edit action).
 */
@Directive({
  selector: '[ngxAutofocus]',
})
export class AutofocusDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLElement>);
  /**
   * When truthy (default), select existing text after focusing. A bare
   * `ngxAutofocus` attribute coerces to `true` via {@link booleanAttribute}.
   */
  readonly selectText = input(true, { alias: 'ngxAutofocus', transform: booleanAttribute });

  ngAfterViewInit(): void {
    const node = this.el.nativeElement;
    queueMicrotask(() => {
      node.focus();
      if (this.selectText() && node instanceof HTMLInputElement) {
        node.select();
      }
    });
  }
}
