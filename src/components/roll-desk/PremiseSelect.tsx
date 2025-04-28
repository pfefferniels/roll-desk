import { FormControl, FormLabel, Select, SelectChangeEvent, MenuItem } from "@mui/material"
import { AnyEditorialAssumption, Edit } from "linked-rolls"
import { titleFor } from "./AssumptionList"

interface PremiseSelectProps {
    existingPremises: AnyEditorialAssumption[]
    premises: AnyEditorialAssumption[]
    onChange: (premises: AnyEditorialAssumption[]) => void
}

export const PremiseSelect = ({ existingPremises, premises, onChange }: PremiseSelectProps) => {
    const startOfEdit = (edit: Edit) => {
        const allEvents = [...(edit.insert || []), ...(edit.delete || [])]
        return Math.min(...allEvents
            .filter(e => e.wasCollatedFrom.length > 0)
            .map(e => e.wasCollatedFrom[0].horizontal.from)
        )
    }

    existingPremises.sort((a, b) => {
        if (a.type === 'edit' && b.type === 'edit') {
            return startOfEdit(a) - startOfEdit(b)
        }
        return 0
    })

    return (
        <FormControl>
            <FormLabel>Premises</FormLabel>
            <Select
                multiple
                label='Witnesses'
                value={premises.map(p => p.id)}
                onChange={(event: SelectChangeEvent<string[]>) => {
                    const value = event.target.value
                    const newPremiseIds = typeof value === 'string'
                        ? value.split(',')
                        : value
                    onChange(newPremiseIds.map(id => existingPremises.find(p => p.id === id)!))
                }}
            >
                {existingPremises.map(premise => {
                    return (
                        <MenuItem key={premise.id} value={premise.id}>
                            [{premise.id.slice(0, 8)}] {titleFor(premise)}
                            {premise.type === 'edit' && (
                                <span>
                                    {' '}({premise.motivation})
                                    {' '}@{startOfEdit(premise)} mm
                                </span>
                            )}
                        </MenuItem>
                    )
                })}
            </Select>
        </FormControl>
    )
}
