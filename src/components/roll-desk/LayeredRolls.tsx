import { useRef } from "react"
import { Glow } from "./Glow"
import { PinchZoomProvider } from "../../hooks/usePinchZoom"
import { CollationResult, LayerInfo, UserSelection } from "./RollDesk"
import { Cursor, FixedCursor } from "./Cursor"
import { RollGrid } from "./RollGrid"
import { WorkingPaper } from "./WorkingPaper"
import { Assumption, RollCopy } from "linked-rolls"
import { AnyRollEvent, CollatedEvent, Relation } from "linked-rolls/lib/types"
import { Selection } from "./Selection"
import { RollCopyViewer } from "./RollCopyViewer"

interface LayeredRollsProps {
    copies: RollCopy[]
    assumptions: Assumption[]
    collationResult: CollationResult
    stack: LayerInfo[]
    activeLayerId: string
    stretch: number
    selection: UserSelection
    onUpdateSelection: (newSelection: UserSelection) => void
    fixedX: number
    setFixedX: (fixedX: number) => void
}

export const LayeredRolls = ({
    stack,
    activeLayerId,
    stretch,
    copies,
    assumptions,
    collationResult,
    selection,
    onUpdateSelection,
    fixedX,
    setFixedX }: LayeredRollsProps
) => {
    const svgRef = useRef<SVGGElement>(null)

    // makes sure that the active layer comes last
    let orderedLayers = [...stack].reverse()

    const activeLayer = stack.find(layer => layer.id === activeLayerId)
    if (activeLayer) {
        orderedLayers.splice(stack.indexOf(activeLayer), 1)
        orderedLayers.push(activeLayer)
    }

    const handleUpdateSelection = (clickedEvent: AnyRollEvent | CollatedEvent | Assumption) => {
        onUpdateSelection([...selection, clickedEvent])
    }

    return (
        <svg width="10000" height={6 * 100}>
            <Glow />
            <g ref={svgRef}>
                <PinchZoomProvider zoom={stretch} trackHeight={6}>
                    <RollGrid width={10000} />

                    <Cursor
                        onFix={(x) => setFixedX(x)}
                        svgRef={svgRef} />

                    <FixedCursor fixedAt={fixedX} />

                    {orderedLayers
                        .map((stackItem, i) => {
                            if (!stackItem.visible) return null

                            if (stackItem.id === 'working-paper') {
                                return (
                                    <WorkingPaper
                                        key={`copy_${i}`}
                                        numberOfRolls={copies.length}
                                        events={collationResult.events}
                                        assumptions={assumptions}
                                        copies={copies}
                                        onClick={handleUpdateSelection} />
                                )
                            }

                            const copy = copies.find(copy => copy.physicalItem.id === stackItem.id)
                            if (!copy) return null

                            return (
                                <RollCopyViewer
                                    key={`copy_${i}`}
                                    copy={copy}
                                    onTop={i === 0}
                                    color={stackItem.color}
                                    onClick={handleUpdateSelection} />
                            )
                        })}

                    {svgRef.current && (
                        <Selection
                            pins={selection}
                            remove={eventToRemove => {
                                onUpdateSelection(selection.filter(event => event.id !== eventToRemove.id))
                            }} />
                    )}
                </PinchZoomProvider>
            </g>
        </svg>

    )
}