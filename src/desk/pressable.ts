import { KeyboardEvent } from 'react'

/** Whether a key presses a button: Enter and Space do, as they do a button of the browser's own. */
export const pressesAButton = (key: string) => key === 'Enter' || key === ' '

/**
 * What makes a shape of a drawing a button: reached by Tab, read out as
 * a button, and pressed by Enter or Space as well as by a click. The
 * name it is read out by goes beside it, since a shape says nothing of
 * itself.
 *
 * Space is kept from scrolling the page as well, and from the desk's
 * hotkey, which `activatesItsTarget` leaves to anything with the button
 * role.
 */
export const pressable = (onPress: () => void) => ({
    role: 'button',
    tabIndex: 0,
    onClick: onPress,
    onKeyDown: (event: KeyboardEvent) => {
        if (!pressesAButton(event.key)) return
        event.preventDefault()
        onPress()
    }
})
