import { modalClasses } from '@mui/material/Modal'

/**
 * Whether a keystroke is going to something inside an overlay.
 *
 * The desk's hotkeys listen on `document` and would otherwise fire through
 * whatever stands open over it. MUI builds `Dialog`, `Popover`, `Menu` and
 * `Drawer` on `Modal`, whose portalled root carries `MuiModal-root` and traps
 * focus inside itself, so the keystroke's target is a descendant of that root.
 * A `Tooltip` and the other `Popper` overlays leave focus where it was, so
 * their keystrokes are the desk's.
 *
 * The target rather than the document, because MUI parks focus on the dialog
 * container, which sits above the paper carrying `role='dialog'`.
 *
 * It belongs in the `ignoreEventWhen` option of `useHotkeys`. The `enabled`
 * option swallows the keystroke instead, which would keep a focused button in
 * the overlay from taking it.
 */
export const goesToAnOverlay = ({ target }: KeyboardEvent) =>
    (target as Element | null)?.closest?.(`.${modalClasses.root}`) != null
