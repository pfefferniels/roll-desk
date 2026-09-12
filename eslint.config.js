import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // `public/js` is build output from @ryohey/wavelet, copied in and not ours to lint.
    // `build` and `video` are gitignored, the latter holding the video pipeline's scripts.
    { ignores: ['build', 'public/js', 'video'] },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    react.configs.flat.recommended,
    react.configs.flat['jsx-runtime'],
    {
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
            parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
        },
        // TypeScript resolves names itself, and the rule cannot see its types.
        rules: { 'no-undef': 'off' },
    },
    {
        // Outside `tsconfig.json`'s program, so the type-aware rules have
        // nothing to read.
        files: ['eslint.config.js'],
        ...tseslint.configs.disableTypeChecked,
    },
    {
        // The scripts edit the stored JSON-LD document, which has no type of
        // its own, so everything read out of it is `any` by design. The rules
        // that object to that would report the whole file; the rest still apply.
        files: ['scripts/**'],
        rules: {
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
        },
    },
    {
        settings: { react: { version: 'detect' } },
        plugins: { 'react-hooks': reactHooks },
        rules: { ...reactHooks.configs.recommended.rules },
    },
    {
        // The last rule the tree does not satisfy yet (see #101, #124). The findings
        // left are dialogs that reload a whole form from what they edit; the rule
        // belongs at 'error' once they mount with it instead.
        rules: {
            'react-hooks/set-state-in-effect': 'warn',
        },
    },
);
