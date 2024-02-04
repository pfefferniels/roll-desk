interface RollGridProps {
    width: number
}

export const RollGrid = ({ width }: RollGridProps) => {
    const lines = []
    for (let i=0; i<100; i++) {
        lines.push(
            <line key={`gridLine_${i}`} x1={0} x2={width} y1={i*5+2.5} y2={i*5+2.5} stroke='black' strokeWidth={0.05} />
        )
    }

    return <>{lines}</>
}
