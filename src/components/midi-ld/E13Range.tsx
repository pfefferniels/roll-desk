import { Thing, getInteger, getSolidDataset, getThing, getUrl, saveSolidDatasetAt, setInteger, setThing } from "@inrupt/solid-client"
import { Stack, TextField } from "@mui/material"
import { crm, mer } from "../../helpers/namespaces"
import { useEffect, useState } from "react"
import { useSession } from "@inrupt/solid-ui-react"

interface E13RangeProps {
    e13: Thing
    onChange: (updatedE13: Thing) => void
}

export const E13Range = ({ e13, onChange }: E13RangeProps) => {
    const { session } = useSession()
    const [range, setRange] = useState<Thing | null>()

    const rangeUrl = getUrl(e13, crm('P141_assigned'))

    const changeRange = (prop: 'min' | 'mean' | 'max') => {
        return async (newValue: number) => {
            if (!range || !rangeUrl) return

            const updatedRange = setInteger(range, mer(prop), newValue)
            setRange(updatedRange)

            const dataset = await getSolidDataset(rangeUrl, { fetch: session.fetch as any })
            const updatedDataset = setThing(dataset, updatedRange)
            saveSolidDatasetAt(rangeUrl, updatedDataset, { fetch: session.fetch as any })
            onChange(e13)
        }
    }

    useEffect(() => {
        const fetchRange = async () => {
            if (!rangeUrl) return

            const dataset = await getSolidDataset(rangeUrl, { fetch: session.fetch as any })
            if (dataset) {
                const rangeThing = getThing(dataset, rangeUrl)
                if (!rangeThing) return

                setRange(rangeThing)
            }
        }

        fetchRange()
    }, [rangeUrl, session.fetch])

    const min = (range && getInteger(range, mer('min'))) || 0
    const max = range && getInteger(range, mer('max')) || 0
    const mean = (range && getInteger(range, mer('mean'))) || 0

    return (
        <Stack direction='row'>
            <TextField
                label='min'
                type='number'
                value={min}
                onChange={e => changeRange('min')(+e.target.value)} />
            <TextField
                label='mean'
                type='number'
                value={mean}
                onChange={e => changeRange('mean')(+e.target.value)} />
            <TextField
                label='max'
                type='number'
                value={max}
                onChange={e => changeRange('max')(+e.target.value)} />
        </Stack>
    )

}