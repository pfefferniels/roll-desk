import { Button, DialogTitle, DialogContent, Dialog, DialogActions, TextField, Typography, Stack, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useEffect, useState } from "react";
import { AnyFeature, conditions, ConditionState } from "linked-rolls";

interface FeatureConditionDialogProps {
    open: boolean
    feature: AnyFeature
    onClose: () => void
    onDone: (condition: ConditionState<any>) => void
}

export function FeatureConditionDialog({ open, feature, onClose, onDone }: FeatureConditionDialogProps) {
    type FeatureT = typeof feature.type
    type ConditionT = typeof conditions[FeatureT][number]

    const [type, setType] = useState<ConditionT>(conditions[feature.type][0])
    const [description, setDescription] = useState<string>()

    const allTypes: readonly ConditionT[] = conditions[feature.type]

    useEffect(() => {
        if (!feature.condition) {
            setType(conditions[feature.type][0])
            setDescription(undefined)
            return
        }

        setType(feature.condition.type)
        setDescription(feature.condition.description)
    }, [feature])

    const handleDone = async () => {
        if (!type) {
            console.error('Condition type is required');
            return;
        }

        onDone({ type, description });
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
                            onChange={e => setType(e.target.value)}
                        >
                            {allTypes.map(t => {
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
