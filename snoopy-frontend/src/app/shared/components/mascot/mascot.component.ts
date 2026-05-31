import { Component, Input } from '@angular/core';

/**
 * Original comic mascot — "Buddy" the bridge pup.
 * NOT a licensed character: distinct design (tan ears, blue collar with a
 * spade tag tying to bridge, chibi proportions). Pure inline SVG, no assets.
 *
 * Usage: <app-mascot [size]="96" mood="happy"></app-mascot>
 *   mood: 'happy' | 'wave' | 'sleep' | 'cheer'
 */
@Component({
  selector: 'app-mascot',
  template: `
<svg [attr.width]="size" [attr.height]="size" viewBox="0 0 120 120" fill="none"
     xmlns="http://www.w3.org/2000/svg" class="mascot-svg" [class.mascot-bob]="animate">
  <!-- ground shadow -->
  <ellipse cx="60" cy="110" rx="30" ry="5" fill="#1f2933" opacity=".12"/>

  <!-- body -->
  <path d="M38 70 q-6 30 22 32 q28 -2 22 -32 q-22 -10 -44 0Z" fill="#fff" stroke="#1f2933" stroke-width="3.5"/>

  <!-- left front paw -->
  <ellipse cx="50" cy="103" rx="9" ry="6.5" fill="#fff" stroke="#1f2933" stroke-width="3"/>
  <!-- right front paw -->
  <ellipse cx="70" cy="103" rx="9" ry="6.5" fill="#fff" stroke="#1f2933" stroke-width="3"/>

  <!-- waving arm (mood=wave/cheer) -->
  <g *ngIf="mood==='wave' || mood==='cheer'">
    <path d="M82 74 q14 -10 16 -26" stroke="#1f2933" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="99" cy="46" rx="7" ry="6" fill="#fff" stroke="#1f2933" stroke-width="3"/>
  </g>

  <!-- head -->
  <circle cx="60" cy="48" r="30" fill="#fff" stroke="#1f2933" stroke-width="3.5"/>

  <!-- ears (tan/brown — distinct from Snoopy) -->
  <path d="M34 38 q-16 4 -14 26 q2 14 16 12 q-8 -22 -2 -38Z" fill="#c98a5e" stroke="#1f2933" stroke-width="3.5"/>
  <path d="M86 38 q16 4 14 26 q-2 14 -16 12 q8 -22 2 -38Z" fill="#c98a5e" stroke="#1f2933" stroke-width="3.5"/>

  <!-- brown head patch -->
  <path d="M60 20 q16 0 22 16 q-22 -6 -44 0 q6 -16 22 -16Z" fill="#c98a5e" opacity=".85"/>

  <!-- ── Face by mood ── -->
  <!-- eyes open (happy / wave / cheer) -->
  <g *ngIf="mood!=='sleep'">
    <circle cx="50" cy="46" r="3.6" fill="#1f2933"/>
    <circle cx="70" cy="46" r="3.6" fill="#1f2933"/>
    <circle cx="51.3" cy="44.7" r="1.1" fill="#fff"/>
    <circle cx="71.3" cy="44.7" r="1.1" fill="#fff"/>
  </g>
  <!-- eyes closed (sleep) -->
  <g *ngIf="mood==='sleep'" stroke="#1f2933" stroke-width="3" stroke-linecap="round">
    <path d="M46 47 q4 4 8 0"/>
    <path d="M66 47 q4 4 8 0"/>
  </g>

  <!-- snout + nose -->
  <ellipse cx="60" cy="58" rx="12" ry="9" fill="#fff" stroke="#1f2933" stroke-width="2.5"/>
  <ellipse cx="60" cy="55" rx="4.5" ry="3.5" fill="#1f2933"/>
  <!-- mouth -->
  <path *ngIf="mood!=='sleep'" d="M60 58 q0 8 -7 9 M60 58 q0 8 7 9" stroke="#1f2933" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path *ngIf="mood==='sleep'" d="M55 64 q5 4 10 0" stroke="#1f2933" stroke-width="2.5" fill="none" stroke-linecap="round"/>

  <!-- 'Zzz' for sleep -->
  <g *ngIf="mood==='sleep'" fill="#4a90d9" font-family="Fredoka, sans-serif" font-weight="600">
    <text x="92" y="30" font-size="11">z</text>
    <text x="100" y="22" font-size="14">Z</text>
  </g>

  <!-- collar -->
  <path d="M40 73 q20 8 40 0" stroke="#4a90d9" stroke-width="6" fill="none" stroke-linecap="round"/>
  <!-- spade tag (bridge tie-in) -->
  <circle cx="60" cy="79" r="8" fill="#e9c14e" stroke="#1f2933" stroke-width="2"/>
  <path d="M60 75 c-3 3 -4.5 4.5 -4.5 6.2 a2 2 0 0 0 3 1.2 c-.3 1 -.7 1.6 -1.4 2.1 h5.8 c-.7 -.5 -1.1 -1.1 -1.4 -2.1 a2 2 0 0 0 3 -1.2 c0 -1.7 -1.5 -3.2 -4.5 -6.2Z" fill="#1f2933"/>
</svg>
  `,
})
export class MascotComponent {
  @Input() size = 96;
  @Input() mood: 'happy' | 'wave' | 'sleep' | 'cheer' = 'happy';
  @Input() animate = false;
}
