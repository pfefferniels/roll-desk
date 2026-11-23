import { Popover, Stack, Tooltip, Typography } from "@mui/material"
import { featuresMadeBy, Modification, Path, pathIn, RollCopy } from "linked-rolls"
import { useContext, useMemo, useState } from "react"
import { EditionContext } from "../edition/EditionContext"
import { usePinchZoom } from "../canvas/usePinchZoom"
import { atLeastVisible, boxOf } from "../canvas/rollGeometry"
import { Box, cornersOf, Point } from "../geometry/drawing"
import { roundedHull } from "../geometry/roundedHull"
import { svg } from "../canvas/units"
import { Arguable } from "../accounts/Arguable"
import { Name } from "../accounts/Name"
import { dateStatement } from "../edition/dateStatement"
import { clustersOf, contentsOf, placeTags, purposeOf, shortened, textsOf } from "./modificationLayout"

/**
 * The colour of what a later hand did to a copy: the features an act
 * brought onto it, the outline round them and the tag naming the act.
 */
export const laterHand = '#0f766e'

/** How far an outline keeps from the features it is drawn round. */
const outlinePadding = svg(4)

/** How close features lie on the drawing to be outlined as one. */
const clusterGap = svg(24)

const tagHeight = svg(16)
const tagGap = svg(3)

/** About how wide the tag's text runs per character, to keep the tags apart before they are drawn. */
const tagCharacter = 6.2
const tagPadding = 12

/** One act as it is drawn: an outline round each cluster of what it made, and one tag naming it. */
interface ActLayout {
    /** Where the act stands among the copy's modifications. */
    index: number
    modification: Modification
    outlines: string[]
    /** The top left corner of the first outline, which the tag names. */
    anchor: Point
    tag: Box
    label: string
}

const useActLayouts = (modifications: readonly Modification[]): ActLayout[] => {
    const translation = usePinchZoom()

    return useMemo(() => {
        const drawn = modifications.flatMap((modification, index) => {
            const boxes = featuresMadeBy(modification).map(feature => atLeastVisible(boxOf(feature, translation)))
            const clusters = clustersOf(boxes, clusterGap)
            const first = clusters[0]
            if (!first) return []

            const label = purposeOf(modification)
            return [{
                index,
                modification,
                label,
                outlines: clusters.map(cluster => roundedHull(cluster.boxes.flatMap(cornersOf), outlinePadding)),
                anchor: { x: svg(first.box.x - outlinePadding), y: svg(first.box.y - outlinePadding) }
            }]
        })

        return placeTags(
            drawn.map(act => ({ ...act, width: svg(act.label.length * tagCharacter + tagPadding) })),
            tagHeight,
            tagGap
        )
    }, [modifications, translation])
}

const capitalised = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** What the act brought onto the copy, as a line: "2 patches glued on". */
const contentsLine = (modification: Modification) => {
    const contents = contentsOf(featuresMadeBy(modification))
    return modification.type === 'Attachment' ? `${contents} glued on` : `${contents} added`
}

const cardSx = {
    bgcolor: 'white',
    color: 'text.primary',
    border: '1px solid #d0d0d0',
    boxShadow: 2,
    p: 1,
    maxWidth: 320
} as const

/**
 * What the pointer is told of an act: what it was for, what it brought
 * onto the copy, the texts it wrote, and who did it when. The beliefs
 * these are held under are named, and a click opens their reasons.
 */
const ActSummary = ({ modification, label }: { modification: Modification, label: string }) => {
    const { actor, date } = modification
    const actorCertainty = actor?.['@annotation']?.belief?.certainty
    const dateCertainty = date?.['@annotation']?.belief?.certainty

    return (
        <Stack spacing={0.25}>
            <Typography variant='overline' color='text.secondary' sx={{ lineHeight: 1.5 }}>
                Later modification
            </Typography>
            <Typography variant='body2' fontWeight='bold'>{capitalised(label)}</Typography>
            <Typography variant='body2'>{contentsLine(modification)}</Typography>
            {textsOf(featuresMadeBy(modification)).map(text => (
                <Typography key={text} variant='caption' sx={{ fontStyle: 'italic' }}>
                    “{shortened(text, 60)}”
                </Typography>
            ))}
            {actor && (
                <Typography variant='body2'>
                    by {actor.name}{actorCertainty && `, held ${actorCertainty}`}
                </Typography>
            )}
            {date && (
                <Typography variant='body2'>
                    {dateStatement(date)}{dateCertainty && `, held ${dateCertainty}`}
                </Typography>
            )}
            <Typography variant='caption' color='text.secondary'>
                {(actorCertainty || dateCertainty) ? 'Click for the reasons.' : 'Click for more.'}
            </Typography>
        </Stack>
    )
}

/** The act in full, opened by a click: its texts unshortened, and who did it and when with the reasons for each. */
const ActAccount = ({ modification, label, path }: { modification: Modification, label: string, path?: Path }) => {
    const { actor, date } = modification

    return (
        <Stack spacing={0.5} sx={{ p: 1.5, maxWidth: 360 }}>
            <Typography variant='overline' color='text.secondary' sx={{ lineHeight: 1.5 }}>
                Later modification · {modification.type}
            </Typography>
            <Typography variant='body2' fontWeight='bold'>{capitalised(label)}</Typography>
            <Typography variant='body2'>{contentsLine(modification)}</Typography>
            {textsOf(featuresMadeBy(modification)).map(text => (
                <Typography key={text} variant='body2' sx={{ fontStyle: 'italic' }}>“{text}”</Typography>
            ))}
            {actor && (
                <Typography variant='body2' component='div'>
                    {path
                        ? <Arguable path={[...path, 'actor']}>by <Name named={actor} /></Arguable>
                        : <>by <Name named={actor} /></>}
                </Typography>
            )}
            {date && (
                <Typography variant='body2' component='div'>
                    {path
                        ? <Arguable path={[...path, 'date']}>{dateStatement(date)}</Arguable>
                        : dateStatement(date)}
                </Typography>
            )}
        </Stack>
    )
}

