import { Thing, asUrl, getInteger, getUrl } from "@inrupt/solid-client"
import { crm, midi } from "../../helpers/namespaces";
import { useNoteContext } from "../../providers/NoteContext";
import './Pedal.css'

interface PedalProps {
    pedal: Thing
}

export const Pedal = ({ pedal }: PedalProps) => {
    const { pixelsPerTick, noteHeight, selectedEvent, onSelect, onChange, e13s } = useNoteContext()

    const tick = getInteger(pedal, midi('absoluteTick')) || 0
    const velocity = getInteger(pedal, midi('value')) || 0

    const handleClick = () => {
        onSelect(pedal)
    };

    const valueE13s = e13s?.filter(e13 =>
        getUrl(e13, crm('P140_assigned_attribute_to')) === asUrl(pedal)
        && getUrl(e13, crm('P177_assigned_property_of_type')) || midi('value'))

    return (
        <g onClick={handleClick}>
            <line
                x1={tick * pixelsPerTick}
                x2={tick * pixelsPerTick}
                y1={10 * noteHeight}
                y2={120 * noteHeight}
                strokeWidth={selectedEvent === pedal ? 3 : 3}
                className='pedalLine'
            />
            <line
                x1={tick * pixelsPerTick}
                x2={tick * pixelsPerTick + (velocity === 0 ? -30 : 30)}
                y1={10 * noteHeight}
                y2={10 * noteHeight}
                stroke='orange'
                strokeWidth={selectedEvent === pedal ? 3 : 3}
            />
        </g>
    );
};

