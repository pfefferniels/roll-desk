import { Box, Stack, Typography } from "@mui/material"
import { BothEnds, FittedHistogram, idOf, principalDerivationOf, versionIn } from "linked-rolls"
import { Fragment, useContext, useMemo } from "react"
import { EditionContext } from "../edition/EditionContext"
import { curveAt, derivationScatterOf, extentOf, Sample, ticksAcross, windowAt } from "../edition/derivationScatter"
import { EntityLink } from "./EntityLink"

/** The width every strip is drawn at, scaled to the sheet it sits on. */
const WIDTH = 260
/** Room at the left for naming the two halves. */
const GUTTER = 30
/** How tall one half of a strip stands, the onset above the middle and the end below. */
const HALF = 26
const HEIGHT = 2 * HALF
const AXIS_HEIGHT = 14
/** Air between neighbouring bars, so that each bin reads as one. */
const GAP = 1
/** The least a bar stands, so that a bin of one reading out in a tail can still be seen. */
const LEAST = 1.5

const BAR = '#1976d2'
/** A reading the window lies to one side of, which a collation at it would not have joined. */
const OUTSIDE = '#b45309'
const CURVE = '#4b5563'
const WINDOW = '#f3f4f6'
const WINDOW_EDGE = '#9ca3af'
const BASELINE = '#d1d5db'
const INK = '#6b7280'

type End = keyof BothEnds<unknown>

const HALVES: { end: End, name: string, direction: 1 | -1 }[] = [
    { end: 'from', name: 'onset', direction: 1 },
    { end: 'to', name: 'end', direction: -1 }
]

const NOUNS: Record<string, [string, string]> = {
    note: ['note', 'notes'],
    expression: ['expression', 'expressions'],
    text: ['text', 'texts']
}

const nounFor = (group: string, n: number): string => {
    const [one, many] = NOUNS[group] ?? [group, group]
    return n === 1 ? one : many
}

const titleFor = (group: string): string => {
    const many = nounFor(group, 2)
    return many.charAt(0).toUpperCase() + many.slice(1)
}

const mm = (value: number): string => value.toFixed(2).replace('-', '−')

/** Where a displacement falls across the strip. */
type Across = (displacement: number) => number

interface HalfProps {
    group: string
    end: End
    name: string
    /** Up from the middle for the onset, down for the end. */
    direction: 1 | -1
    histogram: FittedHistogram
    window: { centre: number, reach: number }
    outside: number[]
    x: Across
    /** The count a full half stands for, shared by both halves so that their heights compare. */
    top: number
    /** What the half says to a reader who points at it or cannot see it. */
    summary: string
}

/**
 * One end of one sample: its readings counted into bins, the normal
 * curve fitted to them, and the window at that end laid under both,
 * standing up from the middle of the strip or hanging down from it.
 */
const Half = ({ group, end, name, direction, histogram, window, outside, x, top, summary }: HalfProps) => {
    // Distances from the middle, turned into the strip's own heights.
    const y = (rise: number) => HALF - direction * rise
    const rise = (count: number) => count / top * (HALF - 2)
    const [bandTop, bandBottom] = direction === 1 ? [0, HALF] : [HALF, HEIGHT]
    const low = window.centre - window.reach
    const high = window.centre + window.reach

    const [first, last] = [Math.min(...histogram.edges), Math.max(...histogram.edges)]
    const steps = 48
    const curve = Array.from({ length: steps + 1 }, (_, i) => first + (last - first) * i / steps)
        .map(at => `${x(at).toFixed(1)},${y(rise(curveAt(histogram.curve, at))).toFixed(1)}`)
        .join(' ')

    return (
        <g aria-label={summary}>
            <rect x={x(low)} y={bandTop} width={x(high) - x(low)} height={bandBottom - bandTop} fill={WINDOW}>
                <title>{summary}</title>
            </rect>
            {[low, high].map(edge => (
                <line key={edge} x1={x(edge)} x2={x(edge)} y1={bandTop} y2={bandBottom} stroke={WINDOW_EDGE} strokeWidth={1} />
            ))}
            <line x1={x(window.centre)} x2={x(window.centre)} y1={bandTop} y2={bandBottom} stroke={WINDOW_EDGE} strokeWidth={0.5} />

            {histogram.counts.map((count, i) => {
                const [from, to] = [histogram.edges[i], histogram.edges[i + 1]]
                if (count === 0 || from === undefined || to === undefined) return null
                const height = Math.max(rise(count), LEAST)
                return (
                    <rect
                        key={i}
                        x={x(from) + GAP / 2}
                        y={direction === 1 ? HALF - height : HALF}
                        width={Math.max(x(to) - x(from) - GAP, 0.5)}
                        height={height}
                        fill={BAR}
                    >
                        <title>{`${name}, ${mm(from)} to ${mm(to)} mm: ${count} ${nounFor(group, count)}`}</title>
                    </rect>
                )
            })}

            <polyline points={curve} fill='none' stroke={CURVE} strokeWidth={1.5} strokeLinejoin='round' strokeLinecap='round' />

            {/* Each one where it lies, since the window's edge need not fall between two bins. */}
            {outside.map((displacement, i) => (
                <circle
                    key={i}
                    cx={x(displacement)}
                    cy={y(4)}
                    r={3}
                    fill={OUTSIDE}
                    stroke='#ffffff'
                    strokeWidth={1.5}
                >
                    <title>{`A ${nounFor(group, 1)} at ${mm(displacement)} mm at the ${name}, outside the window`}</title>
                </circle>
            ))}

            <text
                x={GUTTER - 4}
                y={(bandTop + bandBottom) / 2 + 3}
                fontSize={9}
                fill={INK}
                textAnchor='end'
            >
                {name}
            </text>
            {end === 'to' && (
                <line x1={GUTTER} x2={WIDTH} y1={HALF} y2={HALF} stroke={BASELINE} strokeWidth={1} />
            )}
        </g>
    )
}

