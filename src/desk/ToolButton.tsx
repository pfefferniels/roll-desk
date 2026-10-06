import { IconButton, IconButtonProps, Tooltip } from "@mui/material"

interface ToolButtonProps extends Omit<IconButtonProps, 'aria-label' | 'title'> {
    /** What the button does, read out as its name and shown under the pointer. */
    label: string
    /** What the tooltip says where it says more than the name, such as the key that does the same. */
    hint?: string
}

/**
 * A button that shows only an icon. An icon says nothing to a screen
 * reader and not always enough to the eye, so the button is named and
 * its name shown under the pointer. A disabled button takes no pointer,
 * so the tooltip then hangs on a box around it.
 */
export const ToolButton = ({ label, hint, disabled, ...props }: ToolButtonProps) => {
    const button = <IconButton aria-label={label} disabled={disabled} {...props} />

    return (
        <Tooltip title={hint ?? label}>
            {disabled ? <span>{button}</span> : button}
        </Tooltip>
    )
}
