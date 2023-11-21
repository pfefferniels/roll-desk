import { Thing, asUrl, getStringNoLocale, removeThing, saveSolidDatasetAt } from "@inrupt/solid-client"
import { crm } from "../../helpers/namespaces"
import { IconButton } from "@mui/material"
import { Add, Delete, Link, UploadFile } from "@mui/icons-material"
import { useContext, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RollCopyDialog } from "./dialogs/RollCopyDialog"
import { InterpretationDialog } from "./dialogs/InterpretationDialog"
import { DatasetContext, useSession } from "@inrupt/solid-ui-react"

interface RollNodeProps {
    x: number
    y: number
    thing: Thing
}

export const RollNode = ({ x, y, thing }: RollNodeProps) => {
    const navigate = useNavigate()
    const { solidDataset, setDataset } = useContext(DatasetContext)
    const { session } = useSession()

    const [rollCopyDialogOpen, setRollCopyDialogOpen] = useState(false)
    const [interpretationDialogOpen, setInterpretationDialogOpen] = useState(false)

    const remove = async () => {
        if (!solidDataset) return

        const modifiedDataset = removeThing(solidDataset, thing)
        setDataset(
            await saveSolidDatasetAt(asUrl(thing), modifiedDataset, { fetch: session.fetch as any })
        )
    }

    const title = getStringNoLocale(thing, crm('P102_has_title')) || '[no title]'
    const toolboxWidth = 250

    return (
        <g
            className='rollNode'
        >
            <circle
                cx={x}
                cy={y}
                r={100}
                fill='red'
                fillOpacity={0.2}
                onClick={() => navigate(`/roll?url=${encodeURIComponent(asUrl(thing))}`)}
            />
            <text x={x} y={y} fontSize={23} textAnchor="middle">{title}</text>
            <foreignObject x={x - (toolboxWidth / 2)} y={y + 5} width={toolboxWidth} height={50}>
                <div style={{ textAlign: 'center' }}>
                    <IconButton size="small" onClick={() => setInterpretationDialogOpen(true)} >
                        <Add />
                    </IconButton>

                    <IconButton size="small" onClick={() => setRollCopyDialogOpen(true)} >
                        <UploadFile />
                    </IconButton>

                    <IconButton size='small' onClick={() => window.open(asUrl(thing))}>
                        <Link />
                    </IconButton>

                    <IconButton size='small' onClick={remove}>
                        <Delete />
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
