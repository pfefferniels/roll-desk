import { Box, Slider } from "@mui/material"
import { positionOf, zoomAt, zoomMarks, zoomRange } from "../../helpers/zoom"
import { useDraft } from "../../hooks/useDraft"
import { mark, SvgPerMm, svgPerMm } from "../../helpers/units"

const percentLabel = (zoom: SvgPerMm) => `${Math.round(zoom * 100)}%`

const marks = zoomMarks.map(zoom => ({ value: positionOf(zoom), label: percentLabel(zoom) }))

// MUI measures the track in plain numbers, so the units are put back on
// at its edge rather than carried through it.
const zoomOfPosition = (position: number) => zoomAt(mark(position))
const labelOfZoom = (zoom: number) => percentLabel(svgPerMm(zoom))

/** One step of the track, which moves the zoom by about a percent. */
const step = 0.01

interface ZoomSliderProps {
    /** The zoom the roll is laid out at. The thumb follows it when it moves elsewhere. */
    zoom: SvgPerMm
    onScrub: (zoom: SvgPerMm) => void
    onSettle: () => void
}

/**
 * Holds the thumb position itself, so that dragging it redraws the slider
 * alone and leaves the roll to `useLiveZoom`.
 */
export const ZoomSlider = ({ zoom, onScrub, onSettle }: ZoomSliderProps) => {
    const [value, setValue] = useDraft(zoom)

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
                min={positionOf(zoomRange.min)}
                max={positionOf(zoomRange.max)}
                step={step}
                value={positionOf(value)}
                scale={zoomOfPosition}
                getAriaValueText={labelOfZoom}
                onChange={(_, newValue) => {
                    const scrubbed = zoomOfPosition(newValue)
                    setValue(scrubbed)
                    onScrub(scrubbed)
                }}
                onChangeCommitted={onSettle}
                marks={marks}
            />
        </Box>
    )
}
