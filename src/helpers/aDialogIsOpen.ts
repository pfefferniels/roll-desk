/**
 * Whether a dialog stands open over the desk.
 *
 * The desk's hotkeys listen on `document` and would otherwise fire through it.
 * MUI portals an open dialog in under `role='dialog'` and takes it out again on
 * close, so a dialog added later is covered without having to announce itself.
 *
 * It belongs in the `ignoreEventWhen` option of `useHotkeys`. The `enabled`
 * option swallows the keystroke instead, which would keep a focused button in
 * the dialog from taking it.
 */
export const aDialogIsOpen = () => document.querySelector('[role="dialog"]') !== null
