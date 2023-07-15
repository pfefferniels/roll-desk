import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { useState, useContext, useEffect } from 'react';
import { Thing, UrlString, asUrl, getThing, getThingAll, getUrl, getUrlAll } from '@inrupt/solid-client';
import { DatasetContext, useSession } from '@inrupt/solid-ui-react';
import { crm, mer } from '../../helpers/namespaces';
import { RDFS } from '@inrupt/vocab-common-rdf';

interface SelectScoreProps {
    onSelect: (scoreUrl: UrlString) => void
}

interface GroupedScore {
    label: string,
    scores: Thing[]
}

export const SelectScore = ({ onSelect }: SelectScoreProps) => {
    const { session } = useSession()
    const { solidDataset: worksDataset, setDataset: setWorksDataset } = useContext(DatasetContext)
    const [works, setWorks] = useState<GroupedScore[]>()

    useEffect(() => {
        if (!worksDataset) return

        const scoreWorks = getThingAll(worksDataset)
            .filter(thing => getUrlAll(thing, crm('P2_has_type')).includes(mer('ScoreWork')))

        setWorks(
            scoreWorks.map(scoreWork => {
                const digitalScoreUrls = getUrlAll(scoreWork, crm('R12_is_realized_in'))

                return {
                    label: getUrl(scoreWork, RDFS.label) || '',
                    scores:
                        digitalScoreUrls.reduce((acc, currentUrl) => {
                            const digitalScore = getThing(worksDataset, currentUrl)
                            if (digitalScore) acc.push(digitalScore)
                            return acc
                        }, [] as Thing[])
                }
            })
        )
    }, [worksDataset])

    return (
        <div>
            <FormControl sx={{ m: 1, minWidth: 250 }}>
                <InputLabel htmlFor="grouped-select">Select Score</InputLabel>
                <Select
                    defaultValue=""
                    id="grouped-select"
                    label="Grouping"
                    onChange={e => {
                        onSelect(e.target.value)
                    }}
                >
                    {works?.map((work) => ([
                        <ListSubheader>{work.label}</ListSubheader>,
                        work.scores.map(score => (
                            <MenuItem value={asUrl(score)}>{asUrl(score)}</MenuItem>
                        ))
                    ]
                    ))}
                </Select>
            </FormControl>
        </div>
    );
}
