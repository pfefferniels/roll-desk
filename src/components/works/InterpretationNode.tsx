import { Thing, asUrl, getStringNoLocale } from "@inrupt/solid-client"
import { crm } from "../../helpers/namespaces"
import { Button, IconButton } from "@mui/material"
import { Edit, Link } from "@mui/icons-material"

interface InterpretationNodeProps {
    x: number
    y: number
    thing: Thing
}

export const InterpretationNode = ({ x, y, thing }: InterpretationNodeProps) => {
    const title = getStringNoLocale(thing, crm('P102_has_title')) || '[no title]'

    return (
        <g>
            <circle cx={x} cy={y} r={60} fill='orange' fill-opacity={0.5} />
            <text x={x} y={y} fontSize={13} textAnchor="middle">{title}</text>
            <foreignObject x={x - 50} y={y + 5} width={100} height={50}>
                <div>
                    <IconButton size="small">
                        {/*Align/Edit MEI*/}
                        <Edit />
                    </IconButton>

                    <IconButton size="small" onClick={() => window.open(asUrl(thing))}>
                        <Link />
                    </IconButton>
                </div>
            </foreignObject>
        </g >
    )
}
