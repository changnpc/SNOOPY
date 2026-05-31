/**
 * Generates "Buddy" mascot avatars as inline SVG data-URIs — original art,
 * not a licensed character. Used as the default avatar for every user, with
 * colour variants seeded by the user id/name so each person keeps a consistent
 * (but varied across the team) look.
 */

interface MascotVariant { bg: string; ear: string; collar: string; tag: string; }

// Varied but cohesive palettes (white fur stays constant; ears/collar/bg vary).
const VARIANTS: MascotVariant[] = [
  { bg: '#dbeafe', ear: '#c98a5e', collar: '#4a90d9', tag: '#e9c14e' },
  { bg: '#fde2e4', ear: '#3a3330', collar: '#e0556b', tag: '#ffd23f' },
  { bg: '#dcf3e3', ear: '#8b5a3c', collar: '#4f9d4a', tag: '#ffd23f' },
  { bg: '#f3e3fb', ear: '#5a4a3a', collar: '#9b5bd6', tag: '#e9c14e' },
  { bg: '#fff0d6', ear: '#c98a5e', collar: '#f4a300', tag: '#4a90d9' },
  { bg: '#e0f2fe', ear: '#2f2a26', collar: '#0ea5b7', tag: '#ffd23f' },
  { bg: '#ffe4ec', ear: '#a8703f', collar: '#e0556b', tag: '#4a90d9' },
  { bg: '#e8eaf6', ear: '#6b4a2f', collar: '#5c6bc0', tag: '#e9c14e' },
];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Build a circular Buddy avatar SVG string for a given seed. */
export function mascotAvatarSvg(seed: string): string {
  const v = VARIANTS[hashSeed(seed || 'buddy') % VARIANTS.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" rx="50" fill="${v.bg}"/>
<ellipse cx="50" cy="92" rx="22" ry="4" fill="#1f2933" opacity=".10"/>
<path d="M28 64 q18 -8 44 0 q4 22 -22 24 q-26 -2 -22 -24Z" fill="#fff" stroke="#1f2933" stroke-width="3"/>
<path d="M22 44 q-12 4 -10 22 q2 11 13 9 q-6 -18 -3 -31Z" fill="${v.ear}" stroke="#1f2933" stroke-width="3"/>
<path d="M78 44 q12 4 10 22 q-2 11 -13 9 q6 -18 3 -31Z" fill="${v.ear}" stroke="#1f2933" stroke-width="3"/>
<circle cx="50" cy="44" r="26" fill="#fff" stroke="#1f2933" stroke-width="3"/>
<path d="M50 20 q14 0 19 13 q-19 -5 -38 0 q5 -13 19 -13Z" fill="${v.ear}" opacity=".8"/>
<circle cx="41" cy="42" r="3.2" fill="#1f2933"/>
<circle cx="59" cy="42" r="3.2" fill="#1f2933"/>
<circle cx="42.1" cy="40.9" r="1" fill="#fff"/>
<circle cx="60.1" cy="40.9" r="1" fill="#fff"/>
<ellipse cx="50" cy="53" rx="10" ry="7.5" fill="#fff" stroke="#1f2933" stroke-width="2.2"/>
<ellipse cx="50" cy="50.5" rx="3.8" ry="3" fill="#1f2933"/>
<path d="M50 53 q0 6.5 -5.5 7.5 M50 53 q0 6.5 5.5 7.5" stroke="#1f2933" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<path d="M32 66 q18 7 36 0" stroke="${v.collar}" stroke-width="5" fill="none" stroke-linecap="round"/>
<circle cx="50" cy="71" r="6.5" fill="${v.tag}" stroke="#1f2933" stroke-width="1.6"/>
<path d="M50 68 c-2.4 2.4 -3.6 3.6 -3.6 5 a1.6 1.6 0 0 0 2.4 1 c-.24 .8 -.56 1.28 -1.12 1.68 h4.64 c-.56 -.4 -.88 -.88 -1.12 -1.68 a1.6 1.6 0 0 0 2.4 -1 c0 -1.4 -1.2 -2.6 -3.6 -5Z" fill="#1f2933"/>
</svg>`;
}

/** Data-URI form usable directly in <img src>. */
export function mascotAvatarUri(seed: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(mascotAvatarSvg(seed))}`;
}
