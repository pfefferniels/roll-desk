import { Ref, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Box } from "@mui/material"
import { add, AnySymbol, ConstraintProblem, editsOf, Expression, max, Millimeters, min, mm, Note, placedCarriersOf, placeOf, subtract, symbolIn, trackerBarOf, Version, Edit, predecessorOf, onsetOf, Edition, lineageOf, scale, TrackRole } from "linked-rolls"
import { emulationOf, EmulationOptions } from "../playback/reproducingSystems"
import { Dynamics, DynamicsGrid, ReadDynamics, velocityIn } from "./Dynamics"
import { Pedals } from "./Pedal"
import { Command } from "./SymbolView"
import { LabelledLanes } from "./LaneLabel"
import { EditionContext } from "../edition/EditionContext"
import { Ground } from "../canvas/Ground"
import { Blocks } from "../canvas/Blocks"
import { BlockEdges } from "../canvas/BlockEdges"
import { EditView, Focus, getEditBBoxes, hullBoxesOf, stretchOf, useDeletedIn } from "./EditView"
import { usePiano } from "react-pianosound"
import { useSelection } from "../desk/SelectionContext"
import { usePinchZoom } from "../canvas/usePinchZoom"
import { isHeldMotivation } from "../edition/motivation"
import { ConstraintView } from "../constraints/ConstraintView"
import { problemsOfVersion, shiftsIn } from "../constraints/constraints"
import { derivationToleranceOf } from "../edition/collationTolerance"
import { placeAt, Svg, svg } from "../canvas/units"
import { cornersOf } from "../geometry/drawing"
import { getBoundingBox } from "../geometry/getBoundingBox"
import { Box as DrawnBox } from "../canvas/rollGeometry"
import { stacked } from "./stacking"
import { bringIntoView, editWords, inRollOrder, Shown, Standing, Step, stepIn, symbolWords, tellCursor } from "./rollCursor"
import { laneMeaning } from "./laneMeaning"
import { halfOf } from "./whisker"
import { versionLabel } from "../edition/names"
import { OnTop } from "../canvas/OnTop"
import { unseen } from "../desk/unseen"

type AgedSymbol = AnySymbol & { age: number }

/** What each key does to the keyboard's cursor; with Shift held, it goes from edit to edit instead of from symbol to symbol. */
const steps: Record<string, Step | undefined> = {
    ArrowRight: 'next',
    ArrowLeft: 'previous',
    PageDown: 'pageNext',
    PageUp: 'pagePrevious',
    Home: 'first',
    End: 'last'
}

/** Where the keyboard's cursor stands: on a symbol or an edit of the version named. */
interface Cursor extends Standing {
    kind: 'symbol' | 'edit'
    versionId: string
}

/** How far the cursor's ring round an edit keeps from what the edit touches. */
const editRingGap = 6

/** An edit the cursor can stand on: where it begins, and the boxes of what it touches. */
interface EditStop {
    id: string
    from: Millimeters
    y: number
    edit: Edit
    boxes: DrawnBox[]
}

/** What the version tells the ring: which edit the cursor stands on, if any. */
interface EditRingHandle {
    standOn: (editId: string | undefined) => void
}

/**
 * The cursor's ring round the edit it stands on, which the view follows.
 * It keeps which edit that is to itself, so that moving the cursor redraws
 * the ring rather than the whole roll; the boxes come with the stops, and
 * so follow the zoom.
 */
const EditRing = ({ stops, ref }: { stops: readonly EditStop[], ref: Ref<EditRingHandle> }) => {
    const { viewport } = usePinchZoom()
    const [standingOn, standOn] = useState<string>()
    const ringRef = useRef<SVGRectElement>(null)
    useImperativeHandle(ref, () => ({ standOn }), [])

    const stop = stops.find(stop => stop.id === standingOn)
    useEffect(() => {
        if (stop) bringIntoView(ringRef.current, viewport)
    }, [stop, viewport])

    if (!stop) return null

    const { x, y, width, height } = getBoundingBox(stop.boxes.flatMap(cornersOf))
    return (
        <OnTop>
            <rect
                ref={ringRef}
                x={x - editRingGap}
                y={y - editRingGap}
                width={width + 2 * editRingGap}
                height={height + 2 * editRingGap}
                rx={4}
                className='decoration'
                fill='none'
                stroke='#1976d2'
                strokeWidth={2}
                pointerEvents='none'
            />
        </OnTop>
    )
}

