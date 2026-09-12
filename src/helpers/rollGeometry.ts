import {
    add,
    HorizontalSpan,
    max,
    Millimeters,
    scale,
    subtract,
    Track,
    track,
    TrackArea,
    TrackerBar,
    TrackRole,
    VerticalSpan
} from 'linked-rolls'
import { Band, Box } from './drawing'
import { Svg, svg } from './units'

export type { Band, Box }

export interface LaneHeights {
    note: Svg
    expression: Svg
}

export interface Dimension {
    horizontal: Pick<HorizontalSpan, 'from' | 'to'>
    vertical: Pick<VerticalSpan, 'from' | 'to'>
}

export interface RollGeometry {
    /** Total height of the drawing. */
    height: Svg

    /**
     * Top edge of a track's lane. Features are drawn downwards from
     * here, so `trackToY(t)` and `trackToY(t) + laneHeight(t)` bracket
     * exactly the band that belongs to track t.
     */
    trackToY: (position: Track) => Svg

    /** Height of one lane, which differs between notes and expression. */
    laneHeight: (position: Track) => Svg

    /** The track whose lane contains y, or 'gap' between the blocks. */
    yToTrack: (y: Svg) => Track | 'gap'

    /** The band covered by a vertical span, whichever way round it runs. */
    bandOf: (span: Pick<VerticalSpan, 'from' | 'to'>) => Band

    /** The band covered by a whole block of the tracker bar. */
    areaBand: (area: TrackArea) => Band

    roleOf: (position: Track) => TrackRole | undefined

    areas: readonly TrackArea[]

    /** The bar the drawing is laid out on, which decides what every lane means. */
    bar: TrackerBar
}

export type Translation =
    Pick<RollGeometry, 'bandOf' | 'bar'> & { translateX: (x: Millimeters) => Svg }

/** Where a feature or symbol is drawn, given its measured extent. */
export const boxOf = (
    { horizontal, vertical }: Dimension,
    { translateX, bandOf }: Translation
): Box => ({
    x: translateX(horizontal.from),
    width: subtract(translateX(horizontal.to), translateX(horizontal.from)),
    ...bandOf(vertical)
})

/** The least a box is drawn at, so that the smallest feature still shows. */
const visible = svg(0.5)

export const atLeastVisible = (box: Box): Box => ({
    ...box,
    width: max(box.width, visible),
    height: max(box.height, visible)
})

const heightOfRole = (role: TrackRole, lanes: LaneHeights) =>
    role === 'note' ? lanes.note : lanes.expression

/** One block of the bar, once it is known where it starts and how tall it is. */
interface Block {
    area: TrackArea
    top: Svg
    laneHeight: Svg
    span: Svg
}

/**
 * Lays the tracker bar out top to bottom, treble first, with a gap
 * between the blocks. Track numbers count upwards from the bass edge,
 * so a higher track sits higher on the screen.
 */
export const rollGeometry = (
    lanes: LaneHeights,
    spacing: Svg,
    bar: TrackerBar
): RollGeometry => {
    const blocks = [...bar.areas].reverse()

    const tops = blocks.reduce<Block[]>((acc, area) => {
        const previous = acc[acc.length - 1]
        const top = previous
            ? add(add(previous.top, previous.span), spacing)
            : svg(0)
        const laneHeight = heightOfRole(area.role, lanes)
        return [...acc, { area, top, laneHeight, span: scale(laneHeight, area.to - area.from + 1) }]
    }, [])

    const last = tops[tops.length - 1]
    const height = add(last.top, last.span)

    const blockOf = (position: Track) =>
        tops.find(({ area }) => position >= area.from && position <= area.to)

    /**
     * A track the bar does not read is drawn at the top rather than
     * left out, so a miscalibrated copy shows itself instead of
     * disappearing. `unreadTracks` names the offending tracks.
     */
    const trackToY = (position: Track) => {
        const block = blockOf(position)
        if (!block) return svg(0)
        return add(block.top, scale(block.laneHeight, block.area.to - position))
    }

    const laneHeight = (position: Track) => {
        const role = bar.roleOf(position)
        return role ? heightOfRole(role, lanes) : lanes.note
    }

    const yToTrack = (y: Svg): Track | 'gap' => {
        const block = tops.find(({ top, span }) => y >= top && y < add(top, span))
        if (!block) return 'gap'
        return track(block.area.to - Math.floor(subtract(y, block.top) / block.laneHeight))
    }

    const areaBand = (area: TrackArea): Band => {
        const block = blockOf(area.from)
        if (!block) return { y: svg(0), height: svg(0) }
        return { y: block.top, height: block.span }
    }

    const bandOf = ({ from, to }: Pick<VerticalSpan, 'from' | 'to'>): Band => {
        const [lower, upper] = to === undefined || to === from
            ? [from, from]
            : from < to ? [from, to] : [to, from]

        const y = trackToY(upper)
        return { y, height: subtract(add(trackToY(lower), laneHeight(lower)), y) }
    }

    return {
        height,
        trackToY,
        laneHeight,
        yToTrack,
        bandOf,
        areaBand,
        roleOf: (position: Track) => bar.roleOf(position),
        areas: bar.areas,
        bar
    }
}

/**
 * The whole bar in lanes of one height, filling the given drawing. This is
 * what a preview wants: too small to keep the blocks apart, and the same way
 * up as the desk.
 */
export const evenGeometry = (height: Svg, bar: TrackerBar): RollGeometry => {
    const lane = scale(height, 1 / bar.trackCount)
    return rollGeometry({ note: lane, expression: lane }, svg(0), bar)
}
