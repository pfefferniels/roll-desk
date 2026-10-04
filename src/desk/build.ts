/** The commit a build of the desk was made from, and when that commit was made. */
export type Build = {
    /** The full hash of the commit. */
    commit: string
    /** When the commit was made, as ISO 8601. */
    date: string
}

/** Put in place by Vite (`define` in vite.config.ts); null where the desk was built outside a git checkout. */
declare const __BUILD__: Build | null

/** The build in hand, if it is known. */
export const build: Build | undefined = __BUILD__ ?? undefined

const repository = 'https://github.com/pfefferniels/roll-desk'

/** Where the source of a build can be read. */
export const sourceOf = ({ commit }: Build) => `${repository}/tree/${commit}`

/**
 * A build as a reader names it: the short hash and the day of the commit,
 * the day taken in UTC so that it does not move with the reader's clock.
 */
export const buildLine = ({ commit, date }: Build) => {
    const day = new Date(date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    })
    return `${commit.slice(0, 7)} of ${day}`
}
