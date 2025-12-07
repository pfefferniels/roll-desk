import { useContext, useRef } from "react"
// import { usePiano } from "react-pianosound"
import { Emulation, PerformedNoteOnEvent, PerformedNoteOffEvent, Version, Edit, Motivation } from "linked-rolls"
import { Dynamics, DynamicsGrid } from "./Dynamics"
import { Perforation, SustainPedal, TextSymbol } from "./SymbolView"
import { AnySymbol, Expression } from "linked-rolls/lib/Symbol"
import { EditView } from "./EditView"
import { EditionContext } from "../../providers/EditionContext"
import { Ground } from "./Ground"

interface VersionViewProps {
    version: Version
    onClick: (event: AnySymbol | Motivation | Edit) => void
}

export const VersionView = ({ version, onClick }: VersionViewProps) => {
    // const { playSingleNote } = usePiano()
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

    // draw edits of current version, but only 
    // if the version is based on a previous version
    let edits = []
    for (const edit of version.edits) {
        edits.push(
            <EditView
                key={edit.id}
                edit={edit}
                onClick={() => onClick(edit)}
            />
        )
    }
    if (!prevVersion && viewOnly) {
        edits = []
    }

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

            {edits}

            {snapshot
                // .filter(symbol => {
                //     const found = version.edits.findIndex(edit => (
                //         (edit.insert || []).includes(symbol) ||
                //         (edit.delete || []).includes(symbol)
                //     ))
                //     return found === -1
                // })
                .map((symbol, i) => {
                    if (symbol.type === 'expression' && symbol.expressionType === 'SustainPedalOn') {
                        const partner = snapshot
                            .sort((a, b) => {
                                return (view.dimensionOf(a)?.horizontal.from || 0)
                                    - (view.dimensionOf(b)?.horizontal.from || 0)
                            })
                            .find(candidate => {
                                return (
                                    candidate.type === 'expression'
                                    && candidate.expressionType === 'SustainPedalOff'
                                    && (view.dimensionOf(candidate)?.horizontal.from || 0) > (view.dimensionOf(symbol)?.horizontal.from || 0)
                                )
                            })
                        if (!partner) return null

                        return (
                            <SustainPedal
                                key={`sustain_${symbol.id || i}`}
                                on={symbol}
                                off={partner as Expression}
                            />
                        )
                    }
                    else if (symbol.type === 'expression' || symbol.type === 'note') {
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
                                        // playSingleNote(noteOn.pitch, (noteOff.at - noteOn.at) * 1000, 1 / noteOn.velocity)
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
