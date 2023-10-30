import { Thing, asUrl, getStringNoLocale } from "@inrupt/solid-client"
import { crm } from "../../helpers/namespaces"
import { IconButton } from "@mui/material"
import { Add, Link, UploadFile } from "@mui/icons-material"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { RollCopyDialog } from "./dialogs/RollCopyDialog"
import { InterpretationDialog } from "./dialogs/InterpretationDialog"

interface RollNodeProps {
    x: number
    y: number
    thing: Thing
}

export const RollNode = ({ x, y, thing }: RollNodeProps) => {
    const navigate = useNavigate()

    const [rollCopyDialogOpen, setRollCopyDialogOpen] = useState(false)
    const [interpretationDialogOpen, setInterpretationDialogOpen] = useState(false)

    const title = getStringNoLocale(thing, crm('P102_has_title')) || '[no title]'

    return (
        <g
            className='rollNode'
        >
            <circle
                cx={x}
                cy={y}
                r={50}
                fill='red'
                fillOpacity={0.2}
                onClick={() => navigate(`/roll?url=${encodeURIComponent(asUrl(thing))}`)}
            />
            <text x={x} y={y} fontSize={13} textAnchor="middle">{title}</text>
            <foreignObject x={x - 50} y={y + 5} width={200} height={50}>
                <div>
                    <IconButton size="small" onClick={() => setInterpretationDialogOpen(true)} >
                        <Add />
                    </IconButton>

                    <IconButton size="small" onClick={() => setRollCopyDialogOpen(true)} >
                        <UploadFile />
                    </IconButton>

                    <IconButton onClick={() => window.open(asUrl(thing))}>
                        <Link />
                    </IconButton>
                </div>

                <RollCopyDialog
                    open={rollCopyDialogOpen}
                    onClose={() => setRollCopyDialogOpen(false)}
                    attachTo={thing} />

                <InterpretationDialog
                    open={interpretationDialogOpen}
                    onClose={() => setInterpretationDialogOpen(false)}
                    attachToRoll={thing} />
            </foreignObject>
        </g>
    )
}
