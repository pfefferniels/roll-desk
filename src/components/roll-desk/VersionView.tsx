import { useRef } from "react"
// import { usePiano } from "react-pianosound"
import { Emulation, PerformedNoteOnEvent, PerformedNoteOffEvent, Version, traverseVersions, flat, Edit, Motivation, getSnapshot } from "linked-rolls"
import { Dynamics } from "./Dynamics"
import { Perforation, SustainPedal, TextSymbol } from "./SymbolView"
import { AnySymbol, dimensionOf, Expression } from "linked-rolls/lib/Symbol"
import { EditView } from "./EditView"

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

    // Improved sorting for complex notation - sort by position and then by type for stable beam alignment
    snapshot.sort((a, b) => {
        const aDim = dimensionOf(a);
        const bDim = dimensionOf(b);
        
        // Primary sort by horizontal position
        const positionDiff = aDim.horizontal.from - bDim.horizontal.from;
        if (Math.abs(positionDiff) > 0.001) { // Use small tolerance for floating point comparison
            return positionDiff;
        }
        
        // Secondary sort by vertical position for overlapping notes
        const aVertical = a.carriers?.[0]?.vertical?.from ?? 0;
        const bVertical = b.carriers?.[0]?.vertical?.from ?? 0;
        const verticalDiff = aVertical - bVertical;
        if (Math.abs(verticalDiff) > 0.001) {
            return verticalDiff;
        }
        
        // Tertiary sort by type to ensure consistent ordering for beams
        const typeOrder = { 'note': 0, 'expression': 1, 'handwrittenText': 2, 'rollLabel': 3, 'stamp': 4, 'cover': 5 };
        const aTypeOrder = typeOrder[a.type] ?? 99;
        const bTypeOrder = typeOrder[b.type] ?? 99;
        
        return aTypeOrder - bTypeOrder;
    });

    // draw edits of current version, but only 
    // if the version is based on a previous version
    const edits = []
    if (prevVersion) {
        for (const edit of version.edits) {
            edits.push(
                <EditView
                    key={edit.id}
                    edit={edit}
                    onClick={() => onClick(edit)}
                />
            )
        }
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

    return (
        <g className='versionView' ref={svgRef}>
            {dynamics}
            {edits}

            {snapshot
                .map((symbol, i) => {
                    // Validate symbol before processing
                    if (!symbol || !symbol.type) {
                        console.warn('Invalid symbol at index', i);
                        return null;
                    }

                    try {
                        if (symbol.type === 'expression' && symbol.expressionType === 'SustainPedalOn') {
                            // Improved partner finding for sustain pedal - avoid re-sorting the already sorted array
                            const symbolPos = dimensionOf(symbol).horizontal.from;
                            const partner = snapshot.find(candidate => {
                                return (
                                    candidate.type === 'expression'
                                    && candidate.expressionType === 'SustainPedalOff'
                                    && dimensionOf(candidate).horizontal.from > symbolPos
                                )
                            });
                            
                            if (!partner) {
                                console.warn('No matching SustainPedalOff found for SustainPedalOn:', symbol.id);
                                return null;
                            }

                            return (
                                <SustainPedal
                                    key={`sustain_${symbol.id || i}`}
                                    on={symbol}
                                    off={partner as Expression}
                                />
                            );
                        }
                        else if (symbol.type === 'expression' || symbol.type === 'note') {
                            // Enhanced error handling for note/expression rendering
                            const isHighlighted = version ? false : (symbol.carriers?.length !== 0);
                            
                            return (
                                <Perforation
                                    key={`${symbol.id || `symbol_${i}`}`}
                                    symbol={symbol}
                                    age={symbol.age}
                                    highlight={isHighlighted}
                                    onClick={() => {
                                        try {
                                            const performingEvents = emulation.findEventsPerforming(symbol.id);
                                            const noteOn = performingEvents?.find(performedEvent => performedEvent.type === 'noteOn') as PerformedNoteOnEvent | undefined;
                                            const noteOff = performingEvents?.find(performedEvent => performedEvent.type === 'noteOff') as PerformedNoteOffEvent | undefined;
                                            if (noteOn && noteOff) {
                                                // playSingleNote(noteOn.pitch, (noteOff.at - noteOn.at) * 1000, 1 / noteOn.velocity)
                                            }
                                            onClick(symbol);
                                        } catch (error) {
                                            console.error('Error handling note click for symbol:', symbol.id, error);
                                        }
                                    }}
                                />
                            );
                        }
                    else if (symbol.type === 'handwrittenText' || symbol.type === 'rollLabel' || symbol.type === 'stamp') {
                        return (
                            <TextSymbol
                                key={`textSymbol_${symbol.id || `text_${i}`}`}
                                event={symbol}
                                onClick={() => onClick(symbol)}
                            />
                        );
                    }
                    else if (symbol.type === 'cover') {
                        // TODO: Implement cover rendering with proper alignment
                        console.warn('Cover symbol rendering not implemented:', symbol.id);
                        return null;
                    }
                    else {
                        console.warn('Unknown symbol type:', symbol.type, 'for symbol:', symbol.id);
                        return null;
                    }
                } catch (error) {
                    console.error('Error rendering symbol at index', i, ':', error);
                    return null;
                }
            }).filter(Boolean)}
        </g>
    )
}
