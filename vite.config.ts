import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * `/editor` as a file GitHub Pages can find.
 *
 * Pages resolves a path to a file and offers no rewrite rule, so `/editor`
 * matches nothing and it falls back to `404.html`, leaving the URL alone.
 * That is all the router needs: it reads the route off `location.pathname`,
 * so the fallback page only has to BE the app. Hence a copy of the built
 * index.html, taken from the bundle so it carries the same hashed asset names.
 *
 * `enforce: 'post'` because index.html is emitted by Vite's own build plugins,
 * which run after ordinary user plugins.
 */
const spaFallback = (): Plugin => ({
    name: 'spa-fallback',
    enforce: 'post',
    generateBundle(_options, bundle) {
        const index = bundle['index.html'];
        if (index?.type !== 'asset') throw new Error('no built index.html to copy to 404.html');
        this.emitFile({ type: 'asset', fileName: '404.html', source: index.source });
    },
});

/**
 * One chunk of the vendor half of the bundle, and the packages it holds.
 * A name matches that package; a name ending in `*` matches every package
 * whose name starts with the rest of it. `modules` names single files that
 * belong here whichever package they come from, and is read first.
 */
type VendorChunk = {
    readonly name: string;
    readonly packages: readonly string[];
    readonly modules?: readonly string[];
};

/**
 * The vendor code cut along release lines, so that a deploy which touches
 * only the app, or only one of these groups, leaves the other chunks in the
 * browser cache. A package named here but absent from the build never
 * matches. A package named nowhere lands in `vendor`.
 */
const vendorChunks: readonly VendorChunk[] = [
    {
        name: 'react',
        packages: ['react', 'react-dom', 'react-router', 'react-router-dom', 'react-is', 'scheduler'],
    },
    {
        // MUI X is versioned apart from MUI Core, dayjs alongside it as the
        // date adapter its pickers ask for. Declared first because it would
        // otherwise fall to the `@mui/*` of the group below.
        name: 'mui-x',
        packages: ['@mui/x-*', 'dayjs'],
    },
    {
        name: 'mui',
        packages: [
            '@mui/*', '@emotion/*', '@popperjs/*', 'stylis', 'clsx',
            'react-transition-group', 'dom-helpers', 'hoist-non-react-statics', 'prop-types',
        ],
    },
    {
        // react-pianosound ships Tone and its friends already bundled. The
        // rest are named for the day the app reaches for one of them itself.
        name: 'audio',
        packages: [
            'react-pianosound', 'tone', '@tonejs/*', 'smplr', '@ryohey/*',
            'webmidi', 'wav-encoder', 'tonal', 'midifile-ts', 'midi-parser-js',
        ],
    },
    {
        // Our own libraries, which are released far more often than the rest.
        name: 'rolls',
        packages: ['linked-rolls', 'welte-t100-emulator'],
    },
    {
        // The JSON-LD schema check, which only importing a document asks for.
        // Its two linked-rolls modules are named here so that the whole check
        // stays out of `rolls` and off the first load.
        name: 'schema',
        packages: ['ajv', 'fast-uri', 'fast-deep-equal', 'json-schema-traverse'],
        modules: ['linked-rolls/lib/validate.js', 'linked-rolls/lib/schema.json'],
    },
    {
        name: 'd3',
        packages: ['d3', 'd3-*'],
    },
];

const packageOf = (moduleId: string) => {
    const marker = 'node_modules/';
    const at = moduleId.lastIndexOf(marker);
    if (at < 0) return undefined;
    const [first, second] = moduleId.slice(at + marker.length).split('/');
    if (!first) return undefined;
    return first.startsWith('@') && second ? `${first}/${second}` : first;
};

const holds = ({ packages }: VendorChunk, pkg: string) =>
    packages.some(pattern =>
        pattern.endsWith('*') ? pkg.startsWith(pattern.slice(0, -1)) : pkg === pattern);

const holdsModule = ({ modules }: VendorChunk, moduleId: string) =>
    modules?.some(named => moduleId.endsWith(named)) ?? false;

/** The chunk a module belongs in, or `null` to leave it where Vite puts it. */
const chunkOf = (moduleId: string) => {
    const named = vendorChunks.find(chunk => holdsModule(chunk, moduleId));
    if (named) return named.name;

    const pkg = packageOf(moduleId);
    if (!pkg) return null;
    return vendorChunks.find(chunk => holds(chunk, pkg))?.name ?? 'vendor';
};

export default defineConfig(() => {
    return {
        resolve: {
            dedupe: ['react', 'react-dom'],
        },
        build: {
            outDir: 'build',
            rolldownOptions: {
                output: {
                    // `chunkOf` already names a chunk for every vendor module,
                    // so pulling dependencies in recursively would only let
                    // whichever group is built first swallow the others.
                    codeSplitting: {
                        groups: [{ name: chunkOf, includeDependenciesRecursively: false }],
                    },
                },
            },
        },
        plugins: [
            react(),
            spaFallback(),
        ],
        worker: {
            format: 'es' as const,
        },
        test: {
            server: {
                deps: {
                    // linked-rolls ships extensionless ESM imports, which Vite
                    // resolves but Node's loader does not. Only its own files:
                    // its nested dependencies are Node's business.
                    inline: [/\/linked-rolls\/lib\//],
                },
            },
        },
    };
});
