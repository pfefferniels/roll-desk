import { useContext, useRef } from "react"
import { Emulation, PerformedNoteOnEvent, PerformedNoteOffEvent, Version, Edit, Motivation } from "linked-rolls"
import { Dynamics, DynamicsGrid } from "./Dynamics"
import { Perforation, SustainPedal, TextSymbol } from "./SymbolView"
import { AnySymbol, Expression } from "linked-rolls/lib/Symbol"
import { EditionContext } from "../../providers/EditionContext"
import { Ground } from "./Ground"
import { MotivationView } from "./MotivationView"
import { EditView } from "./EditView"
import { usePiano } from "react-pianosound"
import { useSelection } from "../../providers/SelectionContext"
import { isMotivation } from "./VersionMenu"

interface VersionViewProps {
    version: Version
    onClick: (event: AnySymbol | Motivation | Edit) => void
}

export const VersionView = ({ version, onClick }: VersionViewProps) => {
    const { selection, setSelection } = useSelection(s => isMotivation(s))
    const { playSingleNote } = usePiano()
    const { view, viewOnly } = useContext(EditionContext)

    const svgRef = useRef<SVGGElement>(null)

    if (!view) return null

    const emulation = new Emulation()
    emulation.emulateVersion(version, view)

    const prevVersion = view.predecessorOf(version.id)
    let prevEmulation: Emulation | undefined = undefined
    if (prevVersion) {
        prevEmulation = new Emulation()
        prevEmulation.emulateVersion(prevVersion, view)
    }

    // all symbols up to the current version
    const snapshot: (AnySymbol & { age: number })[] = [];
    const deletions: string[] = []
    let age = 0
    view.travelUp(version.id, s => {
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

    snapshot.sort((a, b) => {
        return (view.dimensionOf(a)?.horizontal.from || 0)
            - (view.dimensionOf(b)?.horizontal.from || 0)
    })

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
            <DynamicsGrid {...emulation.options} />

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
            {emulation && (
                <Dynamics
                    forEmulation={emulation}
                    pathProps={{
                        stroke: 'darkblue',
                        strokeWidth: 1.6
                    }}
                />
            )}
        </g>
    )

    return (
        <g className='versionView' ref={svgRef}>
            {dynamics}

            <Ground x={0} y={-50} width={100000} height={200 + 50} />

            {!viewOnly && edits}
            {motivations}

            {snapshot
                .filter(symbol => symbol.type === 'expression' && symbol.expressionType === 'SustainPedalOn')
                .map(symbol => {
                    const partner = snapshot
                        .find(candidate => {
                            return (
                                candidate.type === 'expression'
                                && candidate.expressionType === 'SustainPedalOff'
                                && (view.dimensionOf(candidate)?.horizontal.from || 0) > (view.dimensionOf(symbol)?.horizontal.from || 0)
                            )
                        })

                    return { on: symbol, off: partner }
                })
                .filter(({ off }) => !!off)
                .map(({ on: symbol, off: partner }, i) => {
                    return (
                        <SustainPedal
                            key={`sustain_${symbol.id || i}`}
                            on={symbol as Expression}
                            off={partner as Expression}
                        />
                    )
                })}

            {snapshot
                .map((symbol, i) => {
                    if (symbol.type === 'expression' || symbol.type === 'note') {
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
                    }
                    else if (symbol.type === 'handwrittenText' || symbol.type === 'rollLabel' || symbol.type === 'stamp') {
                        return (
                            <TextSymbol
                                key={`textSymbol_${symbol.id || i}`}
                                event={symbol}
                                onClick={() => onClick(symbol)}
                            />
                        )
                    }
                    else if (symbol.type === 'cover') {
                        // TODO
                    }
                })}
        </g>
    )
}
