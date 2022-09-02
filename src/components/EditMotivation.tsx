import { Dialog, DialogTitle, DialogContent, Select, MenuItem, DialogActions, Button } from "@mui/material"
import { FC } from "react"
import { SemanticAlignmentPair, Motivation } from "../lib/AlignedPerformance"

interface EditMotivationProps {
    pair?: SemanticAlignmentPair,
    changeMotivation: (pair: SemanticAlignmentPair, target: Motivation) => void,
    dialogOpen: boolean,
    setDialogOpen: (open: boolean) => void
}

export const EditMotivation: FC<EditMotivationProps> = ({ pair, changeMotivation, dialogOpen, setDialogOpen }): JSX.Element => {
    return (
        <Dialog open={dialogOpen}>
            <DialogTitle>Edit Alignment Motivation</DialogTitle>
            <DialogContent>
                <Select value={pair?.motivation}
                    onChange={(e) => {
                        changeMotivation(pair!, e.target.value as Motivation)
                    }}>
                    <MenuItem value={Motivation.ExactMatch}>Exact Match</MenuItem>
                    <MenuItem value={Motivation.Error}>Error</MenuItem>
                    <MenuItem value={Motivation.Ornamentation}>Ornamentation</MenuItem>
                    <MenuItem value={Motivation.Alteration}>Alteration</MenuItem>
                    <MenuItem value={Motivation.OctaveAddition}>Octave Addition</MenuItem>
                    <MenuItem value={Motivation.Uncertain}>Uncertain</MenuItem>
                </Select>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {
                    setDialogOpen(false)
                }}>Save</Button>
            </DialogActions>
        </Dialog>
    )
}
