import { Thing, getStringNoLocale } from "@inrupt/solid-client"
import { crm } from "../../helpers/namespaces"
import { IconButton } from "@mui/material"
import { AddOutlined, Remove } from "@mui/icons-material"

interface RollNodeProps {
    x: number
    y: number
    thing: Thing
}

export const RollNode = ({ x, y, thing }: RollNodeProps) => {
    return (
        <g className='rollNode'>
            <circle cx={x} cy={y} r={50} fill='red' fill-opacity={0.2} />
            <text x={x} y={y} fontSize={13} textAnchor="middle">{getStringNoLocale(thing, crm('P102_has_title'))}</text>
            <foreignObject x={x - 50} y={y + 5} width={100} height={50}>
                <div>
                    <IconButton size="small">
                        <AddOutlined />
                    </IconButton>

                    <IconButton size="small">
                        <Remove />
                    </IconButton>
                </div>
            </foreignObject>
        </g>
    )
}
