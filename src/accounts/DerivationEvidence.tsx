import { Box, Stack, Tooltip, Typography } from "@mui/material"
import { EditType, Restoration } from "linked-rolls"
import { Fragment, ReactNode, useContext, useMemo } from "react"
import { EditionContext } from "../edition/EditionContext"
import { versionLabel } from "../edition/names"
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

/** A count that tells what it is made of, or why it speaks against the stemma, when pointed at. */
const Hinted = ({ hint, against = false, children }: { hint: string, against?: boolean, children: ReactNode }) => (
    <Tooltip title={hint} describeChild placement='top'>
        <Box component='span' sx={{
            cursor: 'help',
            textDecoration: 'underline dotted',
            textUnderlineOffset: 3,
            ...(against && { color: AGAINST, fontWeight: 500 })
        }}>
            {children}
        </Box>
    </Tooltip>
)

/** How many of the symbols a column counts a copy has: all of them, none, or the number. */
const share = (n: number, total: number) => n === 0 ? 'none' : n === total ? 'all' : `${n}`

/**
 * How a copy bears what a version adds. A copy on the version's line has
 * each symbol as added or as a later version of its line replaced or
 * struck it; what it lacks beyond that, and anything a copy off the line
 * carries, speaks against the stemma.
 */
const Added = ({ counts, total }: { counts: Counts, total: number }) => {
    const { inLine, carried, replaced, struck, unaccounted } = counts
    if (!inLine) {
        return unaccounted === 0
            ? <>none</>
            : <Hinted against hint='Carried, though the copy is not on the line of the version that adds them.'>{unaccounted}</Hinted>
    }

    const parts = [
        `${carried} as added`,
        replaced > 0 && `${replaced} replaced by a later version`,
        struck > 0 && `${struck} struck by a later version`,
        unaccounted > 0 && `${unaccounted} missing, which no later edit accounts for`
    ].filter((part): part is string => part !== false)
    const shown = share(total - unaccounted, total)
    return parts.length === 1
        ? <>{shown}</>
        : <Hinted against={unaccounted > 0} hint={`${parts.join(', ')}.`}>{shown}</Hinted>
}

/** How many of the symbols a version strikes a copy still has. On the version's line, any speaks against the stemma. */
const Kept = ({ keeps, inLine, total }: { keeps: number, inLine: boolean, total: number }) =>
    inLine && keeps > 0
        ? <Hinted against hint='Still there, though the copy is on the line of the version that strikes them.'>{keeps}</Hinted>
        : <>{share(keeps, total)}</>

interface Columns {
    parent?: { version: string, inserted: number }
    inserted: number
    struck: number
}

const Row = ({ row, columns: { parent, inserted, struck } }: { row: EvidenceRow, columns: Columns }) => (
    <tr>
        <td><EntityLink id={row.copy} /></td>
        {parent && <td>{row.parent && <Added counts={row.parent} total={parent.inserted} />}</td>}
        {inserted > 0 && <td><Added counts={row.insertions} total={inserted} /></td>}
        {struck > 0 && <td><Kept keeps={row.keeps} inLine={row.insertions.inLine} total={struck} /></td>}
    </tr>
)

/** A row naming the group of copies the rows below it make up. */
const Group = ({ span, children }: { span: number, children: ReactNode }) => (
    <tr>
        <Box component='td' colSpan={span} sx={{ pt: '6px !important', color: 'text.secondary', fontStyle: 'italic' }}>
            {children}
        </Box>
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
 * the derivation's note: for each copy, first those on the version's
 * line, how much it has of what the version adds and strikes and, where
 * the parent is not the root, of what the parent adds; the versions apart
 * from its line that none of its copies follows; its edits by type; and
 * what it puts back that an ancestor struck. What speaks against the
 * derivation is marked.
 */
export const DerivationEvidence = ({ versionId }: { versionId: string }) => {
    const { edition } = useContext(EditionContext)
    const evidence = useMemo(() => edition && derivationEvidenceOf(edition, versionId), [edition, versionId])
    if (!edition || !evidence || (evidence.inserted === 0 && evidence.struck === 0)) return null

    const { inserted, struck, parent, rows, apart, editTypes, restorations } = evidence
    const label = versionLabel(edition, versionId)
    const columns: Columns = { parent, inserted, struck }
    const span = 1 + Number(parent !== undefined) + Number(inserted > 0) + Number(struck > 0)
    const onLine = rows.filter(row => row.insertions.inLine)
    const others = rows.filter(row => !row.insertions.inLine)

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
                    '& th, & td': { px: 0.75, py: 0.125, textAlign: 'center', whiteSpace: 'nowrap' },
                    '& th': { fontWeight: 400, color: 'text.secondary', verticalAlign: 'bottom' },
                    '& th:first-of-type, & td:first-of-type': { textAlign: 'left', pl: 0 }
                }}
            >
                <thead>
                    <tr>
                        <th />
                        {parent && (
                            <Heading hint='The symbols the version it derives from adds. The copies on this version’s line should have all of them as well.'>
                                <EntityLink id={parent.version} /> adds {parent.inserted}
                            </Heading>
                        )}
                        {inserted > 0 && (
                            <Heading hint='The symbols this version adds. The copies on its line should have all of them, the other copies none.'>
                                {label} adds {inserted}
                            </Heading>
                        )}
                        {struck > 0 && (
                            <Heading hint='The symbols this version strikes. The copies on its line should have none of them.'>
                                {label} strikes {struck}
                            </Heading>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {onLine.length > 0 && <Group span={span}>On {label}’s line</Group>}
                    {onLine.map(row => <Row key={row.copy} row={row} columns={columns} />)}
                    {others.length > 0 && <Group span={span}>Other copies</Group>}
                    {others.map(row => <Row key={row.copy} row={row} columns={columns} />)}
                </tbody>
            </Box>
            <Typography variant='caption' color='text.secondary' component='div'>
                A cell counts the symbols in its heading that the copy has.
                Copies on {label}’s line should have all{' '}
                {parent ? <><EntityLink id={parent.version} /> and {label} add</> : <>{label} adds</>}
                {struck > 0 && ` and none ${label} strikes`}; other copies none {label} adds.
                A dotted “all” includes some that a later version replaced or struck.
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
