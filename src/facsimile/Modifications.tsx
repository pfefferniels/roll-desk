import { Box as MuiBox, Popover, Popper, PopperProps, Stack, Typography } from "@mui/material"
import { featuresMadeBy, Modification, Path, pathIn, RollCopy } from "linked-rolls"
import { RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { EditionContext } from "../edition/EditionContext"
import { usePinchZoom } from "../canvas/usePinchZoom"
import { atLeastVisible, boxOf } from "../canvas/rollGeometry"
import { Box, convexHull, cornersOf, padded, Point } from "../geometry/drawing"
import { roundedHull } from "../geometry/roundedHull"
import { svg } from "../canvas/units"
import { Arguable } from "../accounts/Arguable"
import { Name } from "../accounts/Name"
import { dateStatement } from "../edition/dateStatement"
import { clustersOf, contentsOf, narrowestAround, placeTags, purposeOf, shortened, textsOf } from "./modificationLayout"
import { drawnPointAt } from "../canvas/pointer"
import { Hand } from "./laterHand"

/** How far an outline keeps from the features it is drawn round. */
const outlinePadding = svg(4)

/** How far beyond an outline the pointer still counts as on it, so that its line is within. */
const lineReach = svg(3)

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
    /** Where the pointer counts as being on the act: round each outline, its line included. */
    areas: Point[][]
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
                areas: clusters.map(cluster => convexHull(
                    cluster.boxes.flatMap(box => cornersOf(padded(box, svg(outlinePadding + lineReach))))
                )),
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
    hand: Hand
    /** Whether the pointer rests on the act. */
    pointed: boolean
    /** The pointer came onto the tag or the keyboard to it, and the summary is to stand at the place given. */
    onPoint: (at?: { x: number, y: number }) => void
    /** Opens the act's account at a place on the screen. */
    onOpen: (at: { left: number, top: number }) => void
}

/**
 * One act on the drawing: a dashed outline round each place it changed
 * the copy, and a tag with its purpose at the first of them. Only the tag
 * is an element the pointer meets; the area within the outlines is found
 * by where the pointer is (see `Modifications`), so that what it encloses
 * stays to be clicked and dragged across.
 */
const Act = ({ act, hand, pointed, onPoint, onOpen }: ActProps) => {
    const { outlines, tag, anchor, label } = act
    // A tag pushed up past another one is tied back to what it names.
    const lifted = tag.y + tag.height < anchor.y - tagGap - 0.5

    return (
        <g className='modification' data-modification={act.index} pointerEvents='none'>
            {outlines.map((d, i) => (
                <g key={i}>
                    {/* An edge under the dashes, so that they show on the scan as on white. */}
                    <path
                        d={d}
                        fill={hand.colour}
                        fillOpacity={pointed ? 0.15 : 0}
                        stroke={hand.halo}
                        strokeOpacity={0.6}
                        strokeWidth={3}
                    />
                    <path
                        d={d}
                        fill='none'
                        stroke={hand.colour}
                        strokeWidth={pointed ? 2 : 1.25}
                        strokeDasharray='4 3'
                    />
                </g>
            ))}

            {lifted && (
                <line
                    x1={tag.x + 0.5}
                    y1={tag.y + tag.height}
                    x2={anchor.x + 0.5}
                    y2={anchor.y}
                    stroke={hand.colour}
                    strokeWidth={1}
                />
            )}

            <foreignObject x={tag.x} y={tag.y} width={tag.width + 40} height={tag.height}>
                <span
                    className='modificationTag'
                    role='button'
                    tabIndex={0}
                    aria-label={`Later modification: ${label}`}
                    onMouseEnter={e => onPoint({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => onPoint(undefined)}
                    onFocus={e => {
                        const { left, top } = e.currentTarget.getBoundingClientRect()
                        onPoint({ x: left, y: top })
                    }}
                    onBlur={() => onPoint(undefined)}
                    onClick={e => onOpen({ left: e.clientX, top: e.clientY })}
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
                        background: hand.colour,
                        border: `1px solid ${hand.halo}`,
                        borderRadius: 3,
                        color: hand.ink,
                        fontSize: 11,
                        fontWeight: pointed ? 700 : 500,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        userSelect: 'none'
                    }}
                >
                    {label}
                </span>
            </foreignObject>
        </g>
    )
}

/** How far the pointer may move between pressing and letting go for it to count as a click, in screen pixels. */
const clickSlop = 4

type PopperInstance = NonNullable<PopperProps['popperRef']> extends React.Ref<infer I> ? I : never

