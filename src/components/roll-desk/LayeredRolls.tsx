import { useRef } from "react"
import { Glow } from "./Glow"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { VersionView } from "./VersionView"
import { Edition, Motivation, Version } from "linked-rolls"
import { CopyFacsimile } from "./CopyFacsimile"
import { PatchPattern } from "./PatchPattern"
import { Layer } from "./StackList"
import { UserSelection } from "./RollDesk"
import { SelectionFilter } from "./Selection"
import { MotivationView } from "./MotivationView"

interface LayeredRollsProps {
    stack: Layer[]
    active?: Layer
    currentVersion?: Version
    currentMotivation?: Motivation<string>
    selection: UserSelection[]
    onChangeSelection: (userSelection: UserSelection[]) => void
}

export const LayeredRolls = ({
    stack,
    active,
    currentVersion,
    currentMotivation,
    selection,
    onChangeSelection
}: LayeredRollsProps
) => {
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
                            if (stackItem.symbolOpacity === 0) return null

                            return (
                                <CopyFacsimile
                                    key={`copy_${i}`}
                                    copy={stackItem.copy}
                                    active={stackItem.copy === active?.copy}
                                    color={stackItem.color}
                                    facsimileOpacity={stackItem.facsimileOpacity}
                                    onClick={onAddToSelection}
                                    onChange={() => {}}
                                    onSelectionDone={dimension => onChangeSelection([{
                                        ...dimension
                                    }])}
                                />
                            )
                        })}

                    {currentVersion && (
                        <VersionView
                            onClick={onAddToSelection}
                            version={currentVersion}
                        />
                    )}

                    {currentMotivation && (
                        <MotivationView
                            motivation={currentMotivation}
                            onClick={onAddToSelection}
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