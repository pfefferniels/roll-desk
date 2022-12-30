import { getStringNoLocale, getThingAll, getUrl, getUrlAll, Thing } from "@inrupt/solid-client"
import { useDataset } from "@inrupt/solid-ui-react"
import { RDF, RDFS } from "@inrupt/vocab-common-rdf"
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemButton, ListItemText, TextField, Typography } from "@mui/material"
import { useEffect, useState } from "react"


interface FindEntityProps {
    onFound: (foundThing: Thing) => void
    onClose: () => void
    type: string
    open: boolean
}

/**
 * A dialog which allows finding a particular entity (`Thing`) in the 
 * graph. When the user selected an entity, `onFound` will be called.
 */
export const FindEntity = ({ open, onClose, type, onFound }: FindEntityProps) => {
    const { dataset } = useDataset()

    const [filteredThings, setFilteredThings] = useState<Thing[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
        if (!dataset) return

        // filter by type
        const filtered = []
        const all = getThingAll(dataset)
        for (const thing of all) {
            const types = getUrlAll(thing, RDF.type)
            if (types.includes(type)) {
                filtered.push(thing)
            }
        }
        setFilteredThings(filtered)
    }, [dataset, type])

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>
                Find Entity
            </DialogTitle>
            <DialogContent>
                <Typography>
                    Searching for entities of type {type}
                </Typography>
                <TextField placeholder="Filter by label" />

                <List>
                    {filteredThings.map((thing, i) => (
                        <ListItemButton
                            selected={selectedIndex === i}
                            onClick={() => setSelectedIndex(i)}
                            key={thing.url}>
                            <ListItemText>
                                {getStringNoLocale(thing, RDFS.label) ||
                                    getUrl(thing, RDFS.label)}
                            </ListItemText>
                        </ListItemButton>
                    ))}
                </List>
            </DialogContent>
            <DialogActions>
                <Button color='secondary' onClick={onClose}>Cancel</Button>
                <Button color='primary' onClick={() => {
                    onFound(filteredThings[selectedIndex])
                    onClose()
                }}>Select</Button>
            </DialogActions>
        </Dialog>
    )
}