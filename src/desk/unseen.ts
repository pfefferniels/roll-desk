/**
 * Keeps an element out of sight but in what a screen reader reads, for
 * what the eye takes in from the drawing, such as which version a roll
 * is, but a screen reader can only be told.
 */
export const unseen = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: 0,
    border: 0,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap'
} as const
