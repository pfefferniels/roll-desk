import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // `public/js` is build output from @ryohey/wavelet, copied in and not ours to lint.
    { ignores: ['build', 'public/js'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    react.configs.flat.recommended,
    react.configs.flat['jsx-runtime'],
    {
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
        // TypeScript resolves names itself, and the rule cannot see its types.
        rules: { 'no-undef': 'off' },
    },
    {
        settings: { react: { version: 'detect' } },
        plugins: { 'react-hooks': reactHooks },
        rules: { ...reactHooks.configs.recommended.rules },
    },
    {
        // Rules the tree does not satisfy yet (see #101). Warnings for now, so that an
        // error means something new; each belongs at 'error' once its findings are gone.
        rules: {
            'react-hooks/immutability': 'warn',
            'react-hooks/refs': 'warn',
            'react-hooks/set-state-in-effect': 'warn',
        },
    },
);
