import { useContext, useMemo, useRef } from "react"
import { AnySymbol, EditionView, Emulation, Expression, PerformedNoteOnEvent, PerformedNoteOffEvent, Version, Edit, Motivation } from "linked-rolls"
import { welteT100System } from "linked-rolls/welte-t100"
import { Dynamics, DynamicsGrid } from "./Dynamics"
import { Perforation, SustainPedal } from "./SymbolView"
import { EditionContext } from "../../providers/EditionContext"
import { Ground } from "./Ground"
import { MotivationView } from "./MotivationView"
import { EditView } from "./EditView"
import { usePiano } from "react-pianosound"
import { useSelection } from "../../providers/SelectionContext"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { isMotivation } from "./VersionMenu"

type AgedSymbol = AnySymbol & { age: number }

/** Every symbol in force at a version, each told how many versions back it was inserted. */
const snapshotUpTo = (view: EditionView, versionId: string): AgedSymbol[] => {
    const snapshot: AgedSymbol[] = []
    const deletions: string[] = []
    let age = 0

    view.travelUp(versionId, s => {
        // collect all inserted symbols and tell them their age
        for (const edit of s.edits) {
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

        deletions.push(...s.edits.flatMap(edit => edit.delete || []))
        age += 1
    })

    return snapshot.sort((a, b) => {
        return (view.dimensionOf(a)?.horizontal.from || 0)
            - (view.dimensionOf(b)?.horizontal.from || 0)
    })
}

/** Each pedal-on paired with the first pedal-off that follows it. */
const sustainSpans = (snapshot: AgedSymbol[], view: EditionView) => {
    const startOf = (symbol: AnySymbol) => view.dimensionOf(symbol)?.horizontal.from || 0

    const isPedal = (symbol: AnySymbol, which: 'SustainPedalOn' | 'SustainPedalOff') =>
        symbol.type === 'expression' && symbol.expressionType === which

    return snapshot
        .filter(symbol => isPedal(symbol, 'SustainPedalOn'))
        .map(on => ({
            on: on as Expression,
            off: snapshot.find(candidate =>
                isPedal(candidate, 'SustainPedalOff') && startOf(candidate) > startOf(on)
            ) as Expression | undefined
        }))
        .filter((span): span is { on: Expression, off: Expression } => !!span.off)
}

interface VersionViewProps {
    version: Version
    onClick: (event: AnySymbol | Motivation | Edit) => void
}

export const VersionView = ({ version, onClick }: VersionViewProps) => {
    const { selection, setSelection } = useSelection(s => isMotivation(s))
    const { playSingleNote } = usePiano()
    const { view, viewOnly } = useContext(EditionContext)
    const { translateX, rollLength } = usePinchZoom()

    const svgRef = useRef<SVGGElement>(null)

    // None of what follows depends on the zoom, and emulating a version
    // costs a few hundred milliseconds, so it must not be redone per frame.
    const emulation = useMemo(() => {
        if (!view) return undefined

        const emulation = new Emulation(welteT100System)
        emulation.emulateVersion(version, view)
        return emulation
    }, [version, view])

    const prevEmulation = useMemo(() => {
        const previous = view?.predecessorOf(version.id)
        if (!view || !previous) return undefined

        const emulation = new Emulation(welteT100System)
        emulation.emulateVersion(previous, view)
        return emulation
    }, [version, view])

    const snapshot = useMemo(
        () => view ? snapshotUpTo(view, version.id) : [],
        [version, view]
    )

    const pedalSpans = useMemo(
        () => view ? sustainSpans(snapshot, view) : [],
        [snapshot, view]
    )

    if (!view || !emulation) return null

    const edits = version.edits
        .map(e => <EditView
            key={`editView_${e.id}`}
            edit={e}
            onClick={() => onClick(e)}
        />)

    // draw edits of current version, but only
    // if the version is based on a previous version
    const motivations = version.motivations
        .map(m => <MotivationView
            key={m.id}
            expanded={selection.includes(m)}
            motivation={m}
            onMouseOver={() => setSelection(prev => [...prev, m])}
            onMouseLeave={() => setSelection([])} />
        )

    // draw dynamics of prev version and dynamics of current version (for comparison)
    const dynamics = (
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
        <g className='versionView' ref={svgRef}>
            {dynamics}

            <Ground x={0} y={-50} width={translateX(rollLength)} height={200 + 50} />

            {!viewOnly && edits}
            {motivations}

            {pedalSpans.map(({ on, off }, i) => (
                <SustainPedal
                    key={`sustain_${on.id || i}`}
                    on={on}
                    off={off}
                />
            ))}

            {snapshot
                .map((symbol, i) => {
                    if (symbol.type === 'text') return null

                    return (
                        <Perforation
                            key={`${symbol.id || i}`}
                            symbol={symbol}
                            age={symbol.age}
                            highlight={version ? false : (symbol.carriers?.length !== 0)}
                            onClick={() => {
                                const performingEvents = emulation.findEventsPerforming(symbol.id)
                                const noteOn = performingEvents.find(performedEvent => performedEvent.type === 'noteOn') as PerformedNoteOnEvent | undefined
                                const noteOff = performingEvents.find(performedEvent => performedEvent.type === 'noteOff') as PerformedNoteOffEvent | undefined
                                if (noteOn && noteOff) {
                                    playSingleNote(noteOn.pitch, (noteOff.at - noteOn.at) * 1000, 1 / noteOn.velocity)
                                }

                                onClick(symbol)
                            }}
                        />
                    )
                })
            }
        </g>
    )
}
