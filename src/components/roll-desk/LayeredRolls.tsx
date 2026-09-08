import { RefObject } from "react"
import { usePinchZoom } from "../../hooks/usePinchZoom"
import { Glow } from "./Glow"
import { PatchPattern } from "./PatchPattern"
import { Ruler } from "./Ruler"
import { SelectionFilter } from "./Selection"
import { Spray } from "./Spray"

interface CanvasProps {
    /** The group a running zoom gesture scales, see `useLiveZoom`. */
    stageRef?: RefObject<SVGGElement | null>
    children: React.ReactNode
}

export const Canvas = ({
    stageRef,
    children
}: CanvasProps
) => {
    const { translateX, rollLength } = usePinchZoom()

    const margin = 100

    return (
        <svg width={translateX(rollLength) + margin} height={6 * 100 + margin * 2}>
            <g transform={`translate(0 ${margin})`}>
                <Glow />
                <PatchPattern />
                <Spray />

                <g className='zoomStage' ref={stageRef}>
                    {children}

                    <Ruler />

                    <SelectionFilter />
                </g>
            </g>
        </svg>

    )
}
