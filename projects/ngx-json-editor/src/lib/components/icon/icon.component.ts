import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Names of the built-in toolbar icons. */
export type NjeIconName =
  | 'format'
  | 'compact'
  | 'sort'
  | 'filter'
  | 'search'
  | 'transform'
  | 'undo'
  | 'redo'
  | 'expand'
  | 'collapse'
  | 'new'
  | 'open'
  | 'save'
  | 'copy'
  | 'download'
  | 'fullscreen'
  | 'menu'
  | 'compare'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'caret';

/**
 * Original line-style SVG icons for the toolbar (no icon-font dependency, no
 * third-party assets). Stroked with `currentColor` so they inherit text color.
 */
@Component({
  selector: 'ngx-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    viewBox="0 0 24 24"
    [attr.width]="size()"
    [attr.height]="size()"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    @switch (name()) {
      @case ('format') {
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="8" y1="12" x2="20" y2="12" />
        <line x1="12" y1="18" x2="20" y2="18" />
      }
      @case ('compact') {
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      }
      @case ('sort') {
        <path d="M7 4v16" />
        <path d="M4 8l3-4 3 4" />
        <path d="M17 20V4" />
        <path d="M14 16l3 4 3-4" />
      }
      @case ('filter') {
        <path d="M3 5h18l-7 8v6l-4-2v-4z" />
      }
      @case ('search') {
        <circle cx="11" cy="11" r="6" />
        <line x1="20" y1="20" x2="15.5" y2="15.5" />
      }
      @case ('transform') {
        <path d="M4 7h11" />
        <path d="M12 4l3 3-3 3" />
        <path d="M20 17H9" />
        <path d="M12 14l-3 3 3 3" />
      }
      @case ('undo') {
        <path d="M9 7H5V3" />
        <path d="M5 7a9 9 0 1 1-2 6" />
      }
      @case ('redo') {
        <path d="M15 7h4V3" />
        <path d="M19 7a9 9 0 1 0 2 6" />
      }
      @case ('expand') {
        <polyline points="8 4 12 8 16 4" />
        <polyline points="8 20 12 16 16 20" />
        <line x1="12" y1="8" x2="12" y2="16" />
      }
      @case ('collapse') {
        <polyline points="8 8 12 4 16 8" />
        <polyline points="8 16 12 20 16 16" />
      }
      @case ('new') {
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <polyline points="14 3 14 8 19 8" />
      }
      @case ('open') {
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      }
      @case ('save') {
        <path d="M5 3h11l3 3v15H5z" />
        <path d="M8 3v6h7V3" />
        <rect x="8" y="13" width="8" height="6" />
      }
      @case ('copy') {
        <rect x="9" y="9" width="11" height="11" rx="1" />
        <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
      }
      @case ('download') {
        <path d="M12 4v11" />
        <polyline points="7 11 12 16 17 11" />
        <line x1="5" y1="20" x2="19" y2="20" />
      }
      @case ('fullscreen') {
        <polyline points="4 9 4 4 9 4" />
        <polyline points="20 9 20 4 15 4" />
        <polyline points="4 15 4 20 9 20" />
        <polyline points="20 15 20 20 15 20" />
      }
      @case ('menu') {
        <circle cx="12" cy="5" r="1.4" />
        <circle cx="12" cy="12" r="1.4" />
        <circle cx="12" cy="19" r="1.4" />
      }
      @case ('compare') {
        <line x1="12" y1="3" x2="12" y2="21" />
        <polyline points="7 8 4 11 7 14" />
        <polyline points="17 8 20 11 17 14" />
      }
      @case ('chevron-left') {
        <polyline points="15 6 9 12 15 18" />
      }
      @case ('chevron-right') {
        <polyline points="9 6 15 12 9 18" />
      }
      @case ('chevron-up') {
        <polyline points="6 15 12 9 18 15" />
      }
      @case ('chevron-down') {
        <polyline points="6 9 12 15 18 9" />
      }
      @case ('caret') {
        <polygon points="8 5 16 12 8 19" fill="currentColor" stroke="none" />
      }
    }
  </svg>`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      }
    `,
  ],
})
export class IconComponent {
  readonly name = input.required<NjeIconName>();
  readonly size = input<number>(16);
}
