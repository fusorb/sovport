// https://docs.expo.dev/guides/using-eslint/
import expoConfig from 'eslint-config-expo/flat.js';

export default [
  ...expoConfig,
  {
    ignores: ['dist/**', '.expo/**', 'node_modules/**', 'android/**', 'ios/**'],
  },
  {
    // Node build scripts (run outside the app bundle).
    files: ['gen-snapshot.js', 'scripts/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
      },
    },
  },
  {
    rules: {
      // New in eslint-plugin-react-hooks v7. It flags intentional, widespread
      // patterns here — the auth gate's state transitions, fetch-on-mount, and
      // the web color-scheme hydration hook. Off until we choose to refactor.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
