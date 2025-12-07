import { Button, DialogTitle, DialogContent, Dialog, DialogActions, TextField, Typography, Stack, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useEffect, useState } from "react";
import { FeatureCondition, GeneralRollCondition, PaperStretch } from "linked-rolls";
import { assignObject, ObjectAssumption } from "linked-rolls/lib/Assumption";

type ConditionMap = {
    roll: PaperStretch | GeneralRollCondition
    feature: FeatureCondition
}

const conditionTypes = {
    'roll': ['paper-stretch', 'general'] as const,
    'feature': ['missing-perforation', 'damaged-perforation', 'illegible'] as const,
} as const

interface ConditionStateProps<S extends keyof ConditionMap> {
    open: boolean
    subject: S
    condition?: ObjectAssumption<ConditionMap[S]>
    onClose: () => void
    onDone: (condition: ObjectAssumption<ConditionMap[S]>) => void
}

export function ConditionStateDialog<T extends keyof ConditionMap>({ open, subject, condition, onClose, onDone }: ConditionStateProps<T>) {
    const types = conditionTypes[subject]
    const [type, setType] = useState<typeof types[number]>(types[0])
    const [description, setDescription] = useState<string>()
    const [factor, setFactor] = useState<number>()

    useEffect(() => {
        if (!condition) return

        setType(condition.type)
        setDescription(condition.description)

        if (condition.type === 'paper-stretch') {
            setFactor(condition.factor)
        }
    }, [condition])

    const handleDone = async () => {
        if (!type) {
            console.error('Condition type is required');
            return;
        }

        const newCondition = {
            type,
            description: description || '',
            ...(type === 'paper-stretch' && factor !== undefined ? { factor } : {}),
        } as ConditionMap[T];

        onDone(assignObject(newCondition));
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Edit Condition</DialogTitle>
            <DialogContent>
                <Typography>Condition Type</Typography>
                <Stack direction="column" spacing={2}>
                    <FormControl size="small">
                        <InputLabel id="condition-type-label">Condition Type</InputLabel>
                        <Select
                            labelId="condition-type-label"
                            value={type}
                            onChange={e => setType(e.target.value as typeof types[number])}
                        >
                            {types.map(t => {
                                return (
                                    <MenuItem key={t} value={t}>
                                        {t.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                                    </MenuItem>
                                )
                            })}
                        </Select>
                    </FormControl>

                    <TextField
                        size="small"
                        value={description ?? ''}
                        placeholder="Description of the condition"
                        onChange={e => setDescription(e.target.value)}
                        fullWidth
                    />

                    {type === 'paper-stretch' && (
                        <TextField
                            size="small"
                            type="number"
                            value={factor ?? ''}
                            placeholder="Factor (e.g. 1.5)"
                            onChange={e => setFactor(Number(e.target.value))}
                            fullWidth
                        />
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant='contained'
                    onClick={() => {
                        handleDone()
                        onClose()
                    }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};
