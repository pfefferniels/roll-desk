import { Box, Stack, Tooltip, Typography } from "@mui/material"
import { EditType, Restoration } from "linked-rolls"
import { Fragment, ReactNode, useContext, useMemo } from "react"
import { EditionContext } from "../edition/EditionContext"
import { Counts, derivationEvidenceOf, EvidenceRow } from "../edition/derivationEvidence"
import { EntityLink } from "./EntityLink"

/** What speaks against the stemma. */
const AGAINST = 'warning.dark'

const editTypeWords: Record<EditType, [string, string]> = {
    'additional-accent': ['added accent', 'added accents'],
    'add-redundancy': ['redundancy made', 'redundancies made'],
    'remove-redundancy': ['redundancy removed', 'redundancies removed'],
    'recoding': ['recoding', 'recodings'],
    'shift': ['shift', 'shifts'],
    'correct-error': ['error corrected', 'errors corrected'],
    'shorten': ['shortening', 'shortenings'],
    'prolong': ['prolongation', 'prolongations']
}

/** The count with the words for the type of edit, or for edits that state none. */
export const editTypeCount = (editType: EditType | undefined, n: number): string => {
    if (!editType) return `${n} of no stated type`
    const [one, many] = editTypeWords[editType]
    return `${n} ${n === 1 ? one : many}`
}

const symbols = (n: number) => `${n} symbol${n === 1 ? '' : 's'}`

const Against = ({ children }: { children: ReactNode }) =>
    <Box component='span' sx={{ color: AGAINST, fontWeight: 500 }}>{children}</Box>

/** How a copy of the line bears what a version inserts: carried, then replaced and struck further down, then what is missing for no reason. */
const InLine = ({ counts }: { counts: Counts }) => (
    <>
        {counts.carried}
        {counts.replaced > 0 && ` +${counts.replaced}`}
        {counts.struck > 0 && ` −${counts.struck}`}
        {counts.unaccounted > 0 && <Against> ?{counts.unaccounted}</Against>}
    </>
)

const NONE = '·'

const Row = ({ row, showsParent }: { row: EvidenceRow, showsParent: boolean }) => (
    <tr>
        <td><EntityLink id={row.copy} /></td>
        <td>
            {row.inLine
                ? <InLine counts={row.insertions} />
                : row.insertions.carried > 0 ? <Against>{row.insertions.carried}</Against> : NONE}
        </td>
        <td>
            {row.keeps === 0 ? NONE : row.inLine ? <Against>{row.keeps}</Against> : row.keeps}
        </td>
        {showsParent && <td>{row.parent ? <InLine counts={row.parent} /> : ''}</td>}
    </tr>
)

const Heading = ({ hint, children }: { hint: string, children: ReactNode }) => (
    <Tooltip title={hint} describeChild placement='top'>
        <th style={{ cursor: 'help' }}>{children}</th>
    </Tooltip>
)

/** The versions named in running text, joined with commas and a final "or". */
const Versions = ({ ids }: { ids: readonly string[] }) => ids.map((id, i) => (
    <Fragment key={id}>
        {i > 0 && (i === ids.length - 1 ? ' or ' : ', ')}
        <EntityLink id={id} />
    </Fragment>
))

/** The restorations by the ancestor that struck what is put back and by the derivation that accounts for it. */
const restorationGroups = (restorations: readonly Restoration[]) =>
    [...Map.groupBy(restorations, restoration => `${restoration.struckBy} ${restoration.from ?? ''}`).values()]
        .map(([first, ...rest]) => ({ struckBy: first!.struckBy, from: first!.from, n: rest.length + 1 }))

/**
 * What the edition holds as evidence that the version derives from the
 * version its text is read against, worked out rather than written into
 * the derivation's note: a row for each copy, saying how it bears what
 * the version adds and strikes and, where the parent is not the root,
 * what the parent adds; the versions apart from its line that none of
 * its copies follows; its edits by type; and what it puts back that an
 * ancestor struck. What speaks against the derivation is marked.
 */
