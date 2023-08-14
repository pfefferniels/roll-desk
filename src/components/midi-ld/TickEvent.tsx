import { Thing, asUrl, getInteger, getUrl } from "@inrupt/solid-client"
import { useNoteContext } from "../../providers/NoteContext"
import { crm, midi } from "../../helpers/namespaces"
import { Boundary } from "./Boundary"
import { useState } from "react"

interface TickEventProps {
    event: Thing // can be anything with midi:absoluteTick
}

export const TickEvent = ({ event }: TickEventProps) => {
    const { pixelsPerTick, noteHeight, selectedEvent, onSelect, e13s, onChange } = useNoteContext()

    const [hovered, setHovered] = useState(false)

    const position = getInteger(event, midi('absoluteTick')) || 0
    const pitch = getInteger(event, midi('pitch')) || 0

    const relatedE13 = e13s?.find(e13 =>
        getUrl(e13, crm('P140_assigned_attribute_to')) === asUrl(event) &&
        getUrl(e13, crm('P177_assigned_property_of_type')) === midi('absoluteTick'))

    return (
        <>
            {hovered && (
                <line
                    className='orientationLine'
                    transform={`translate(${position * pixelsPerTick},0)`}
                    x1={0}
                    y1={1000}
                    x2={0}
                    y2={0}
                    stroke='black'
                    strokeWidth={0.6}
                    onClick={() => onSelect(event)} />
            )}

            <line
                className='tick'
                transform={`translate(${position * pixelsPerTick},0)`}
                x1={0}
                y1={(128 - pitch) * noteHeight}
                x2={0}
                y2={(128 - pitch) * noteHeight + noteHeight}
                stroke='black'
                strokeWidth={1.3}
                strokeOpacity={(hovered || selectedEvent === event) ? 1 : 0.5}
                onClick={() => onSelect(event)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)} />

            {relatedE13 && (
                <Boundary
                    key={`boundary_${asUrl(relatedE13)}`}
                    e13={relatedE13}
                    pitch={pitch}
                    onChange={(updatedE13) => onChange && onChange(updatedE13)}
                />
            )}

        </>
    )
}