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

/** The velocity range the dynamics curves are drawn over, which they need room for below the bar. */
const DYNAMICS_HEIGHT = 127

export const Canvas = ({
    stageRef,
    children
}: CanvasProps
) => {
    const { translateX, rollLength, height } = usePinchZoom()

    const margin = 100

    return (
        <svg width={translateX(rollLength) + margin} height={height + DYNAMICS_HEIGHT + margin * 2}>
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
