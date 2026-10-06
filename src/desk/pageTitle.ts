import { Edition } from 'linked-rolls'
import { copyLabel, versionLabel } from '../edition/names'

/** What lies on the desk. */
interface OnDesk {
    versionId?: string
    copyId?: string
}

/**
 * What lies on the desk, as its heading names it: the version or the
 * copy. Nothing on the title page, whose heading is the edition's title.
 */
export const headingOf = (edition: Edition, { versionId, copyId }: OnDesk): string | undefined => {
    if (versionId && edition.versions.some(version => version.id === versionId)) {
        return `Version ${versionLabel(edition, versionId)}`
    }
    const copy = copyId ? edition.copies.find(copy => copy.id === copyId) : undefined
    return copy && `Copy ${copyLabel(copy)}`
}

/**
 * The title of the page, which a tab, a bookmark and the history list
 * show and a screen reader says first: what lies on the desk, then the
 * edition it belongs to, then the desk itself.
 */
export const pageTitleOf = (edition: Edition | undefined, heading?: string): string =>
    [heading, edition?.title.trim(), 'Roll Desk'].filter(Boolean).join(' · ')
