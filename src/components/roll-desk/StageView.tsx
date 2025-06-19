import { useRef } from "react"
// import { usePiano } from "react-pianosound"
import { Emulation, PerformedNoteOnEvent, PerformedNoteOffEvent, Stage, traverseStages, flat, Edit, Motivation } from "linked-rolls"
import { Dynamics } from "./Dynamics"
import { Perforation, SustainPedal, TextSymbol } from "./SymbolView"
import { AnySymbol, dimensionOf, Expression } from "linked-rolls/lib/Symbol"
import { EditView } from "./EditView"
import { MotivationView } from "./MotivationView"

interface StageViewProps {
    stage: Stage
    onClick: (event: AnySymbol | Motivation | Edit) => void
}

export const StageView = ({ stage, onClick }: StageViewProps) => {
    // const { playSingleNote } = usePiano()

    const svgRef = useRef<SVGGElement>(null)

    const emulation = new Emulation()
    emulation.emulateStage(stage)

    const prevStage = stage.basedOn && flat(stage.basedOn)
    let prevEmulation: Emulation | undefined = undefined
    if (prevStage) {
        prevEmulation = new Emulation()
        prevEmulation.emulateStage(prevStage)
    }

    // all symbols up to the current stage
    const snapshot: (AnySymbol & { age: number })[] = [];
    let age = 0
    traverseStages(stage, s => {
        // collect all inserted symbols and tell them their age
        for (const edit of s.edits) {
            for (const symbol of edit.insert ?? []) {
                snapshot.push({ ...symbol, age })
            }
        }

        // remove deletions
        const deletions = s.edits.flatMap(edit => edit.delete || [])
        for (const toRemove of deletions) {
            const idx = snapshot.findIndex(x => x.id === toRemove.id)
            if (idx !== -1) snapshot.splice(idx, 1)
        }

        age += 1
    })

    // draw edits of current stage, but only 
    // if the stage is based on a previous stage
    const edits = []
    for (const edit of stage.edits) {
        edits.push(
            <EditView
                key={edit.id}
                edit={edit}
                onClick={() => onClick(edit)}
            />
        )
    }

    // draw dynamics of prev stage and dynamics of current stage (for comparison)
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

    const motivations = stage.motivations
        .map(motivation => {
            return (
                <MotivationView
                    key={motivation.id}
                    motivation={motivation}
                    onClick={() => onClick(motivation)}
                />
            )
        })

    return (
        <g className='stageView' ref={svgRef}>
            {dynamics}

            {snapshot
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
                                key={`symbol_${symbol.id || i}`}
                                symbol={symbol}
                                highlight={stage ? false : (symbol.carriers?.length !== 0)}
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

            {edits}
            {motivations}
        </g>
    )
}
