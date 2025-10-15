// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const boundaries = require('eslint-plugin-boundaries');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        {
          type: 'shared',
          pattern: 'src/shared/*',
          mode: 'folder',
        },
        {
          type: 'core-providers',
          pattern: 'src/core/providers/*',
          mode: 'folder',
        },
        {
          type: 'core-services',
          pattern: 'src/core/services/*',
          mode: 'folder',
        },
        {
          type: 'features',
          pattern: 'src/features/*',
          mode: 'folder',
        },
      ],
      'boundaries/ignore': ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            // shared/* cannot import from core/* or features/*
            {
              from: ['shared'],
              disallow: ['core-providers', 'core-services', 'features'],
              message: 'shared/* cannot import from core/* or features/*. Only import from other shared/* modules.',
            },
            // features/* can import only from shared/* and core/providers/*
            {
              from: ['features'],
              allow: ['shared', 'core-providers'],
              message: 'features/* can only import from shared/* and core/providers/*. Cannot import from core/services/* or other features/*.',
            },
            // core/services/* cannot import from features/*
            {
              from: ['core-services'],
              allow: ['shared', 'core-providers', 'core-services'],
              message: 'core/services/* can import from shared/*, core/providers/*, and other core/services/*. Cannot import from features/*.',
            },
            // core/providers/* can import from core/services/* and shared/*
            {
              from: ['core-providers'],
              allow: ['core-services', 'shared'],
              message: 'core/providers/* can import from core/services/* and shared/*.',
            },
          ],
        },
      ],
    },
  },
]);
