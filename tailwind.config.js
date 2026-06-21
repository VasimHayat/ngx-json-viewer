/** @type {import('tailwindcss').Config} */
module.exports = {
  // `tw-` prefix avoids collisions with a host app's own Tailwind classes.
  prefix: 'tw-',
  // Class-based dark mode so the editor/host can toggle without media queries.
  darkMode: 'class',
  content: [
    './projects/playground/src/**/*.{html,ts}',
    './projects/ngx-json-editor/**/*.{html,ts}',
  ],
  // Scope Tailwind's reset so it cannot leak into a consuming app when the
  // library is built. (Preflight is fine inside the standalone playground.)
  theme: {
    extend: {},
  },
  plugins: [],
};
