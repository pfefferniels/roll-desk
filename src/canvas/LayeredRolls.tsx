import { RefObject, useState } from "react"
import { usePinchZoom } from "./usePinchZoom"
import { Glow } from "./Glow"
import { PatchPattern } from "./PatchPattern"
import { Ruler } from "./Ruler"
import { SelectionFilter } from "./Selection"
import { Spray } from "./Spray"
import { TopLayer } from "./OnTop"

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
    const { translateX, rollLength, height, room, viewport } = usePinchZoom()
    const [topLayer, setTopLayer] = useState<SVGGElement | null>(null)

    const margin = 100

    // Room after the end of the roll to bring what stands there to the
    // middle of the view, as a link to it does, clear of the panel that
    // lies over the right of the desk.
    const after = Math.max(margin, (viewport?.clientWidth ?? 0) / 2)

    return (
        <svg width={translateX(rollLength) + after} height={room.above + height + room.below + margin * 2}>
            <g transform={`translate(0 ${margin + room.above})`}>
                <Glow />
                <PatchPattern />
                <Spray />

                <g className='zoomStage' ref={stageRef}>
                    <TopLayer.Provider value={topLayer}>
                        {children}
                    </TopLayer.Provider>

                    <Ruler />

                    <SelectionFilter />

                    <g className='topLayer' ref={setTopLayer} />
                </g>
            </g>
        </svg>

    )
}
