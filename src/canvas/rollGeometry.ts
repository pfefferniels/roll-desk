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
import { Band, Box } from '../geometry/drawing'
import { Svg, svg } from './units'

export type { Band, Box }

/** How tall a lane is drawn in each block of the bar. */
export type LaneHeights = Readonly<Record<TrackRole, Svg>>

/** Lanes of one height for the keyboard and another for the expression on either side. */
export const lanesOf = (note: Svg, expression: Svg): LaneHeights => ({
    'bass-expression': expression,
    note,
    'treble-expression': expression
})

/** The lowest and the highest note a piece plays, as MIDI pitches. */
export interface Compass {
    lowest: number
    highest: number
}

/**
 * The bar's blocks with the keyboard cut down to the keys within the
 * compass, so that what the piece never plays takes no room. It is cut by
 * pitch rather than by track, so that two bars numbering their keyboards
 * differently are cut to the same notes. An end the bar has no key for
 * stays where the bar has it.
 */
export const areasWithin = (bar: TrackerBar, compass?: Compass): readonly TrackArea[] => {
    if (!compass) return bar.areas

    const keyOf = (pitch: number) => bar.positionOf({ type: 'note', pitch })

    return bar.areas.map(area => {
        if (area.role !== 'note') return area

        const ends = [keyOf(compass.lowest) ?? area.from, keyOf(compass.highest) ?? area.to]
        return { ...area, from: track(Math.min(...ends)), to: track(Math.max(...ends)) }
    })
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

    /** Height of one lane, which differs from one block of the bar to the next. */
    laneHeight: (position: Track) => Svg

    /** The track whose lane contains y, or 'gap' between the blocks. */
    yToTrack: (y: Svg) => Track | 'gap'

    /** The band covered by a vertical span, whichever way round it runs. */
    bandOf: (span: Pick<VerticalSpan, 'from' | 'to'>) => Band

    /** The band covered by a whole block of the tracker bar. */
    areaBand: (area: TrackArea) => Band

    roleOf: (position: Track) => TrackRole | undefined

    /** The blocks as they are drawn, the keyboard cut to the compass where one is given. */
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
 * so a higher track sits higher on the screen. Given a compass, the
 * keyboard reaches only as far as it, see `areasWithin`.
 */
export const rollGeometry = (
    lanes: LaneHeights,
    spacing: Svg,
    bar: TrackerBar,
    compass?: Compass
): RollGeometry => {
    const areas = areasWithin(bar, compass)
    const blocks = [...areas].reverse()

    const tops = blocks.reduce<Block[]>((acc, area) => {
        const previous = acc[acc.length - 1]
        const top = previous
            ? add(add(previous.top, previous.span), spacing)
            : svg(0)
        const laneHeight = lanes[area.role]
        return [...acc, { area, top, laneHeight, span: scale(laneHeight, area.to - area.from + 1) }]
    }, [])

    const last = tops.at(-1)
    const height = last ? add(last.top, last.span) : svg(0)

    const blockOf = (position: Track) =>
        tops.find(({ area }) => position >= area.from && position <= area.to)

    /**
     * A track the bar does not read is drawn at the top rather than
     * left out, so a miscalibrated copy shows itself instead of
     * disappearing. `unreadTracks` names the offending tracks. So is
     * a key beyond the compass, which a compass taken from the piece
     * leaves none of.
     */
    const trackToY = (position: Track) => {
        const block = blockOf(position)
        if (!block) return svg(0)
        return add(block.top, scale(block.laneHeight, block.area.to - position))
    }

    const laneHeight = (position: Track) => {
        const role = bar.roleOf(position)
        return role ? lanes[role] : lanes.note
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
        areas,
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
    return rollGeometry(lanesOf(lane, lane), svg(0), bar)
}
