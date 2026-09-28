import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tooltip, Typography } from "@mui/material";
import {
    alignCopies, alignCopy, alignmentFor, alignmentProblems, barOf, chooseReferenceCopy,
    paperOf, referenceCopyOf, RollCopy, trackerBars
} from "linked-rolls";
import { useContext, useMemo } from "react";
import { EditionContext } from "../../providers/EditionContext";
import { AlignmentPreview } from "./AlignmentPreview";
import { copyLabel } from "../../helpers/names";
import { alignmentStatement, movesBy, problemStatement, strainStatement } from "../../helpers/alignment";

const systemName = (id: string) => trackerBars.find(bar => bar.id === id)?.name ?? id

interface AlignmentDialogProps {
    open: boolean
    onClose: () => void
    copy: RollCopy
}

/**
 * The alignment of a copy with the edition's reference copy: what is
 * stated, what aligning it again would find, and what all the
 * alignments together say about the copy's paper.
 */
export const AlignmentDialog = ({ copy, onClose, open }: AlignmentDialogProps) => {
    const { edition, apply } = useContext(EditionContext)
    const reference = edition && referenceCopyOf(edition)
    const isReference = reference?.id === copy.id

    // Finding it takes a moment on a whole roll, so only while the dialog is open.
    const found = useMemo(
        () => open && edition && !isReference ? alignmentFor(edition, copy) : undefined,
        [open, edition, copy, isReference]
    )
    const paper = useMemo(() => edition && paperOf(edition), [edition])

    if (!edition || !open) return null

    const stated = copy.measurements.alignment
    const ofCopy = paper?.copies.find(entry => entry.copy === copy.id)
    const system = barOf(copy).id
    const ofSystem = paper?.systems.find(entry => entry.system === system)
    const referenceSystem = reference ? barOf(reference).id : undefined
    const problems = alignmentProblems(edition).filter(entry => entry.copy === copy.id)
    const moves = stated && found ? movesBy(copy, found) : undefined

    return (
        <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
            <DialogTitle>Alignment of {copyLabel(copy)}</DialogTitle>
            <DialogContent>
                <Stack spacing={1}>
                    {!reference && (
                        <Typography>The edition has no copy with features to be its axis yet.</Typography>
                    )}

                    {reference && isReference && (
                        <Typography>
                            This is the reference copy: its millimetres are the edition&apos;s axis, and every
                            place along the roll is a place on its paper.
                        </Typography>
                    )}

                    {reference && !isReference && (
                        <>
                            <Typography>
                                Against the reference copy {copyLabel(reference)}.
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                                {stated ? `As aligned: ${alignmentStatement(stated)}.` : 'Not aligned yet.'}
                            </Typography>

                            {found ? (
                                <>
                                    <AlignmentPreview
                                        copy={copy}
                                        alignTo={reference}
                                        shift={found.shift.horizontal}
                                        scale={found.scale}
                                        bar={barOf(copy)}
                                    />
                                    <Typography variant='body2' color='text.secondary'>
                                        Found now: {alignmentStatement(found)}.
                                        {moves !== undefined && ` Aligning again moves its places by up to ${moves.toFixed(2)} mm.`}
                                    </Typography>
                                </>
                            ) : (
                                <Typography color='error'>
                                    The copy shares no run of notes with the reference copy to align on.
                                </Typography>
                            )}
                        </>
                    )}

                    {ofCopy && (
                        <Typography variant='body2'>
                            Its paper has stretched by {strainStatement(ofCopy.along)} along the roll,{' '}
                            {ofCopy.measured
                                ? 'as measured on it and borne out by the alignments.'
                                : 'as far as the alignments of all the copies tell.'}
                        </Typography>
                    )}
                    {ofSystem && system !== referenceSystem && referenceSystem && (
                        <Typography variant='body2'>
                            {systemName(system)} paper runs {ofSystem.ratio.toFixed(4)} ± {ofSystem.ratioError.toFixed(4)} times
                            the length of {systemName(referenceSystem)} paper, which is the ratio of the speeds they were cut for.
                        </Typography>
                    )}
                    {paper && (
                        <Typography variant='caption' color='text.secondary'>
                            Paper strays by {paper.spread.value.toFixed(2)} % from copy to copy,{' '}
                            {paper.spread.degreesOfFreedom > 0
                                ? `as ${paper.spread.degreesOfFreedom} comparisons of copies of one system show.`
                                : 'as is taken where too few copies of one system show it.'}
                        </Typography>
                    )}

                    {problems.map(problem => (
                        <Alert key={problem.problem} severity='warning'>{problemStatement(problem)}</Alert>
                    ))}
                </Stack>
            </DialogContent>

            <DialogActions>
                {!isReference && (
                    <Tooltip describeChild title="Every place the edition gives along the roll moves onto this copy's paper.">
                        <Button onClick={() => { apply(chooseReferenceCopy(copy.id)); onClose() }}>
                            Make reference copy
                        </Button>
                    </Tooltip>
                )}
                <Button onClick={() => { apply(alignCopies()); onClose() }} disabled={!reference}>
                    Align all copies
                </Button>
                <Button
                    variant='contained'
                    disabled={isReference || !found}
                    onClick={() => { apply(alignCopy(copy.id)); onClose() }}
                >
                    {stated ? 'Align again' : 'Align'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
