import { Box, IconButton, Popover, Portal, Tooltip } from "@mui/material"
import { Certainty } from "linked-rolls"
import { ReactNode, useState } from "react"
import { CertaintyIcon } from "./CertaintyIcon"

/** The box the button needs where the mark is drawn into an SVG. */
const svgMarkSize = 40

interface CertaintyMarkProps {
    /** Left out where nothing is believed of the statement. */
    certainty?: Certainty
    /** What the click opens: how certainly the statement is held and why. */
    children: ReactNode
    /** Where the mark goes when it is drawn into an SVG, in that drawing's units. */
    at?: { x: number, y: number }
}

/**
 * The mark of the truth value a statement is held to have. Clicking it
 * opens what the statement rests on, wherever in the desk it is marked.
 */
export const CertaintyMark = ({ certainty, children, at }: CertaintyMarkProps) => {
    const [anchorEl, setAnchorEl] = useState<Element | null>(null)

    const button = (
        <Tooltip title={certainty ? `held ${certainty}` : 'Nothing believed'}>
            <IconButton size='small' sx={{ padding: '2px' }} onClick={e => setAnchorEl(e.currentTarget)}>
                <CertaintyIcon certainty={certainty} />
            </IconButton>
        </Tooltip>
    )

    const popover = (
        <Popover
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
            <Box sx={{ p: 1.5, maxWidth: 420 }}>
                {children}
            </Box>
        </Popover>
    )

    if (!at) {
        return <>{button}{popover}</>
    }

    // The box the button is laid out in reaches well beyond the icon, and
    // in a drawing it would take the pointer from whatever it is drawn
    // across. Only the button itself answers to the pointer.
    return (
        <foreignObject
            x={at.x}
            y={at.y}
            width={svgMarkSize}
            height={svgMarkSize}
            style={{ pointerEvents: 'none' }}
        >
            <div style={{ transform: 'scale(0.8)' }}>
                <span style={{ display: 'inline-flex', pointerEvents: 'auto' }}>{button}</span>
            </div>
            <Portal>{popover}</Portal>
        </foreignObject>
    )
}
