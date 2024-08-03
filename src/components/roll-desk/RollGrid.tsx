import { usePinchZoom } from "../../hooks/usePinchZoom.tsx"

interface RollGridProps {
    width: number
}

export const RollGrid = ({ width }: RollGridProps) => {
    const { trackHeight } = usePinchZoom()

    const lines = []
    for (let i = 0; i < 100; i++) {
        const y = i * trackHeight + trackHeight / 2
        lines.push(
            <line key={`gridLine_${i}`} x1={0} x2={width} y1={y} y2={y} stroke='black' strokeWidth={0.05} />
        )
    }

    return (
        <>
            <rect fill='white' fillOpacity={0.1} x={0} y={0} height={100 * trackHeight} width={width}></rect>
            {lines}
        </>
    )
}