/** Every symbol in force at a version, each told how many versions back it was inserted. */
const snapshotUpTo = (edition: Edition, versionId: string): AgedSymbol[] => {
    const snapshot: AgedSymbol[] = []
    const deletions: string[] = []
    let age = 0

    lineageOf(edition, versionId).forEach(s => {
        // collect all inserted symbols and tell them their age
        for (const edit of editsOf(s)) {
            for (const symbol of edit.insert ?? []) {
                snapshot.push({ ...symbol, age })
            }
        }

        // remove deletions
        const deleted = []
        for (const toRemove of deletions) {
            const idx = snapshot.findIndex(x => x.id === toRemove)
            if (idx !== -1) {
                snapshot.splice(idx, 1)
                deleted.push(toRemove)
            }
        }
        for (const del of deleted) {
            deletions.splice(deletions.indexOf(del), 1)
        }

        deletions.push(...editsOf(s).flatMap(edit => edit.delete || []))
        age += 1
    })

    return snapshot.sort((a, b) => (onsetOf(edition, a) || 0) - (onsetOf(edition, b) || 0))
}

interface VersionViewProps {
    version: Version
    /** The constraint problems of the whole edition. */
    problems: readonly ConstraintProblem[]
    /** The emulation settings by system, each system's defaults when none are chosen. */
    emulationOptions?: EmulationOptions
    onClick: (event: AnySymbol | Edit) => void
    /** Gives the lanes of a block of the bar another height, as its edge is dragged. */
    onResizeLane: (role: TrackRole, lane: Svg) => void
    /** Whether the version is being played. */
    playing: boolean
}