interface ActProps {
    act: ActLayout
    /** Whether the pointer rests on the act. */
    pointed: boolean
    onPoint: (pointed: boolean) => void
    /** Opens the act's account at a place on the screen. */
    onOpen: (at: { left: number, top: number }) => void
}

/**
 * One act on the drawing: a dashed outline round each place it changed
 * the copy, and a tag with its purpose at the first of them. The outline
 * answers the pointer only along its line, so that what it encloses stays
 * to be clicked; under the pointer the act's outlines all come forward
 * together, and say what the act was.
 */
const Act = ({ act, pointed, onPoint, onOpen }: ActProps) => {
    const { outlines, tag, anchor, label, modification } = act
    // A tag pushed up past another one is tied back to what it names.
    const lifted = tag.y + tag.height < anchor.y - tagGap - 0.5

    return (
        <Tooltip
            title={<ActSummary modification={modification} label={label} />}
            followCursor
            placement='top-start'
            describeChild
            slotProps={{ tooltip: { sx: cardSx } }}
        >
            <g
                className='modification'
                data-modification={act.index}
                onMouseEnter={() => onPoint(true)}
                onMouseLeave={() => onPoint(false)}
                onClick={e => onOpen({ left: e.clientX, top: e.clientY })}
                style={{ cursor: 'pointer' }}
            >
                {outlines.map((d, i) => (
                    <g key={i}>
                        {/* A light edge under the dashes, so that they show on the scan as on white. */}
                        <path
                            d={d}
                            fill={laterHand}
                            fillOpacity={pointed ? 0.08 : 0}
                            stroke='white'
                            strokeOpacity={0.8}
                            strokeWidth={3}
                            pointerEvents='none'
                        />
                        <path
                            d={d}
                            fill='none'
                            stroke={laterHand}
                            strokeWidth={pointed ? 2 : 1.25}
                            strokeDasharray='4 3'
                            pointerEvents='none'
                        />
                        <path d={d} fill='none' stroke='transparent' strokeWidth={10} pointerEvents='stroke' />
                    </g>
                ))}

                {lifted && (
                    <line
                        x1={tag.x + 0.5}
                        y1={tag.y + tag.height}
                        x2={anchor.x + 0.5}
                        y2={anchor.y}
                        stroke={laterHand}
                        strokeWidth={1}
                        pointerEvents='none'
                    />
                )}

                <foreignObject
                    x={tag.x}
                    y={tag.y}
                    width={tag.width + 40}
                    height={tag.height}
                    pointerEvents='none'
                >
                    <span
                        className='modificationTag'
                        role='button'
                        tabIndex={0}
                        aria-label={`Later modification: ${label}`}
                        onKeyDown={e => {
                            if (e.key !== 'Enter' && e.key !== ' ') return
                            e.preventDefault()
                            const { left, bottom } = e.currentTarget.getBoundingClientRect()
                            onOpen({ left, top: bottom })
                        }}
                        style={{
                            // A block of its own, so the line it would sit in cannot push it down out of its box.
                            display: 'block',
                            width: 'max-content',
                            height: tag.height,
                            lineHeight: `${tag.height - 2}px`,
                            boxSizing: 'border-box',
                            padding: '0 5px',
                            background: 'white',
                            border: `1px solid ${laterHand}`,
                            borderRadius: 3,
                            color: laterHand,
                            fontSize: 11,
                            fontWeight: pointed ? 700 : 500,
                            whiteSpace: 'nowrap',
                            pointerEvents: 'auto',
                            userSelect: 'none'
                        }}
                    >
                        {label}
                    </span>
                </foreignObject>
            </g>
        </Tooltip>
    )
}

/**
 * What later hands did to the copy after it was punched, act by act: each
 * act outlined where it changed the copy and tagged with its purpose,
 * the rest of what is known of it under the pointer, and its reasons a
 * click away. A removal brought nothing onto the copy and has nothing
 * here to be drawn round.
 */
export const Modifications = ({ copy }: { copy: RollCopy }) => {
    const { edition } = useContext(EditionContext)
    const acts = useActLayouts(copy.modifications)
    const [pointed, setPointed] = useState<number>()
    const [opened, setOpened] = useState<{ index: number, at: { left: number, top: number } }>()

    const copyPath = edition && pathIn(edition, copy.id)
    const openedAct = opened && acts.find(act => act.index === opened.index)

    return (
        <g className='modifications'>
            {acts.map(act => (
                <Act
                    key={act.index}
                    act={act}
                    pointed={pointed === act.index}
                    onPoint={on => setPointed(current => on ? act.index : current === act.index ? undefined : current)}
                    onOpen={at => setOpened({ index: act.index, at })}
                />
            ))}

            <Popover
                open={!!openedAct}
                onClose={() => setOpened(undefined)}
                anchorReference='anchorPosition'
                anchorPosition={opened?.at}
            >
                {openedAct && (
                    <ActAccount
                        modification={openedAct.modification}
                        label={openedAct.label}
                        path={copyPath && [...copyPath, 'modifications', openedAct.index]}
                    />
                )}
            </Popover>
        </g>
    )
}
