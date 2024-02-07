import { Thing, asUrl, getSolidDataset, getSourceUrl, getStringNoLocale, getThing, getUrl, getUrlAll, removeThing, saveSolidDatasetAt } from "@inrupt/solid-client"
import { crm, crmdig } from "../../helpers/namespaces"
import { IconButton } from "@mui/material"
import { AlignHorizontalCenter, Delete, Edit, Link } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { useContext, useEffect, useState } from "react"
import { DatasetContext, useSession } from "@inrupt/solid-ui-react"
import { InterpretationDialog } from "./dialogs/InterpretationDialog"
import { Cutout } from "linked-rolls/lib/.ldo/rollo.typings"

interface InterpretationNodeProps {
    x: number
    y: number
    size?: 'small'
    thing: Thing
}

export const InterpretationNode = ({ x, y, size, thing }: InterpretationNodeProps) => {
    const navigate = useNavigate()
    const { solidDataset, setDataset } = useContext(DatasetContext)
    const { session } = useSession()

    const [interpretationDialogOpen, setInterpretationDialogOpen] = useState(false)

    const remove = async () => {
        if (!solidDataset) return

        const modifiedDataset = removeThing(solidDataset, thing)
        setDataset(
            await saveSolidDatasetAt(asUrl(thing), modifiedDataset, { fetch: session.fetch as any })
        )
    }

    const cutoutUrl = getUrl(thing, crmdig('L43_annotates'))
    const title = getStringNoLocale(thing, crm('P102_has_title')) || '[no title]'
    const nodeWidth = size === 'small' ? 140 : 160

    return (
        <g>
            <circle
                cx={x}
                cy={y}
                r={nodeWidth / 2}
                fill='orange'
                fillOpacity={0.6}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/interpretation?url=${encodeURIComponent(asUrl(thing))}`)}
            />
            <defs>
                <filter x="0" y="0" width="1" height="1" id="solid">
                    <feFlood floodColor="white" floodOpacity="0.35" result="bg" />
                    <feMerge>
                        <feMergeNode in="bg" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            <text
                x={x}
                y={y}
                width={nodeWidth}
                fontSize={13}
                style={{ backgroundColor: 'white' }}
                filter="url(#solid)"
                textAnchor="middle">{title}</text>

            <foreignObject x={x - (nodeWidth / 2)} y={y + 5} width={nodeWidth} height={50}>
                <div style={{ textAlign: 'center' }}>
                    <IconButton size="small" onClick={() => navigate(`/align?url=${encodeURIComponent(asUrl(thing))}`)}
                    >
                        <AlignHorizontalCenter />
                    </IconButton>
                    <IconButton size="small" onClick={() => window.open(asUrl(thing))}>
                        <Link />
                    </IconButton>
                    <IconButton size="small" onClick={() => setInterpretationDialogOpen(true)}>
                        <Edit />
                    </IconButton>
                    <IconButton size='small' onClick={remove}>
                        <Delete />
                    </IconButton>
                </div>

                <InterpretationDialog
                    open={interpretationDialogOpen}
                    onClose={() => setInterpretationDialogOpen(false)}
                    interpretation={thing}
                    cutout={cutoutUrl || undefined} />
            </foreignObject>
        </g >
    )
}