export const VersionView = ({ version, problems, emulationOptions, onClick, onResizeLane, playing }: VersionViewProps) => {
    const { selection, setSelection } = useSelection(isHeldMotivation)
    const { playSingleNote } = usePiano()
    const { edition } = useContext(EditionContext)
    const translation = usePinchZoom()
    const { translateX, rollLength, height: geometryHeight, room, bar, trackToY, viewport, zoom } = translation

    // None of what follows depends on the zoom, and emulating a version
    // costs a few hundred milliseconds, so it must not be redone per frame.
    const emulation = useMemo(() => {
        if (!edition) return undefined

        const emulation = emulationOf(version.system, emulationOptions)
        emulation?.emulateVersion(version, edition)
        return emulation
    }, [version, edition, emulationOptions])

    // The predecessor is drawn beside the version for comparison, and is
    // performed on its own machine, which a transfer makes another one.
    const prevEmulation = useMemo(() => {
        const previous = edition && predecessorOf(edition, version.id)
        if (!edition || !previous) return undefined

        const emulation = emulationOf(previous.system, emulationOptions)
        emulation?.emulateVersion(previous, edition)
        return emulation
    }, [version, edition, emulationOptions])

    const snapshot = useMemo(
        () => edition ? snapshotUpTo(edition, version.id) : [],
        [version, edition]
    )

    // Where the performance moves a command, it is drawn there.
    const shifts = useMemo(
        () => (edition && emulation) ? shiftsIn(emulation.negotiatedEvents, edition) : new Map<string, Millimeters>(),
        [emulation, edition]
    )

    // The curves drawn, as a command reads them where it sets in, the
    // predecessor's in a darker blue than the light one it is drawn in.
    const readDynamics = useMemo((): ReadDynamics[] => {
        if (!emulation) return []
        const own = { emulation, ink: 'darkblue' }
        return prevEmulation ? [{ emulation: prevEmulation, ink: 'steelblue' }, own] : [own]
    }, [emulation, prevEmulation])

    // What this version does away with was coded for its parent's system,
    // so that is the bar those commands are drawn by.
    const parent = edition && predecessorOf(edition, version.id)
    const deletedOn = trackerBarOf(parent?.system)
    const deletedIn = useDeletedIn(deletedOn)

    // Two edits touching the same stretch of a lane lie over each other,
    // and each must still show somewhere to be clicked. A root's edits
    // have no hulls, see `EditView`, so there nothing lies over anything.
    const layers = useMemo(
        () => stacked(editsOf(version).map(edit => ({
            of: edit,
            corners: (edition && parent)
                ? hullBoxesOf(edit, edition, translation, deletedIn).flatMap(cornersOf)
                : []
        }))),
        [version, edition, parent, translation, deletedIn]
    )

    // The keyboard's cursor, which the arrow keys take along the roll from
    // symbol to symbol and, with Shift, from edit to edit, showing what the
    // pointer would and saying it to a screen reader. It stands on this
    // version only: another version laid on the desk starts afresh. It is
    // kept out of the version's state, since moving it would otherwise
    // redraw the whole roll: the symbols, the ring and the voice are each
    // told on their own.
    const cursor = useRef<Cursor>(undefined)
    const editRing = useRef<EditRingHandle>(null)
    const voice = useRef<HTMLDivElement>(null)

    /** Says what the cursor stands on, which a screen reader reads out at once. */
    const say = (words: string) => {
        if (voice.current) voice.current.textContent = words
    }

    const symbolStops = useMemo(() => edition
        ? inRollOrder(snapshot.flatMap(symbol => {
            if (symbol.type === 'text') return []
            const place = placeOf(edition, symbol)
            const position = bar.positionOf(symbol)
            return place && position !== undefined
                ? [{ id: symbol.id, from: place.from, y: trackToY(position), symbol }]
                : []
        }))
        : [], [snapshot, edition, bar, trackToY])

    // A root's edits are not drawn, see `EditView`, so there are none to go to.
    const editStops = useMemo((): EditStop[] => (edition && parent)
        ? inRollOrder(editsOf(version).flatMap(edit => {
            const boxes = getEditBBoxes(edit, edition, translation, deletedIn)
            const deleted = (edit.delete ?? []).map(id => symbolIn(edition, id)).filter(symbol => !!symbol)
            const stretch = stretchOf([...edit.insert ?? [], ...deleted], edition)
            return boxes.length > 0 && stretch
                ? [{ id: edit.id, from: stretch.from, y: Math.min(...boxes.map(box => box.y)), edit, boxes }]
                : []
        }))
        : [], [version, edition, parent, translation, deletedIn])

    /** Plays the note a symbol is performed as, and selects it, as a click on it does. */
    const selectSymbol = (symbol: Note | Expression) => {
        const performingEvents = emulation?.findEventsPerforming(symbol.id) ?? []
        const noteOn = performingEvents.find(performedEvent => performedEvent.type === 'noteOn')
        const noteOff = performingEvents.find(performedEvent => performedEvent.type === 'noteOff')
        if (noteOn && noteOff) {
            playSingleNote(noteOn.pitch, (noteOff.at - noteOn.at) * 1000, 1 / noteOn.velocity)
        }

        onClick(symbol)
    }

    /** What the cursor says of a symbol: all that the pointer reads off the roll at it. */
    const symbolSaid = (symbol: AgedSymbol & (Note | Expression)): string => {
        const lane = laneMeaning(symbol, bar)
        const place = edition && placeOf(edition, symbol)
        if (!edition || !lane || !place) return ''

        const onsets = placedCarriersOf(edition, symbol).map(carrier => carrier.horizontal.from)
        const half = halfOf(symbol, lane.track, emulation?.options.division)
        const at = add(place.from, shifts.get(symbol.id) ?? mm(0))
        const own = half && emulation ? velocityIn(emulation, half, at) : undefined
        const before = half && prevEmulation ? velocityIn(prevEmulation, half, at) : undefined

        return symbolWords({
            meaning: lane.meaning,
            track: lane.track,
            from: place.from,
            to: place.to,
            inserted: !!parent && symbol.age === 0,
            spread: onsets.length > 0 ? subtract(onsets.reduce(max), onsets.reduce(min)) : undefined,
            velocity: own === undefined ? undefined : {
                own,
                before: before !== undefined && parent ? { siglum: versionLabel(edition, parent.id), velocity: before } : undefined
            }
        })
    }

    /** What the cursor says of an edit: what it does, how certainly, and why. */
    const editSaid = (edit: Edit, from: Millimeters): string => editWords({
        from,
        type: edit.editType?.replaceAll('-', ' '),
        inserted: edit.insert?.length ?? 0,
        deleted: edit.delete?.length ?? 0,
        certainty: edit['@annotation']?.belief.certainty,
        motivation: version.motivations.find(m => m.id === edit.motivation)?.note || undefined
    })

    /** The motivation an edit is held under, put in focus or let go of again, as the pointer does by resting on the edit. */
    const holdMotivationOf = (edit: Edit, held: boolean) => {
        const motivation = version.motivations.find(m => m.id === edit.motivation)
        if (!motivation) return
        setSelection(selected => held
            ? [{ versionId: version.id, motivation }]
            : selected.filter(one => !(one.versionId === version.id && one.motivation.id === motivation.id)))
    }

    /** Takes the cursor off what it stands on, where it stands on anything. */
    const release = (from: Cursor | undefined) => {
        if (from?.kind === 'symbol') tellCursor(from.id, false)
        const edit = from?.kind === 'edit' && editStops.find(stop => stop.id === from.id)
        if (edit) holdMotivationOf(edit.edit, false)
        editRing.current?.standOn(undefined)
    }

    /** Takes the cursor off the roll, as Escape does and the focus leaving it. */
    const leave = () => {
        release(cursor.current)
        cursor.current = undefined
        say('')
    }

    /** The stretch of the roll the view shows. */
    const shown = (): Shown => viewport
        ? { from: placeAt(svg(viewport.scrollLeft), zoom), to: placeAt(svg(viewport.scrollLeft + viewport.clientWidth), zoom) }
        : { from: mm(0), to: rollLength }

    const keyed = (event: KeyboardEvent) => {
        // Only the roll's own keys, not those of a button drawn on it.
        if (event.target !== viewport || event.ctrlKey || event.metaKey || event.altKey) return

        const standing = cursor.current?.versionId === version.id ? cursor.current : undefined

        // Escape takes the selection away as well, see `RollDesk`.
        if (event.key === 'Escape') {
            leave()
            return
        }

        if (event.key === 'Enter') {
            if (!standing) return
            event.preventDefault()
            const symbol = standing.kind === 'symbol' && symbolStops.find(stop => stop.id === standing.id)
            const edit = standing.kind === 'edit' && editStops.find(stop => stop.id === standing.id)
            if (symbol) selectSymbol(symbol.symbol)
            if (edit) onClick(edit.edit)
            const said = voice.current?.textContent ?? ''
            if (!said.startsWith('Selected')) say(`Selected: ${said}`)
            return
        }

        const step = steps[event.key]
        if (!step) return

        const kind = event.shiftKey ? 'edit' : 'symbol'
        const stops = kind === 'edit' ? editStops : symbolStops
        if (stops.length === 0) return
        event.preventDefault()

        const next = stepIn<{ id: string, from: Millimeters, y: number }>(stops, step, standing, shown())
        if (!next) {
            say(`No ${kind} ${step === 'next' ? 'after' : 'before'} this one`)
            return
        }

        release(standing)
        if (kind === 'symbol') {
            const symbol = symbolStops.find(stop => stop.id === next.id)
            tellCursor(next.id, true)
            say(symbol ? symbolSaid(symbol.symbol) : '')
        }
        else {
            const edit = editStops.find(stop => stop.id === next.id)
            if (edit) holdMotivationOf(edit.edit, true)
            editRing.current?.standOn(next.id)
            say(edit ? editSaid(edit.edit, edit.from) : '')
        }
        cursor.current = { kind, id: next.id, at: next.from, versionId: version.id }
    }

    // The roll's keys are listened to on the viewport, which holds the focus,
    // with the cursor as it stands now. Where the focus leaves the roll, the
    // cursor goes with it.
    const latest = useRef({ keyed, leave })
    useLayoutEffect(() => {
        latest.current = { keyed, leave }
    })
    useEffect(() => {
        if (!viewport) return
        const onKey = (event: KeyboardEvent) => latest.current.keyed(event)
        const onBlur = () => latest.current.leave()
        viewport.addEventListener('keydown', onKey)
        viewport.addEventListener('blur', onBlur)
        return () => {
            viewport.removeEventListener('keydown', onKey)
            viewport.removeEventListener('blur', onBlur)
        }
    }, [viewport])

    if (!edition) return null

    // A balloon on another derivation must leave this roll alone, and two
    // versions may write one motivation id, so a selection counts as in
    // focus only where it is this version's.
    const inFocus = selection
        .filter(held => held.versionId === version.id)
        .map(held => held.motivation)

    const focusOf = (edit: Edit): Focus | undefined => {
        if (!inFocus.length) return undefined
        return inFocus.some(m => m.id === edit.motivation) ? 'lit' : 'dimmed'
    }

    const edits = layers.map(({ of: edit, rings }) => {
        const motivation = version.motivations.find(m => m.id === edit.motivation)

        return (
            <g
                key={`editView_${edit.id}`}
                onMouseEnter={motivation ? () => setSelection([{ versionId: version.id, motivation }]) : undefined}
                onMouseLeave={motivation ? () => setSelection([]) : undefined}
            >
                <EditView
                    edit={edit}
                    deletedOn={deletedOn}
                    tolerance={derivationToleranceOf(version)}
                    focus={focusOf(edit)}
                    atRoot={!parent}
                    rings={rings}
                    onClick={() => onClick(edit)}
                />
            </g>
        )
    })

    // draw dynamics of prev version and dynamics of current version (for comparison)
    const dynamics = emulation && (
        <g className='dynamics'>
            <DynamicsGrid velocity={emulation.options.velocity} />

            {prevEmulation && (
                <Dynamics
                    forEmulation={prevEmulation}
                    pathProps={{
                        stroke: 'lightblue',
                        strokeWidth: 3.2,
                        strokeOpacity: 0.7
                    }}
                />
            )}
            <Dynamics
                forEmulation={emulation}
                pathProps={{
                    stroke: 'darkblue',
                    strokeWidth: 1.6
                }}
            />
        </g>
    )

    return (
        <g className='versionView'>
            <LabelledLanes performed={emulation?.negotiatedEvents} playing={playing}>
                <Blocks />

                {dynamics}

                {!emulation && (
                    <text x={0} y={scale(room.above, -0.5)} fontSize={11} fill='#b45309'>
                        No emulator for {trackerBarOf(version.system)?.name ?? 'this system'},
                        so the version is drawn but not performed.
                    </text>
                )}

                {/* The paper the version is laid out on, as far as what is drawn beyond the bar. */}
                <Ground
                    x={0}
                    y={scale(room.above, -1)}
                    width={translateX(rollLength)}
                    height={room.above + geometryHeight + room.below}
                />

                {edits}

                {emulation && <Pedals forEmulation={emulation} />}

                {snapshot
                    .map((symbol, i) => {
                        if (symbol.type === 'text') return null

                        return (
                            <Command
                                key={`${symbol.id || i}`}
                                symbol={symbol}
                                age={symbol.age}
                                shift={shifts.get(symbol.id)}
                                division={emulation?.options.division}
                                dynamics={readDynamics}
                                highlight={version ? false : (symbol.carriers?.length !== 0)}
                                onClick={() => selectSymbol(symbol)}
                            />
                        )
                    })
                }

                <ConstraintView
                    snapshot={snapshot}
                    shifts={shifts}
                    problems={problemsOfVersion(problems, version.id)}
                />

                {/* Over everything else, so that a hull reaching into the gaps does not cover them. */}
                <BlockEdges onResize={onResizeLane} />

                <EditRing stops={editStops} ref={editRing} />
            </LabelledLanes>

            {/* Says where the keyboard's cursor stands, which the eye reads off the roll; written to by `say`. */}
            {viewport && createPortal(
                <Box ref={voice} aria-live='assertive' aria-atomic sx={unseen} />,
                viewport
            )}
        </g>
    )
}
