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
        // The last rule the tree does not satisfy yet (see #101, #124). The findings
        // left are dialogs that reload a whole form from what they edit; the rule
        // belongs at 'error' once they mount with it instead.
        rules: {
            'react-hooks/set-state-in-effect': 'warn',
        },
    },
);
