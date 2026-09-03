import { Box, Slider } from "@mui/material"
import { useEffect, useState } from "react"
import { ZoomRange } from "../../hooks/useLiveZoom"

export const zoomRange: ZoomRange = { min: 0.1, max: 2.5 }

const marks = [
    { value: 0.1, label: '1%' },
    { value: 0.5, label: '50%' },
    { value: 1, label: '100%' },
    { value: 1.5, label: '150%' },
    { value: 2, label: '200%' },
    { value: 2.5, label: '250%' },
]

interface ZoomSliderProps {
    /** The zoom the roll is laid out at. The thumb follows it when it moves elsewhere. */
    zoom: number
    onScrub: (zoom: number) => void
    onSettle: () => void
}

/**
 * Holds the thumb position itself, so that dragging it redraws the slider
 * alone and leaves the roll to `useLiveZoom`.
 */
export const ZoomSlider = ({ zoom, onScrub, onSettle }: ZoomSliderProps) => {
    const [value, setValue] = useState(zoom)

    useEffect(() => setValue(zoom), [zoom])

    return (
        <Box sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            marginLeft: '30%',
            marginRight: '30%',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            backgroundColor: 'white'
        }}>
            <Slider
                sx={{ minWidth: '20rem' }}
                min={zoomRange.min}
                max={zoomRange.max}
                step={0.05}
                value={value}
                onChange={(_, newValue) => {
                    setValue(newValue as number)
                    onScrub(newValue as number)
                }}
                onChangeCommitted={onSettle}
                marks={marks}
            />
        </Box>
    )
}
