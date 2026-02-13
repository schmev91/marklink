/**
 * MarkLink — Theme Module
 * Handles dark/light mode toggling and accent color cycling
 */
const Theme = (() => {
  const STORAGE_KEY = 'marklink-theme';
  let currentTheme = 'dark';
  let onChangeCallback = null;

  // Color cycling palette
  const ACCENT_COLORS = [
    { hex: '#35e668', r: 53, g: 230, b: 104 },
    { hex: '#9eb3e6', r: 158, g: 179, b: 230 },
    { hex: '#6685d1', r: 102, g: 133, b: 209 },
    { hex: '#9fffba', r: 159, g: 255, b: 186 },
  ];
  const CYCLE_DURATION = 4000; // ms per color transition
  let colorAnimFrame = null;
  let cycleStartTime = 0;

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      currentTheme = saved;
    } else {
      currentTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    applyTheme(currentTheme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });

    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.addEventListener('click', toggle);
    }

    // Start color cycling
    cycleStartTime = performance.now();
    tickColorCycle();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateIcons(theme);
    updateHljsTheme(theme);
  }

  function updateIcons(theme) {
    const sun = document.querySelector('.icon-sun');
    const moon = document.querySelector('.icon-moon');
    if (sun && moon) {
      sun.style.display = theme === 'dark' ? 'block' : 'none';
      moon.style.display = theme === 'dark' ? 'none' : 'block';
    }
  }

  function updateHljsTheme(theme) {
    const lightLink = document.getElementById('hljs-theme-light');
    const darkLink = document.getElementById('hljs-theme-dark');
    if (lightLink && darkLink) {
      lightLink.disabled = theme === 'dark';
      darkLink.disabled = theme === 'light';
    }
  }

  function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    if (onChangeCallback) onChangeCallback(theme);
  }

  function toggle() {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  function get() {
    return currentTheme;
  }

  function onChange(cb) {
    onChangeCallback = cb;
  }

  // ---- Color Cycling ----
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function tickColorCycle() {
    const now = performance.now();
    const elapsed = now - cycleStartTime;
    const totalCycle = CYCLE_DURATION * ACCENT_COLORS.length;
    const pos = (elapsed % totalCycle) / CYCLE_DURATION;
    const idx = Math.floor(pos);
    const t = pos - idx; // 0..1 fraction between two colors
    const from = ACCENT_COLORS[idx % ACCENT_COLORS.length];
    const to = ACCENT_COLORS[(idx + 1) % ACCENT_COLORS.length];

    const r = Math.round(lerp(from.r, to.r, t));
    const g = Math.round(lerp(from.g, to.g, t));
    const b = Math.round(lerp(from.b, to.b, t));

    const hex = `rgb(${r}, ${g}, ${b})`;
    const root = document.documentElement;
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accent-hover', `rgb(${Math.max(0, r - 15)}, ${Math.max(0, g - 15)}, ${Math.max(0, b - 15)})`);
    root.style.setProperty('--accent-subtle', `rgba(${r}, ${g}, ${b}, 0.13)`);
    root.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.28)`);
    root.style.setProperty('--bg-hover', `rgba(${r}, ${g}, ${b}, 0.10)`);

    colorAnimFrame = requestAnimationFrame(tickColorCycle);
  }

  return { init, get, toggle, onChange };
})();
