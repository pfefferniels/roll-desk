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
    stack: Layer[]
    active?: Layer
    currentStage?: Stage
    selection: UserSelection[]
    onChangeSelection: (userSelection: UserSelection[]) => void
}

export const LayeredRolls = ({
    stack,
    active,
    currentStage,
    selection,
    onChangeSelection
}: LayeredRollsProps
) => {
    const { zoom } = usePinchZoom()
    const svgRef = useRef<SVGGElement>(null)

    // makes sure that the active layer comes last
    const orderedLayers = [...stack].reverse()

    if (active) {
        orderedLayers.splice(orderedLayers.indexOf(active), 1)
        orderedLayers.push(active)
    }

    const onAddToSelection = (item: UserSelection) => {
        onChangeSelection([...selection, item])
    }

    const onRemoveFromSelection = (item: UserSelection) => {
        onChangeSelection([...selection.filter(x => x !== item)])
    }

    const margin = 100

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
                                    active={stackItem.copy === active?.copy}
                                    color={stackItem.color}
                                    facsimileOpacity={stackItem.opacity}
                                    onClick={onAddToSelection}
                                    onSelectionDone={dimension => onChangeSelection([{
                                        ...dimension
                                    }])}
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
                            remove={onRemoveFromSelection}
                        />
                    )}
                </g>
            </g>
        </svg>

    )
}