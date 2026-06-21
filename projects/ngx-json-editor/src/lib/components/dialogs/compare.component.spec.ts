import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { CompareComponent } from './compare.component';

describe('CompareComponent', () => {
  it('creates and opens the compare dialog', async () => {
    await TestBed.configureTestingModule({
      imports: [CompareComponent],
      providers: [provideNoopAnimations(), providePrimeNG({ theme: { preset: Aura } })],
    }).compileComponents();

    const fixture = TestBed.createComponent(CompareComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    fixture.componentInstance.open({ a: 1 });
    fixture.detectChanges();
    // Dialog content renders to the document body via PrimeNG's overlay.
    expect(document.querySelector('.nje-cmp-grid')).toBeTruthy();
  });
});
