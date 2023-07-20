import { Thing, addUrl, getSourceUrl, getThing, getUrlAll, saveSolidDatasetAt, setThing } from "@inrupt/solid-client"
import { Box, Button, Stack } from "@mui/material"
import { CreateInterpolationDialog } from "./CreateInterpolationDialog"
import { useContext, useState } from "react"
import { crm } from "../../helpers/namespaces"
import { DatasetContext, useSession } from "@inrupt/solid-ui-react"
import { CreationItem } from "./CreationItem"

interface CreationListProps {
    expressionCreation: Thing
    onChange: (mpm: string) => void
}

export const CreationList = ({ expressionCreation, onChange }: CreationListProps) => {
    const { session } = useSession()
    const { solidDataset: dataset, setDataset } = useContext(DatasetContext)

    const [interpolationDialogOpen, setInterpolationDialogOpen] = useState(false)

    const handleDone = async (execution: Thing, mpm: string) => {
        const modifiedCreation =
            addUrl(expressionCreation, crm('P9_consists_of'), execution)

        if (!dataset) return
        let modifiedDataset = setThing(dataset, execution)
        modifiedDataset = setThing(modifiedDataset, modifiedCreation)

        setDataset(
            await saveSolidDatasetAt(getSourceUrl(dataset)!, modifiedDataset, { fetch: session.fetch as any })
        )
        onChange(mpm)
    }

    const eventUrls = getUrlAll(expressionCreation, crm('P9_consists_of'))

    return (
        <Box>
            <Stack spacing={2}>
                {dataset && eventUrls.map((url, i) => {
                    const event = getThing(dataset, url)

                    return event ? (
                        <CreationItem
                            item={event}
                            key={`event_${i}`} />
                    ) : null
                }
                )}
            </Stack>

            <Box mt={1}>
                <Button
                    variant="contained"
                    onClick={() => setInterpolationDialogOpen(true)}>
                    Perform Interpolation
                </Button>

                <Button>
                    Add Manual Event
                </Button>
            </Box>

            <CreateInterpolationDialog
                open={interpolationDialogOpen}
                onClose={() => setInterpolationDialogOpen(false)}
                onCreate={handleDone} />
        </Box>
    )
}