interface StripProps {
    sample: Sample
    window: BothEnds<{ centre: number, reach: number }>
    x: Across
}

/** One kind of symbol, its onsets standing above the middle and its ends hanging below, so that the two can be read against each other. */
const Strip = ({ sample, window, x }: StripProps) => {
    const { group, spread, histogram } = sample.scatter
    const top = Math.max(...HALVES.flatMap(({ end }) => [
        ...histogram[end].counts,
        curveAt(histogram[end].curve, histogram[end].curve.centre)
    ]))
    const summaryAt = (end: End, name: string) => {
        const { n, median, sigma } = spread[end]
        return `${titleFor(group)} at the ${name}, ${n} of them: median ${mm(median)} mm, scatter ${mm(sigma)} mm, `
            + `window ${mm(window[end].centre)} ±${mm(window[end].reach)} mm`
    }

    return (
        <Box>
            <Typography variant='caption' color='text.secondary' component='div' sx={{ fontWeight: 500, pl: `${GUTTER / WIDTH * 100}%` }}>
                {titleFor(group)}
            </Typography>
            <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                width='100%'
                role='img'
                aria-label={HALVES.map(({ end, name }) => summaryAt(end, name)).join('. ')}
                style={{ display: 'block' }}
            >
                {HALVES.map(({ end, name, direction }) => (
                    <Half
                        key={end}
                        group={group}
                        end={end}
                        name={name}
                        direction={direction}
                        histogram={histogram[end]}
                        window={window[end]}
                        outside={sample.outside[end]}
                        x={x}
                        top={top}
                        summary={summaryAt(end, name)}
                    />
                ))}
            </svg>
        </Box>
    )
}

/** The millimetres the strips above it are drawn across. */
const Axis = ({ extent, x }: { extent: [number, number], x: Across }) => (
    <svg viewBox={`0 0 ${WIDTH} ${AXIS_HEIGHT}`} width='100%' aria-hidden style={{ display: 'block' }}>
        {ticksAcross(extent).map(tick => (
            <Fragment key={tick}>
                <line x1={x(tick)} x2={x(tick)} y1={0} y2={3} stroke={INK} strokeWidth={1} />
                <text
                    x={x(tick)}
                    y={AXIS_HEIGHT - 1}
                    fontSize={9}
                    fill={INK}
                    textAnchor='middle'
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                    {tick === 0 ? '0' : String(tick).replace('-', '−')}
                </text>
            </Fragment>
        ))}
        <text x={GUTTER - 4} y={AXIS_HEIGHT - 1} fontSize={9} fill={INK} textAnchor='end'>mm</text>
    </svg>
)

/**
 * How the version's copies put what they share with the version it
 * derives from, against where the other copies put it, one strip per
 * kind of symbol: the onsets stand above the middle and the ends hang
 * below, each over the window the derivation was collated in at that
 * end, so that a shift or a widening between the two ends shows as
 * bars that do not answer each other across the middle.
 *
 * It shows whether the window was drawn round the scatter or through
 * it. What the window took apart is no longer a reading, so the
 * readings stop at its edges, and a curve that runs on past them says
 * that it cut into the scatter of the punches.
 */
export const DerivationScatter = ({ versionId }: { versionId: string }) => {
    const { edition } = useContext(EditionContext)
    const scatter = useMemo(() => edition && derivationScatterOf(edition, versionId), [edition, versionId])
    if (!edition || !scatter) return null

    const version = versionIn(edition, versionId)
    const principal = version && principalDerivationOf(version)
    const extent = extentOf(scatter)
    const x: Across = displacement => GUTTER + (displacement - extent[0]) / (extent[1] - extent[0]) * (WIDTH - GUTTER)
    const window = { from: windowAt(scatter.window, 'from'), to: windowAt(scatter.window, 'to') }

    return (
        <Stack spacing={0.75} sx={{ pl: 1.5, pt: 0.5 }}>
            <div>
                {scatter.samples.map(sample => (
                    <Strip key={sample.scatter.group} sample={sample} window={window} x={x} />
                ))}
                <Axis extent={extent} x={x} />
            </div>
            <Typography variant='caption' color='text.secondary' component='div'>
                How far {scatter.copies.map((copy, i) => (
                    <Fragment key={copy}>
                        {i > 0 && (i === scatter.copies.length - 1 ? ' and ' : ', ')}
                        <EntityLink id={copy} />
                    </Fragment>
                ))} {scatter.copies.length === 1 ? 'puts each symbol it shares' : 'put each symbol they share'}
                {principal && <> with <EntityLink id={idOf(principal)} /></>} from where the other copies
                put it, the onset above and the end below. Shaded is the window it was collated in, the line
                the normal curve fitted to the scatter.
                {scatter.outside > 0 && (
                    <> {scatter.outside === 1
                        ? 'One reading, marked by a dot, lies outside the window and still counts'
                        : `${scatter.outside} readings, marked by dots, lie outside the window and still count`} as
                    one symbol with the other side.</>
                )}
            </Typography>
        </Stack>
    )
}
