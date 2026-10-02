// Resolves data-theme before first paint (decision G10). Mirrors
// src/shared/lib/theme.ts: key 'tools:theme', values system | light | dark.
(function () {
  var pref = 'system';
  try {
    var raw = localStorage.getItem('tools:theme');
    if (raw === 'light' || raw === 'dark' || raw === 'system') pref = raw;
  } catch (e) {
    // Storage blocked (private mode): fall back to the system preference.
  }
  var dark =
    pref === 'dark' ||
    (pref === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  var theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
