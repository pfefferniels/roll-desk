import { useRef } from "react"
// import { usePiano } from "react-pianosound"
import { Emulation, PerformedNoteOnEvent, PerformedNoteOffEvent, Version, traverseVersions, flat, Edit, Motivation, getSnapshot } from "linked-rolls"
import { Dynamics } from "./Dynamics"
import { Perforation, SustainPedal, TextSymbol } from "./SymbolView"
import { AnySymbol, dimensionOf, Expression } from "linked-rolls/lib/Symbol"
import { EditView } from "./EditView"
import { MotivationView } from "./MotivationView"

interface VersionViewProps {
    version: Version
    onClick: (event: AnySymbol | Motivation<string> | Edit) => void
}

export const VersionView = ({ version, onClick }: VersionViewProps) => {
    // const { playSingleNote } = usePiano()

    const svgRef = useRef<SVGGElement>(null)

    const emulation = new Emulation()
    emulation.emulateVersion(version)

    const prevVersion = version.basedOn && flat(version.basedOn)
    let prevEmulation: Emulation | undefined = undefined
    if (prevVersion) {
        prevEmulation = new Emulation()
        prevEmulation.emulateVersion(prevVersion)
    }

    // all symbols up to the current version
    const snapshot: (AnySymbol & { age: number })[] = [];
    const deletions: AnySymbol[] = []
    let age = 0
    traverseVersions(version, s => {
        // collect all inserted symbols and tell them their age
        for (const edit of s.edits) {
            for (const symbol of edit.insert ?? []) {
                snapshot.push({ ...symbol, age })
            }
        }

        // remove deletions
        const deleted = []
        for (const toRemove of deletions) {
            const idx = snapshot.findIndex(x => x === toRemove)
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
        return dimensionOf(a).horizontal.from - dimensionOf(b).horizontal.from
    })

    // draw edits of current version, but only 
    // if the version is based on a previous version
    const edits = []
    for (const edit of version.edits) {
        edits.push(
            <EditView
                key={edit.id}
                edit={edit}
                onClick={() => onClick(edit)}
            />
        )
    }

    // draw dynamics of prev version and dynamics of current version (for comparison)
    const dynamics = (
        <g className='dynamics'>
            {prevEmulation && (
                <Dynamics
                    forEmulation={prevEmulation}
                    pathProps={{
                        stroke: 'gray',
                        strokeWidth: 3,
                        strokeOpacity: 0.4
                    }}
                />
            )}
            {emulation && (
                <Dynamics
                    forEmulation={emulation}
                    pathProps={{
                        stroke: 'black',
                        strokeWidth: 1.5
                    }}
                />
            )}
        </g>
    )

    const motivations = version.motivations
        .map(motivation => {
            return (
                <MotivationView
                    key={motivation.id}
                    motivation={motivation}
                    onClick={() => onClick(motivation)}
                />
            )
        })

        console.log('snapshot:', getSnapshot(version))

    return (
        <g className='versionView' ref={svgRef}>
            {dynamics}
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
                                return dimensionOf(a).horizontal.from - dimensionOf(b).horizontal.from
                            })
                            .find(candidate => {
                                return (
                                    candidate.type === 'expression'
                                    && candidate.expressionType === 'SustainPedalOff'
                                    && dimensionOf(candidate).horizontal.from > dimensionOf(symbol).horizontal.from
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

            {motivations}
        </g>
    )
}
