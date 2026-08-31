import { HorizontalSpan, TrackArea, TrackerBar, TrackRole, VerticalSpan, welteT100 } from 'linked-rolls'

export interface LaneHeights {
    note: number
    expression: number
}

export interface Box {
    x: number
    y: number
    width: number
    height: number
}

export interface Dimension {
    horizontal: Pick<HorizontalSpan, 'from' | 'to'>
    vertical: Pick<VerticalSpan, 'from' | 'to'>
}

export interface RollGeometry {
    /** Total height of the drawing, in SVG units. */
    height: number

    /**
     * Top edge of a track's lane. Features are drawn downwards from
     * here, so `trackToY(t)` and `trackToY(t) + laneHeight(t)` bracket
     * exactly the band that belongs to track t.
     */
    trackToY: (track: number) => number

    /** Height of one lane, which differs between notes and expression. */
    laneHeight: (track: number) => number

    /** The track whose lane contains y, or 'gap' between the blocks. */
    yToTrack: (y: number) => number | 'gap'

    /** The band covered by a vertical span, whichever way round it runs. */
    bandOf: (span: Pick<VerticalSpan, 'from' | 'to'>) => { y: number, height: number }

    /** The band covered by a whole block of the tracker bar. */
    areaBand: (area: TrackArea) => { y: number, height: number }

    roleOf: (track: number) => TrackRole | undefined

    areas: readonly TrackArea[]
}

export type Translation =
    Pick<RollGeometry, 'bandOf'> & { translateX: (x: number) => number }

/** Where a feature or symbol is drawn, given its measured extent. */
export const boxOf = (
    { horizontal, vertical }: Dimension,
    { translateX, bandOf }: Translation
): Box => ({
    x: translateX(horizontal.from),
    width: translateX(horizontal.to) - translateX(horizontal.from),
    ...bandOf(vertical)
})

const heightOfRole = (role: TrackRole, lanes: LaneHeights) =>
    role === 'note' ? lanes.note : lanes.expression

/**
 * Lays the tracker bar out top to bottom, treble first, with a gap
 * between the blocks. Track numbers count upwards from the bass edge,
 * so a higher track sits higher on the screen.
 */
export const rollGeometry = (
    lanes: LaneHeights,
    spacing: number,
    bar: TrackerBar = welteT100
): RollGeometry => {
    const blocks = [...bar.areas].reverse()

    const tops = blocks.reduce((acc, area) => {
        const previous = acc[acc.length - 1]
        const top = previous
            ? previous.top + previous.span + spacing
            : 0
        const laneHeight = heightOfRole(area.role, lanes)
        return [...acc, { area, top, laneHeight, span: laneHeight * (area.to - area.from + 1) }]
    }, [] as { area: TrackArea, top: number, laneHeight: number, span: number }[])

    const last = tops[tops.length - 1]
    const height = last.top + last.span

    const blockOf = (track: number) =>
        tops.find(({ area }) => track >= area.from && track <= area.to)

    /**
     * A track the bar does not read is drawn at the top rather than
     * left out, so a miscalibrated copy shows itself instead of
     * disappearing. `unreadTracks` names the offending tracks.
     */
    const trackToY = (track: number) => {
        const block = blockOf(track)
        if (!block) return 0
        return block.top + (block.area.to - track) * block.laneHeight
    }

    const laneHeight = (track: number) => {
        const role = bar.roleOf(track)
        return role ? heightOfRole(role, lanes) : lanes.note
    }

    const yToTrack = (y: number): number | 'gap' => {
        const block = tops.find(({ top, span }) => y >= top && y < top + span)
        if (!block) return 'gap'
        return block.area.to - Math.floor((y - block.top) / block.laneHeight)
    }

    const areaBand = (area: TrackArea) => {
        const block = blockOf(area.from)
        if (!block) return { y: 0, height: 0 }
        return { y: block.top, height: block.span }
    }

    const bandOf = ({ from, to }: Pick<VerticalSpan, 'from' | 'to'>) => {
        const [lower, upper] = to === undefined || to === from
            ? [from, from]
            : [Math.min(from, to), Math.max(from, to)]

        const y = trackToY(upper)
        return { y, height: trackToY(lower) + laneHeight(lower) - y }
    }

    return {
        height,
        trackToY,
        laneHeight,
        yToTrack,
        bandOf,
        areaBand,
        roleOf: (track: number) => bar.roleOf(track),
        areas: bar.areas
    }
}
