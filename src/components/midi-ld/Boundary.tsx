import { useCallback, useEffect, useRef, useState } from 'react';
import { useNoteContext } from '../../providers/NoteContext';
import { Thing, buildThing, getInteger, getUrl, setUrl } from '@inrupt/solid-client';
import { crm } from '../../helpers/namespaces';
import * as d3 from 'd3'
import { DCTERMS } from '@inrupt/vocab-common-rdf';
import './Boundary.css'

interface BoundaryProps {
    e13: Thing
    pitch: number;
    onChange: (updatedE13: Thing) => void;
}

export const Boundary = ({ e13, pitch, onChange }: BoundaryProps) => {
    const { pixelsPerTick, noteHeight } = useNoteContext()

    const propertyType = getUrl(e13, crm('P177_assigned_property_of_type'))
    const bracket = propertyType?.includes('begin_of') ? 'open' : 'close'
    const ticks = getInteger(e13, crm('P141_assigned')) || 0
    const bracketLength = 2.5; // Length of the horizontal lines for brackets

    const handleChange = useCallback((updatedTicks: number) => {
        const newThing = buildThing(e13)
        newThing.setInteger(crm('P141_assigned'), Math.round(updatedTicks))
        newThing.setDate(DCTERMS.modified, new Date(Date.now()))
        onChange(newThing.build())
    }, [e13, onChange])

    const ref = useRef<SVGGElement | null>(null);

    const [position, setPosition] = useState(ticks * pixelsPerTick);

    useEffect(() => {
        setPosition(ticks * pixelsPerTick);
    }, [ticks, pixelsPerTick])

    useEffect(() => {
        ref.current && d3.select(ref.current)
            .call(
                (d3.drag()
                    .on("drag", (event: any) => setPosition(event.x))
                    .on("end", (event: any) => handleChange(event.x / pixelsPerTick))) as any
            );
    }, [pixelsPerTick, handleChange]);

    return (
        <g className='boundary' ref={ref} transform={`translate(${position},0)`}>
            <line // Vertical line for the beginning
                x1={0}
                y1={(128 - pitch) * noteHeight}
                x2={0}
                y2={(128 - pitch) * noteHeight + noteHeight}
                stroke='black'
                strokeLinecap='round'
                strokeWidth={1.5}
            />
            <line // Top horizontal line
                x1={0}
                y1={(128 - pitch) * noteHeight}
                x2={bracket === 'open' ? bracketLength : -bracketLength}
                y2={(128 - pitch) * noteHeight}
                stroke='black'
                strokeLinecap='round'
                strokeWidth={1.5}
            />
            <line // Bottom horizontal line
                x1={0}
                y1={(128 - pitch) * noteHeight + noteHeight}
                x2={bracket === 'open' ? bracketLength : -bracketLength}
                y2={(128 - pitch) * noteHeight + noteHeight}
                stroke='black'
                strokeLinecap='round'
                strokeWidth={1.5}
            />
        </g>
    );
};