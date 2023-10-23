import { Thing, getStringNoLocale } from "@inrupt/solid-client"
import { crm } from "../../helpers/namespaces"
import { IconButton } from "@mui/material"
import { AddOutlined, Remove } from "@mui/icons-material"
import { useState } from "react"
import { InterpretationDialog } from "./dialogs/InterpretationDialog"

interface RollNodeProps {
    x: number
    y: number
    thing: Thing
}

export const RollNode = ({ x, y, thing }: RollNodeProps) => {
    const [interpretationDialogOpen, setInterpretationDialogOpen] = useState(false)

    const title = getStringNoLocale(thing, crm('P102_has_title')) || '[no title]'

    return (
        <g className='rollNode'>
            <circle cx={x} cy={y} r={50} fill='red' fill-opacity={0.2} />
            <text x={x} y={y} fontSize={13} textAnchor="middle">{title}</text>
            <foreignObject x={x - 50} y={y + 5} width={100} height={50}>
                <div>
                    <IconButton size="small">
                        <AddOutlined onClick={() => setInterpretationDialogOpen(true)} />
                    </IconButton>

                    <IconButton size="small">
                        <Remove />
                    </IconButton>
                </div>

                <InterpretationDialog
                    open={interpretationDialogOpen}
                    onClose={() => setInterpretationDialogOpen(false)}
                    attachToRoll={thing} />
            </foreignObject>
        </g>
    )
}
