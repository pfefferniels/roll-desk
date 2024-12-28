import { useRef } from "react"
import { Glow } from "./Glow"
import { PinchZoomProvider } from "../../hooks/usePinchZoom"
import { LayerInfo, UserSelection } from "./RollDesk"
import { WorkingPaper } from "./WorkingPaper"
import { AnyEditorialAction, Edition } from "linked-rolls"
import { AnyRollEvent, CollatedEvent } from "linked-rolls/lib/types"
import { Selection } from "./Selection"
import { RollCopyViewer } from "./RollCopyViewer"
import { PatchPattern } from "./PatchPattern"

interface LayeredRollsProps {
    edition: Edition
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
    edition,
    selection,
    onUpdateSelection,
    fixedX,
    setFixedX }: LayeredRollsProps
) => {
    const svgRef = useRef<SVGGElement>(null)

    // makes sure that the active layer comes last
    const orderedLayers = [...stack].reverse()

    const activeLayer = stack.find(layer => layer.id === activeLayerId)
    if (activeLayer) {
        const index = orderedLayers.findIndex(info => activeLayer.id === info.id)
        if (index !== -1) {
            orderedLayers.splice(index, 1)
        }
        orderedLayers.push(activeLayer)
    }

    const handleUpdateSelection = (clickedEvent: AnyRollEvent | CollatedEvent | AnyEditorialAction) => {
        onUpdateSelection([...selection, clickedEvent])
    }

    return (
        <svg width="100000" height={6 * 100}>
            <Glow />
            <PatchPattern />

            <g ref={svgRef}>
                <PinchZoomProvider zoom={stretch} trackHeight={6}>
                    {orderedLayers
                        .map((stackItem, i) => {
                            if (!stackItem.visible) return null

                            if (stackItem.id === 'working-paper') {
                                return (
                                    <WorkingPaper
                                        key={`copy_${i}`}
                                        numberOfRolls={edition.copies.length}
                                        edition={edition}
                                        onClick={handleUpdateSelection} />
                                )
                            }

                            const copy = edition.copies.find(copy => copy.id === stackItem.id)
                            if (!copy) return null

                            return (
                                <RollCopyViewer
                                    key={`copy_${i}`}
                                    copy={copy}
                                    onTop={i === orderedLayers.length - 1}
                                    color={stackItem.color}
                                    facsimile={stackItem.image}
                                    facsimileOpacity={stackItem.facsimileOpacity}
                                    onClick={handleUpdateSelection}
                                    onSelectionDone={dimension => { onUpdateSelection([dimension]) }}
                                    fixedX={fixedX}
                                    setFixedX={setFixedX}
                                />
                            )
                        })}

                    {svgRef.current && (
                        <Selection
                            pins={selection}
                            remove={eventToRemove => {
                                if (!('id' in eventToRemove)) {
                                    return
                                }

                                onUpdateSelection(selection.filter(event => 'id' in event && event.id !== eventToRemove.id))
                            }} />
                    )}
                </PinchZoomProvider>
            </g>
        </svg>

    )
}