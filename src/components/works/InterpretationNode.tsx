import { Thing, asUrl, getStringNoLocale } from "@inrupt/solid-client"
import { crm } from "../../helpers/namespaces"
import { IconButton } from "@mui/material"
import { AlignHorizontalCenter, Link } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"

interface InterpretationNodeProps {
    x: number
    y: number
    thing: Thing
}

export const InterpretationNode = ({ x, y, thing }: InterpretationNodeProps) => {
    const navigate = useNavigate()
    const title = getStringNoLocale(thing, crm('P102_has_title')) || '[no title]'

    return (
        <g>
            <circle
                cx={x}
                cy={y}
                r={80}
                fill='orange'
                fillOpacity={0.5}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/interpretation?url=${encodeURIComponent(asUrl(thing))}`)}
            />
            <text x={x} y={y} fontSize={16} textAnchor="middle">{title}</text>
            <foreignObject x={x - 50} y={y + 5} width={100} height={50}>
                <div>
                    <IconButton size="small" onClick={() => navigate(`/align?url=${encodeURIComponent(asUrl(thing))}`)}
                    >
                        <AlignHorizontalCenter />
                    </IconButton>
                    <IconButton size="small" onClick={() => window.open(asUrl(thing))}>
                        <Link />
                    </IconButton>
                </div>
            </foreignObject>
        </g >
    )
}
