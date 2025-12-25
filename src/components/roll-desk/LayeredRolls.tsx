import { useRef } from "react"
import { Glow } from "./Glow"
import { PatchPattern } from "./PatchPattern"
import { SelectionFilter } from "./Selection"
import { Spray } from "./Spray"

interface CanvasProps {
    children: React.ReactNode
}

export const Canvas = ({
    children
}: CanvasProps
) => {
    const svgRef = useRef<SVGGElement>(null)

    const margin = 100

    return (
        <svg width="100000" height={6 * 100 + margin * 2}>
            <g transform={`translate(0 ${margin})`}>
                <Glow />
                <PatchPattern />
                <Spray />

                <g ref={svgRef}>
                    {children}

                    {svgRef.current && (
                        <SelectionFilter />
                    )}
                </g>
            </g>
        </svg>

    )
}