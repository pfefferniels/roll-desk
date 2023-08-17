import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { useState, useContext, useEffect } from 'react';
import { Thing, UrlString, asUrl, getStringNoLocale, getThing, getThingAll, getUrl, getUrlAll, isThing } from '@inrupt/solid-client';
import { DatasetContext } from '@inrupt/solid-ui-react';
import { crm } from '../../helpers/namespaces';
import { RDFS } from '@inrupt/vocab-common-rdf';

interface SelectEntityProps {
    title: string
    type: string
    secondaryType?: string
    onSelect: (url: UrlString) => void
}

interface GroupedEntity {
    label: string,
    items: Thing[]
}

export const SelectEntity = ({ title, type, secondaryType, onSelect }: SelectEntityProps) => {
    const { solidDataset: worksDataset } = useContext(DatasetContext)
    const [entities, setEntities] = useState<(GroupedEntity | Thing)[]>()

    useEffect(() => {
        if (!worksDataset) return

        const entities = getThingAll(worksDataset)
            .filter(thing => getUrlAll(thing, crm('P2_has_type')).includes(type))

        if (secondaryType) {
            setEntities(entities.map(entity => {
                const digitalScoreUrls = getUrlAll(entity, secondaryType)

                return {
                    label: getUrl(entity, crm('P102_has_title')) || getUrl(entity, RDFS.label) || '',
                    items:
                        digitalScoreUrls.reduce((acc, currentUrl) => {
                            const digitalScore = getThing(worksDataset, currentUrl)
                            if (digitalScore) acc.push(digitalScore)
                            return acc
                        }, [] as Thing[])
                } as GroupedEntity
            }))
        }
        else {
            setEntities(entities)
        }
    }, [worksDataset, type, secondaryType])

    return (
        <div>
            <FormControl sx={{ m: 1, minWidth: 250 }}>
                <InputLabel htmlFor="grouped-select">{title}</InputLabel>
                <Select
                    defaultValue=""
                    id="grouped-select"
                    label="Grouping"
                    onChange={e => {
                        onSelect(e.target.value)
                    }}
                >
                    {entities?.map((entity) => (
                        isThing(entity)
                            ? <MenuItem value={asUrl(entity)}>
                                {getStringNoLocale(entity, crm('P102_has_title')) || asUrl(entity)}
                            </MenuItem>
                            : [
                                <ListSubheader>{entity.label}</ListSubheader>,
                                entity.items.map(item => (
                                    <MenuItem value={asUrl(item)}>{getStringNoLocale(item, crm('P102_has_title')) || asUrl(item)}</MenuItem>
                                ))
                            ]
                    ))}
                </Select>
            </FormControl>
        </div>
    );
}