export const DerivationEvidence = ({ versionId }: { versionId: string }) => {
    const { edition } = useContext(EditionContext)
    const evidence = useMemo(() => edition && derivationEvidenceOf(edition, versionId), [edition, versionId])
    if (!edition || !evidence || (evidence.inserted === 0 && evidence.struck === 0)) return null

    const { inserted, struck, parent, rows, apart, editTypes, restorations } = evidence

    return (
        <Stack spacing={0.5} sx={{ pl: 1.5, pt: 0.5 }}>
            <Typography variant='caption' color='text.secondary' component='div' sx={{ fontWeight: 500 }}>
                Evidence
            </Typography>
            <Box
                component='table'
                sx={{
                    borderCollapse: 'collapse',
                    typography: 'caption',
                    fontVariantNumeric: 'tabular-nums',
                    '& th, & td': { px: 0.75, py: 0.125, textAlign: 'right', whiteSpace: 'nowrap' },
                    '& th': { fontWeight: 400, color: 'text.secondary' },
                    '& th:first-of-type, & td:first-of-type': { textAlign: 'left', pl: 0 }
                }}
            >
                <thead>
                    <tr>
                        <th />
                        <Heading hint='How many of the symbols this version adds each copy carries. A copy of its line should carry them all, one outside it none.'>
                            adds {inserted}
                        </Heading>
                        <Heading hint='How many of the symbols this version strikes each copy still carries. A copy of its line should carry none.'>
                            strikes {struck}
                        </Heading>
                        {parent && (
                            <Heading hint='How many of the symbols the version it derives from adds the copies of its line carry.'>
                                <EntityLink id={parent.version} /> adds {parent.inserted}
                            </Heading>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(row => <Row key={row.copy} row={row} showsParent={parent !== undefined} />)}
                </tbody>
            </Box>
            <Typography variant='caption' color='text.secondary' component='div'>
                +n replaced and −n struck by a later version on the copy’s line; {NONE} none.
            </Typography>
            {apart.length > 0 && (
                <Typography variant='caption' color='text.secondary' component='div'>
                    None of its copies carries what <Versions ids={apart} /> {apart.length === 1 ? 'adds' : 'add'}.
                </Typography>
            )}
            {editTypes.length > 0 && (
                <Typography variant='caption' color='text.secondary' component='div'>
                    Edits: {editTypes.map(([editType, n]) => editTypeCount(editType, n)).join(', ')}.
                </Typography>
            )}
            {restorationGroups(restorations).map(({ struckBy, from, n }) => (
                <Typography key={`${struckBy} ${from}`} variant='caption' color='text.secondary' component='div'>
                    Puts back {symbols(n)} that <EntityLink id={struckBy} /> struck,{' '}
                    {from
                        ? <>which the derivation from <EntityLink id={from} /> accounts for.</>
                        : <Against>which no derivation accounts for.</Against>}
                </Typography>
            ))}
        </Stack>
    )
}

/**
 * What a derivation held as a hypothesis accounts for: the symbols the
 * version puts back that an ancestor struck and the other version still
 * shows, which a single exemplar would not explain.
 */
export const RestoredFrom = ({ versionId, parent }: { versionId: string, parent: string }) => {
    const { edition } = useContext(EditionContext)
    const evidence = useMemo(() => edition && derivationEvidenceOf(edition, versionId), [edition, versionId])
    const groups = restorationGroups(evidence?.restorations.filter(restoration => restoration.from === parent) ?? [])
    if (groups.length === 0) return null

    return (
        <Stack spacing={0.5} sx={{ pl: 1.5, pt: 0.5 }}>
            {groups.map(({ struckBy, n }) => (
                <Typography key={struckBy} variant='caption' color='text.secondary' component='div'>
                    Accounts for the {symbols(n)} this version puts back that <EntityLink id={struckBy} /> struck.
                </Typography>
            ))}
        </Stack>
    )
}
