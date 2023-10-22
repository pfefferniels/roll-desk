import { Thing } from "@inrupt/solid-client"

interface RollNodeProps {
    x: number 
    y: number 
    thing: Thing
}

export const RollNode = ({ x, y, thing }: RollNodeProps) => {
    return (
        <circle cx={x} cy={y} r={30} fill='red' fill-opacity={0.5}>
            <text>Title: ...</text>
        </circle>
    )
}
