/* Tema personalizável (cor de fundo escolhida pela pessoa) */
const THEME_PRESETS = [
  { nome: 'Azul CISIA', hex: '#0a0e17' },
  { nome: 'Cinza-escuro', hex: '#1c1f26' },
  { nome: 'Preto', hex: '#000000' },
  { nome: 'Grafite', hex: '#2a2d34' },
  { nome: 'Verde-noite', hex: '#0e1f19' },
  { nome: 'Vinho', hex: '#20131a' },
  { nome: 'Branco', hex: '#f5f6f8' },
  { nome: 'Cinza-claro', hex: '#e7e6e2' },
];
function hexToRgb(hex) {
  const h = hex.replace('#','');
  const n = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
  const v = parseInt(n, 16);
  return { r: (v>>16)&255, g: (v>>8)&255, b: v&255 };
}
function rgbToHex(r,g,b) { return '#' + [r,g,b].map(x => Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join(''); }
function mixHex(hexA, hexB, amount) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  return rgbToHex(a.r+(b.r-a.r)*amount, a.g+(b.g-a.g)*amount, a.b+(b.b-a.b)*amount);
}
function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
}
function applyTheme(hex, persist) {
  const root = document.documentElement;
  const light = relativeLuminance(hex) > 0.5;
  root.style.setProperty('--bg-0', hex);
  root.style.setProperty('--bg-1', mixHex(hex, light ? '#ffffff' : '#ffffff', light ? 0.55 : 0.06));
  root.style.setProperty('--bg-2', mixHex(hex, '#ffffff', light ? 0.75 : 0.10));
  root.style.setProperty('--line', mixHex(hex, light ? '#000000' : '#ffffff', light ? 0.14 : 0.12));
  root.style.setProperty('--ink', light ? '#14171f' : '#e7e9f0');
  root.style.setProperty('--muted', light ? '#5b6172' : '#8993ac');
  if (persist) { try { localStorage.setItem(THEME_KEY, hex); } catch (e) {} }
}
function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved, false);
  } catch (e) {}
}
