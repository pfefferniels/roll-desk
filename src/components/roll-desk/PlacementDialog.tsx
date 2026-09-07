import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, Radio, RadioGroup } from "@mui/material"
import { PlacementRelation } from "linked-rolls"
import { useContext, useState } from "react"
import { EditionContext } from "../../providers/EditionContext"
import { Perforation, Placement, describePlacement } from "../../helpers/constraints"

const titles: Record<PlacementRelation, string> = {
    alignedWith: 'Align',
    before: 'Place before',
    after: 'Place after'
}

const explanations: Record<PlacementRelation, string> = {
    alignedWith: 'The follower takes the onset of its reference when the roll is performed.',
    before: 'The follower begins before its reference when the roll is performed, as far before as the copies that agree put it.',
    after: 'The follower begins after its reference when the roll is performed, as far after as the copies that agree put it.'
}

interface PlacementDialogProps {
    /** The two perforations, in the order they were picked. */
    candidates: [Perforation, Perforation]
    relation: PlacementRelation
    onClose: () => void
    onDone: (placement: Placement) => void
}

/**
 * Which of two perforations of the same kind is placed relative to
 * the other. The first picked is taken to be the one that moves.
 */
export const PlacementDialog = ({ candidates: [first, second], relation, onClose, onDone }: PlacementDialogProps) => {
    const { view } = useContext(EditionContext)
    const [followerId, setFollowerId] = useState(first.id)

    if (!view) return null

    const directions: Placement[] = [
        { relation, follower: first, reference: second },
        { relation, follower: second, reference: first }
    ]
    const chosen = directions.find(direction => direction.follower.id === followerId) ?? directions[0]

    return (
        <Dialog open onClose={onClose}>
            <DialogTitle>{titles[relation]}</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 1 }}>
                    {explanations[relation]} The statement holds in every version that carries the follower.
                </DialogContentText>
                <RadioGroup value={followerId} onChange={(_, value) => setFollowerId(value)}>
                    {directions.map(direction => (
                        <FormControlLabel
                            key={direction.follower.id}
                            value={direction.follower.id}
                            control={<Radio size='small' />}
                            label={describePlacement(direction, view)}
                        />
                    ))}
                </RadioGroup>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={() => onDone(chosen)} variant='contained'>{titles[relation]}</Button>
            </DialogActions>
        </Dialog>
    )
}
