/** The controls each key activates when the focus sits on one of them. */
const activatedBy: Record<string, string | undefined> = {
    ' ': 'button, [role="button"], summary',
    Enter: 'button, [role="button"], summary, a[href], [role="link"]'
}

/**
 * Whether a keystroke is the activation key of the control it goes to.
 *
 * The desk's hotkeys listen on `document`, so a focused control hears the
 * keystroke as well and Space on a button both activates it and fires the
 * hotkey. `react-hotkeys-hook` already passes over an `input`, a `textarea`,
 * a `select` and anything contenteditable, which leaves the controls taking
 * Space or Enter as their own.
 *
 * The target is matched rather than walked up from, since a keystroke goes to
 * the focused element itself.
 *
 * Only worth asking for a hotkey bound to one of those two keys, a letter
 * being nobody's activation key.
 *
 * It belongs in the `ignoreEventWhen` option of `useHotkeys`, beside
 * `goesToAnOverlay` and for the reason given there.
 */
export const activatesItsTarget = ({ key, target }: KeyboardEvent) => {
    const claimants = activatedBy[key]
    if (claimants === undefined) return false
    return (target as Element | null)?.matches?.(claimants) === true
}
