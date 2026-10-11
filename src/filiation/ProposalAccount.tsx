import { Box, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material"
import { constraintProblems, ConstraintProblem, Edition, StemmaProposal } from "linked-rolls"
import { ReactNode, useContext, useMemo, useState } from "react"
import { EditionContext } from "../edition/EditionContext"
import { SelectionContext } from "../desk/SelectionContext"
import { HeldMotivation } from "../edition/motivation"
import { AccountSection } from "../accounts/Account"
import { Stemma } from "../stemma/Stemma"
import {
    amount, baseTextRows, ChangeRow, changeRows, conflictRows, copyNames, deviationRows, listed,
    marginLabel, proposedNames, supportLabel, Tally, unpinnedRows
} from "./filiation"

const ignore = () => { }

const nothingSelected: [] = []

/**
 * A selection of the dialog's own, so that pointing at a slice of a
 * stemma here marks the same motivation in the other, and does not
 * reach the desk behind the dialog.
 */
const OwnSelection = ({ children }: { children: ReactNode }) => {
    const [pointed, setPointed] = useState<HeldMotivation>()

    return (
        <SelectionContext.Provider value={{ selection: nothingSelected, setSelection: ignore, setRange: ignore, pointed, setPointed }}>
            {children}
        </SelectionContext.Provider>
    )
}

interface StemmaOfProps {
    title: string
    edition: Edition
    problems: readonly ConstraintProblem[]
}

/** The stemma of an edition, which need not be the desk's, drawn as the desk draws its own. */
const StemmaOf = ({ title, edition, problems }: StemmaOfProps) => {
    const context = useContext(EditionContext)

    return (
        <Stack alignItems='center'>
            <Typography variant='overline' color='text.secondary'>{title}</Typography>
            <Box sx={{ border: '1px solid #e5e7eb', borderRadius: 1 }}>
                <EditionContext.Provider value={{ ...context, edition, viewOnly: true }}>
                    <Stemma currentVersionId={undefined} problems={problems} height={340} onClick={ignore} onHold={ignore} />
                </EditionContext.Provider>
            </Box>
        </Stack>
    )
}

const tallyCells = (tally: Tally, changed: boolean) => (
    <>
        <TableCell align='right'>{tally.kept}</TableCell>
        <TableCell align='right' sx={{ fontWeight: changed && tally.gone > 0 ? 600 : undefined }}>{tally.gone}</TableCell>
        <TableCell align='right' sx={{ fontWeight: changed && tally.added > 0 ? 600 : undefined }}>{tally.added}</TableCell>
    </>
)

const parentText = (row: ChangeRow): string => {
    const named = (parent: string | null | undefined) => parent === null ? 'nothing' : parent ?? ''
    if (row.only === 'after') return named(row.parentAfter)
    if (row.only === 'before' || !row.moved) return named(row.parentBefore)
    return `${named(row.parentBefore)} → ${named(row.parentAfter)}`
}

/** Version by version, what adopting changes: what it derives from, and what of its insertions and deletions stays, goes or comes. */
const ChangeTable = ({ rows }: { rows: ChangeRow[] }) => (
    <TableContainer>
        <Table size='small' sx={{ '& td, & th': { px: 1, whiteSpace: 'nowrap' } }}>
            <TableHead>
                <TableRow>
                    <TableCell rowSpan={2}>Version</TableCell>
                    <TableCell rowSpan={2}>Derives from</TableCell>
                    <TableCell colSpan={3} align='center'>Insertions</TableCell>
                    <TableCell colSpan={3} align='center'>Deletions</TableCell>
                </TableRow>
                <TableRow>
                    {['kept', 'gone', 'added', 'kept', 'gone', 'added'].map((heading, index) => (
                        <TableCell key={index} align='right'>{heading}</TableCell>
                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.map(row => (
                    <TableRow key={row.version} sx={row.changed ? { bgcolor: '#fffbeb' } : undefined}>
                        <TableCell sx={{ fontWeight: row.changed ? 600 : undefined }}>
                            {row.siglum}{row.siglumAfter && ` → ${row.siglumAfter}`}
                            {row.only && (
                                <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 0.5 }}>
                                    {row.only === 'after' ? '(new)' : '(goes)'}
                                </Typography>
                            )}
                        </TableCell>
                        <TableCell sx={{ fontWeight: row.moved ? 600 : undefined }}>{parentText(row)}</TableCell>
                        {tallyCells(row.inserted, row.changed)}
                        {tallyCells(row.deleted, row.changed)}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
)

/** A list too long to read at a glance, as a table that scrolls. */
const ListTable = ({ headings, rows }: { headings: string[], rows: { key: string, cells: ReactNode[] }[] }) => (
    <TableContainer sx={{ maxHeight: 260 }}>
        <Table size='small' stickyHeader sx={{ '& td, & th': { px: 1 } }}>
            <TableHead>
                <TableRow>
                    {headings.map(heading => <TableCell key={heading}>{heading}</TableCell>)}
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.map(({ key, cells }) => (
                    <TableRow key={key}>
                        {cells.map((cell, index) => <TableCell key={index}>{cell}</TableCell>)}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
)

const notation = { fontFamily: 'monospace', fontSize: '0.95em' } as const

interface ProposalAccountProps {
    /** The edition the proposal was made for. */
    edition: Edition
    proposal: StemmaProposal
    /** The edition as it would stand with the proposal adopted. */
    preview: Edition
}

/**
 * A proposed stemma set against the edition's own: what it is and what
 * it costs, both drawn side by side, what adopting it changes version by
 * version, how firmly the copies decide it, and what it leaves unsettled.
 */
export const ProposalAccount = ({ edition, proposal, preview }: ProposalAccountProps) => {
    const copyName = useMemo(() => copyNames(edition), [edition])
    const versionName = useMemo(() => proposedNames(proposal, edition, preview), [proposal, edition, preview])
    const rows = useMemo(() => changeRows(edition, preview), [edition, preview])
    const problemsBefore = useMemo(() => constraintProblems(edition), [edition])
    const problemsAfter = useMemo(() => constraintProblems(preview), [preview])

    const conflicts = conflictRows(proposal, copyName, versionName)
    const deviations = deviationRows(proposal, copyName, versionName)
    const unpinned = unpinnedRows(proposal.unpinned, edition)
    const baseText = baseTextRows(proposal, copyName)
    const changed = rows.filter(row => row.changed).length

    return (
        <Stack spacing={2}>
            <Box>
                <Typography>
                    <Box component='span' sx={notation}>{proposal.notation}</Box>, at a cost
                    of {amount(proposal.cost)}, the least of {proposal.scored.toLocaleString('en')} stemmata scored.
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                    A lost version is written *, the versions derived from one in brackets after it.
                </Typography>
            </Box>

            <OwnSelection>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='center' alignItems='center'>
                    <StemmaOf title='As the edition stands' edition={edition} problems={problemsBefore} />
                    <StemmaOf title='As proposed' edition={preview} problems={problemsAfter} />
                </Stack>
            </OwnSelection>

            <AccountSection
                title={`What adopting changes · ${changed} of ${rows.length} versions`}
                hint='The symbols each version inserts and deletes as the edition stands, kept, gone or added as proposed.'
            >
                <ChangeTable rows={rows} />
            </AccountSection>

            <AccountSection
                title='How firmly the copies decide it'
                hint='For each grouping of the stemma, how much more the best stemma without it costs.'
            >
                {proposal.supports.map((support, index) => (
                    <Box key={index}>
                        <Typography variant='body2'>{supportLabel(support, copyName)}.</Typography>
                        <Typography variant='caption' color='text.secondary'>{marginLabel(support.margin)}.</Typography>
                    </Box>
                ))}
                {proposal.alternatives.length > 0 && (
                    <Box>
                        <Typography variant='body2'>The runners-up:</Typography>
                        {proposal.alternatives.map(alternative => (
                            <Typography key={alternative.notation} variant='body2' sx={{ pl: 2 }}>
                                <Box component='span' sx={notation}>{alternative.notation}</Box>
                                {` +${amount(alternative.cost - proposal.cost)}`}
                            </Typography>
                        ))}
                    </Box>
                )}
            </AccountSection>

            <AccountSection
                title={`Readings arising more than once · ${conflicts.length}`}
                hint='Readings the stemma lets arise in more than one version. Adopted, each becomes a symbol of its own in each.'
                folded
            >
                <ListTable
                    headings={['Reading', 'At', 'Carried by', 'Inserted by']}
                    rows={conflicts.map(row => ({
                        key: row.reading,
                        cells: [row.meaning, row.place, listed(row.copies), listed(row.versions)]
                    }))}
                />
            </AccountSection>

            <AccountSection
                title={`Readings a copy does not show · ${deviations.length}`}
                hint='Readings a version holds although the copy carrying it lacks them.'
                folded
            >
                <ListTable
                    headings={['Version', 'Copy', 'Reading', 'At']}
                    rows={deviations.map(row => ({
                        key: `${row.version} ${row.reading}`,
                        cells: [row.version, row.copy, row.meaning, row.place]
                    }))}
                />
            </AccountSection>

            <AccountSection
                title={`Your edits not kept · ${unpinned.length}`}
                hint='Edits written in the editor rather than by a collation, which the proposal does not keep as they are. Adopted, they go.'
                folded
            >
                <ListTable
                    headings={['Edit', 'Version', 'Why', 'Motivation']}
                    rows={unpinned.map(row => ({
                        key: row.edit,
                        cells: [
                            <Box component='span' key='edit' title={row.edit} sx={notation}>{row.edit.slice(0, 8)}</Box>,
                            row.version,
                            row.reason,
                            row.motivation ?? ''
                        ]
                    }))}
                />
            </AccountSection>

            <AccountSection
                title={`Readings taken for the base text · ${baseText.length}`}
                hint='Readings only the less refined side of the root carries, taken for the base text since the other side has them moved or cleaned up.'
                folded
            >
                <ListTable
                    headings={['Reading', 'At', 'Carried by']}
                    rows={baseText.map(row => ({ key: row.reading, cells: [row.meaning, row.place, listed(row.copies)] }))}
                />
            </AccountSection>
        </Stack>
    )
}
