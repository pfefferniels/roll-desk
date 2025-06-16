import { useRef } from "react"
import { Glow } from "./Glow"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { StageView } from "./StageView"
import { Edition, Stage } from "linked-rolls"
import { CopyFacsimile } from "./CopyFacsimile"
import { PatchPattern } from "./PatchPattern"
import { Layer } from "./StackList"
import { UserSelection } from "./RollDesk"
import { SelectionFilter } from "./Selection"

interface LayeredRollsProps {
    edition: Edition
    stack: Layer[]
    active?: Layer
    currentStage?: Stage
    selection: UserSelection[]
    onAddToSelection: (newSelection: UserSelection) => void
    onRemoveFromSelection: (eventToRemove: UserSelection) => void
    fixedX: number
    setFixedX: (fixedX: number) => void
}

export const LayeredRolls = ({
    stack,
    active,
    currentStage,
    edition,
    selection,
    onAddToSelection,
    onRemoveFromSelection,
    fixedX,
    setFixedX }: LayeredRollsProps
) => {
    const { zoom } = usePinchZoom()
    const svgRef = useRef<SVGGElement>(null)

    // makes sure that the active layer comes last
    const orderedLayers = [...stack].reverse()

    if (active) {
        orderedLayers.splice(orderedLayers.indexOf(active), 1)
        orderedLayers.push(active)
    }

    const margin = 140

    console.log('svg ref current', svgRef.current)

    return (
        <svg width="100000" height={6 * 100 + margin * 2}>
            <g transform={`translate(0 ${margin})`}>
                <Glow />
                <PatchPattern />

                <g ref={svgRef}>
                    {orderedLayers
                        .map((stackItem, i) => {
                            if (stackItem.opacity === 0) return null

                            return (
                                <CopyFacsimile
                                    key={`copy_${i}`}
                                    copy={stackItem.copy}
                                    position={i}
                                    color={stackItem.color}
                                    facsimileOpacity={stackItem.opacity}
                                    onClick={onAddToSelection}
                                    onSelectionDone={dimension => onAddToSelection({
                                        ...dimension
                                    })}
                                    fixedX={fixedX}
                                    setFixedX={setFixedX}
                                />
                            )
                        })}
                    {currentStage && (
                        <StageView
                            onClick={onAddToSelection}
                            stage={currentStage}
                        />
                    )}
                    {svgRef.current && (
                        <SelectionFilter
                            items={selection}
                            remove={onRemoveFromSelection} />
                    )}
                </g>
            </g>
        </svg>

    )
}