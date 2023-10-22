import { Thing } from "@inrupt/solid-client"

interface InterpretationNodeProps {
    x: number 
    y: number 
    thing: Thing
}

export const InterpretationNode = ({ x, y, thing }: InterpretationNodeProps) => {
    return (
        <circle cx={x} cy={y} r={30} fill='red' fill-opacity={0.5}>
            <text>Title: ...</text>
        </circle>
    )
}