/**
 * The acts in the area under the pointer, and a click there: the svg is
 * listened to as a whole, since the area is no element of its own. What
 * the click lands on decides first: the tag answers for itself, and a hole
 * or a mark is selected rather than opening the act it belongs to, as is
 * a drag across the roll.
 */
const usePointedArea = (
    group: RefObject<SVGGElement | null>,
    acts: readonly ActLayout[],
    onMove: (at: { x: number, y: number }) => void,
    onOpen: (index: number, at: { left: number, top: number }) => void
) => {
    const [pointed, setPointed] = useState<number>()

    useEffect(() => {
        const element = group.current
        const svgElement = element?.ownerSVGElement
        if (!element || !svgElement) return

        const actAt = (event: MouseEvent) => {
            const point = drawnPointAt(element, event)
            return point && narrowestAround(acts, point)
        }

        let pressedAt: { x: number, y: number } | undefined

        const move = (event: PointerEvent) => {
            onMove({ x: event.clientX, y: event.clientY })
            setPointed(event.buttons ? undefined : actAt(event)?.index)
        }
        const leave = () => setPointed(undefined)
        const press = (event: PointerEvent) => { pressedAt = { x: event.clientX, y: event.clientY } }
        const click = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target : undefined
            if (target?.closest('.modificationTag, .selectable')) return
            if (pressedAt && Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) > clickSlop) return

            const act = actAt(event)
            if (act) onOpen(act.index, { left: event.clientX, top: event.clientY })
        }

        svgElement.addEventListener('pointermove', move)
        svgElement.addEventListener('pointerleave', leave)
        svgElement.addEventListener('pointerdown', press)
        svgElement.addEventListener('click', click)
        return () => {
            svgElement.removeEventListener('pointermove', move)
            svgElement.removeEventListener('pointerleave', leave)
            svgElement.removeEventListener('pointerdown', press)
            svgElement.removeEventListener('click', click)
        }
    }, [group, acts, onMove, onOpen])

    return pointed
}

/**
 * What later hands did to the copy after it was punched, act by act: each
 * act outlined where it changed the copy and tagged with its purpose,
 * the rest of what is known of it wherever the pointer rests within its
 * outlines, and its reasons a click away. A removal brought nothing onto
 * the copy and has nothing here to be drawn round.
 */
export const Modifications = ({ copy, hand }: { copy: RollCopy, hand: Hand }) => {
    const { edition } = useContext(EditionContext)
    const acts = useActLayouts(copy.modifications)
    const group = useRef<SVGGElement>(null)
    const [onTag, setOnTag] = useState<number>()
    const [opened, setOpened] = useState<{ index: number, at: { left: number, top: number } }>()

    // The summary follows the pointer without a render for every move.
    const pointer = useRef({ x: 0, y: 0 })
    const popper = useRef<PopperInstance>(null)
    const anchor = useMemo(() => ({
        getBoundingClientRect: () => new DOMRect(pointer.current.x, pointer.current.y, 0, 0)
    }), [])
    const follow = useCallback((at: { x: number, y: number }) => {
        pointer.current = at
        void popper.current?.update()
    }, [])
    const open = useCallback(
        (index: number, at: { left: number, top: number }) => setOpened({ index, at }),
        []
    )

    const inArea = usePointedArea(group, acts, follow, open)
    const pointed = onTag ?? inArea
    const pointedAct = acts.find(act => act.index === pointed)

    const copyPath = edition && pathIn(edition, copy.id)
    const openedAct = opened && acts.find(act => act.index === opened.index)

    return (
        <g className='modifications' ref={group}>
            {acts.map(act => (
                <Act
                    key={act.index}
                    act={act}
                    hand={hand}
                    pointed={pointed === act.index}
                    onPoint={at => {
                        if (at) follow(at)
                        setOnTag(current => at ? act.index : current === act.index ? undefined : current)
                    }}
                    onOpen={at => open(act.index, at)}
                />
            ))}

            <Popper
                open={!!pointedAct && !openedAct}
                anchorEl={anchor}
                popperRef={popper}
                placement='top-start'
                modifiers={[{ name: 'offset', options: { offset: [0, 14] } }]}
                sx={{ pointerEvents: 'none', zIndex: 'tooltip' }}
            >
                {pointedAct && (
                    <MuiBox sx={cardSx}>
                        <ActSummary modification={pointedAct.modification} label={pointedAct.label} />
                    </MuiBox>
                )}
            </Popper>

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
