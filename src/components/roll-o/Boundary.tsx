import { useEffect, useState } from 'react';
import { Thing, getInteger, getSolidDataset, getThing, getUrl, saveSolidDatasetAt, setInteger, setThing } from '@inrupt/solid-client';
import { crm, mer } from '../../helpers/namespaces';
import './Boundary.css'
import { Bracket } from './Bracket';
import { useSession } from '@inrupt/solid-ui-react';

interface BoundaryProps {
    e13: Thing
    pitch: number;
    onChange: (updatedE13: Thing) => void;
}

/** 
 * Represents a boundary range (min, mean, max) for a specific 
 * point in time (e.g. the onset or the offset of a note)
 */
export const Boundary = ({ e13, pitch, onChange }: BoundaryProps) => {
    const { session } = useSession()

    const [range, setRange] = useState<Thing | null>()
    const [min, setMin] = useState(0)
    const [mean, setMean] = useState(0)
    const [max, setMax] = useState(0)

    const rangeUrl = getUrl(e13, crm('P141_assigned'))

    useEffect(() => {
        const fetchRange = async () => {
            if (!rangeUrl) return

            const dataset = await getSolidDataset(rangeUrl, { fetch: session.fetch as any })
            if (dataset) {
                const rangeThing = getThing(dataset, rangeUrl)
                if (!rangeThing) return

                setMin(getInteger(rangeThing, mer('min')) || 0)
                setMean(getInteger(rangeThing, mer('mean')) || 0)
                setMax(getInteger(rangeThing, mer('max')) || 0)
                setRange(rangeThing)
            }
        }

        fetchRange()
    }, [rangeUrl, session.fetch])

    const changeRange = (prop: 'min' | 'mean' | 'max') => {
        return async (newValue: number) => {
            if (!range || !rangeUrl) return

            const updatedRange = setInteger(range, mer(prop), Math.round(newValue))
            setRange(updatedRange)

            const dataset = await getSolidDataset(rangeUrl, { fetch: session.fetch as any })
            const updatedDataset = setThing(dataset, updatedRange)
            saveSolidDatasetAt(rangeUrl, updatedDataset, { fetch: session.fetch as any })
            onChange(e13)
        }
    }

    return (
        <>
            <Bracket
                pitch={pitch}
                direction='open'
                position={min}
                onChange={setMin}
                onEnd={changeRange('min')} />

            <Bracket
                pitch={pitch}
                direction='straight'
                position={mean}
                onChange={setMean}
                onEnd={changeRange('mean')} />

            <Bracket
                pitch={pitch}
                direction='close'
                position={max}
                onChange={setMax}
                onEnd={changeRange('max')} />
        </>
    );
};