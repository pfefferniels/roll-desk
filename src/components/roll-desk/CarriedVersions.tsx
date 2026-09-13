import { Delete } from "@mui/icons-material"
import { Button, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material"
import { certainties, Certainty, clearCarriage, idOf, stateCarriage } from "linked-rolls"
import { useContext, useState } from "react"
import { v4 } from "uuid"
import { EditionContext } from "../../providers/EditionContext"
import { Arguable } from "./Arguable"

/**
 * The versions a copy is held to carry where its features are not read
 * into symbols, each under its belief. The reasons go on the belief once
 * the statement is made.
 */
export const CarriedVersions = ({ copyId }: { copyId: string }) => {
    const { edition, view, apply } = useContext(EditionContext)
    const [versionId, setVersionId] = useState('')
    const [certainty, setCertainty] = useState<Certainty>('likely')

    const copy = edition?.copies.find(candidate => candidate.id === copyId)
    if (!edition || !view || !copy) return null

    const statements = copy.carries ?? []
    const sigilOf = (id: string) => edition.versions.find(version => version.id === id)?.siglum ?? 'unknown'
    const unstated = edition.versions.filter(version => !statements.some(statement => idOf(statement) === version.id))
    const copyPath = view.getPath(copyId) ?? []

    return (
        <Stack spacing={1}>
            <Typography>Versions It Carries</Typography>
            {statements.map((statement, index) => (
                <Stack direction='row' alignItems='center' spacing={1} key={idOf(statement)}>
                    <Arguable path={[...copyPath, 'carries', index]}>
                        <span>{sigilOf(idOf(statement))}</span>
                    </Arguable>
                    <IconButton size='small' onClick={() => apply(clearCarriage(copyId, idOf(statement)))}>
                        <Delete fontSize='small' />
                    </IconButton>
                </Stack>
            ))}
            <Stack direction='row' spacing={1} alignItems='center'>
                <TextField
                    select
                    size='small'
                    label='Version'
                    value={versionId}
                    onChange={event => setVersionId(event.target.value)}
                    sx={{ minWidth: 120 }}
                >
                    {unstated.map(version => (
                        <MenuItem key={version.id} value={version.id}>{version.siglum}</MenuItem>
                    ))}
                </TextField>
                <TextField
                    select
                    size='small'
                    label='Held to be'
                    value={certainty}
                    onChange={event => setCertainty(event.target.value as Certainty)}
                    sx={{ minWidth: 120 }}
                >
                    {certainties.map(value => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                    ))}
                </TextField>
                <Button
                    size='small'
                    disabled={!versionId}
                    onClick={() => {
                        apply(stateCarriage(copyId, versionId, { type: 'belief', id: v4(), certainty, reasons: [] }))
                        setVersionId('')
                    }}
                >
                    State
                </Button>
            </Stack>
            <Typography variant='caption' color='text.secondary'>
                Only for a copy whose features are not read into symbols, such as one known from a
                recording. A copy with holes says by its features what it carries.
            </Typography>
        </Stack>
    )
}
