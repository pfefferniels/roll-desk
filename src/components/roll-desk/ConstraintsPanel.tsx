import { Box, List, ListItem, ListItemButton, ListItemText, ListSubheader, Stack, Typography } from "@mui/material"
import { AnyPerforation, AnySymbol, ConstraintProblem, Path, PlacementRelation, isPerforation } from "linked-rolls"
import { ReactNode, useContext, useMemo } from "react"
import { EditionContext } from "../../providers/EditionContext"
import { useSnapshot } from "../../hooks/useSnapshot"
import {
    constraintsOf, describePerforation, describePlacement, pairsIn,
    placementsIn, problemLabel, problemsByVersion, relationLabel
} from "../../helpers/constraints"
import { Arguable } from "./Arguable"
import { LegendPopover } from "./Legend"
import { ConstraintLegend } from "./ConstraintLegend"

const Section = ({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) => (
    <List dense subheader={<ListSubheader disableSticky>{title}</ListSubheader>}>
        {children.length > 0
            ? children
            : <ListItem><ListItemText secondary={empty} /></ListItem>}
    </List>
)

interface ConstraintItemProps {
    text: string
    /** Where the statement sits in the edition, for its belief. */
    path?: Path
    onClick: () => void
}

const ConstraintItem = ({ text, path, onClick }: ConstraintItemProps) => (
    <ListItem disablePadding secondaryAction={path && <Arguable path={path}>{null}</Arguable>}>
        <ListItemButton onClick={onClick}>
            <ListItemText primary={text} />
        </ListItemButton>
    </ListItem>
)

type ShowConstraint = (versionId: string, symbolIds: string[]) => void

interface ProblemListProps {
    problems: readonly ConstraintProblem[]
    onShow: ShowConstraint
}

/** Every problem of the edition under the version it holds in. */
const ProblemList = ({ problems, onShow }: ProblemListProps) => {
    const { edition, view } = useContext(EditionContext)
    if (!edition || !view) return null

    const groups = problemsByVersion(problems, edition.versions)
    const describe = (id: string) => {
        const symbol = view.get<AnySymbol>(id)
        return isPerforation(symbol) ? describePerforation(symbol, view) : id
    }

    return (
        <List dense subheader={<ListSubheader disableSticky>Problems</ListSubheader>}>
            {groups.length === 0 && (
                <ListItem><ListItemText secondary='No problems.' /></ListItem>
            )}
            {groups.flatMap(({ version, problems }) => [
                <ListSubheader key={version.id} disableSticky sx={{ lineHeight: 2 }}>{version.siglum}</ListSubheader>,
                ...problems.map(problem => (
                    <ListItemButton
                        key={`${problem.symbol}-${problem.problem}`}
                        onClick={() => onShow(problem.version, [problem.symbol])}
                    >
                        <ListItemText
                            primary={problemLabel(problem.problem)}
                            secondary={describe(problem.symbol)}
                        />
                    </ListItemButton>
                ))
            ])}
        </List>
    )
}

interface ConstraintsPanelProps {
    versionId?: string
    /** The problems of the whole edition. */
    problems: readonly ConstraintProblem[]
    onShow: ShowConstraint
}

/**
 * The problems of every version, then the alignments and pairs of the
 * shown version, each with its belief. An entry opens its version and
 * marks its symbols.
 */
export const ConstraintsPanel = ({ versionId, problems, onShow }: ConstraintsPanelProps) => {
    const { edition, view } = useContext(EditionContext)
    const snapshot = useSnapshot(versionId)
    const placements = useMemo(() => placementsIn(snapshot), [snapshot])
    const pairs = useMemo(() => pairsIn(snapshot), [snapshot])

    if (!edition || !view) return null

    const version = edition.versions.find(v => v.id === versionId)
    const describe = (symbol: AnyPerforation) => describePerforation(symbol, view)
    const pathTo = (symbol: AnyPerforation, key: PlacementRelation | 'pairedWith'): Path | undefined => {
        const path = view.getPath(symbol.id)
        return path && [...path, key]
    }

    return (
        <Box sx={{ width: 320, maxHeight: '70vh', overflow: 'auto' }}>
            <ProblemList problems={problems} onShow={onShow} />

            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ pl: 2 }}>
                <Typography variant='subtitle2'>
                    {version ? `Constraints in ${version.siglum}` : 'Constraints'}
                </Typography>
                <LegendPopover><ConstraintLegend /></LegendPopover>
            </Stack>

            {!version && (
                <Typography variant='body2' color='text.secondary' sx={{ px: 2, py: 1 }}>
                    Select a version to see its constraints.
                </Typography>
            )}

            {version && (
                <>
                    <Section title='Placements' empty={`No placements in ${version.siglum}.`}>
                        {placements.map(placement => (
                            <ConstraintItem
                                key={placement.follower.id}
                                text={describePlacement(placement, view)}
                                path={pathTo(placement.follower, placement.relation)}
                                onClick={() => onShow(version.id, [placement.follower.id, placement.reference.id])}
                            />
                        ))}
                    </Section>
                    <Section title='Pairs' empty={`No pairs in ${version.siglum}.`}>
                        {pairs.map(({ stating, partner }) => (
                            <ConstraintItem
                                key={stating.id}
                                text={`${describe(stating)} ⟷ ${describe(partner)}`}
                                path={pathTo(stating, 'pairedWith')}
                                onClick={() => onShow(version.id, [stating.id, partner.id])}
                            />
                        ))}
                    </Section>
                </>
            )}
        </Box>
    )
}

interface ConstraintSummaryProps {
    symbol: AnyPerforation
    versionId: string
}

/** What binds a selected perforation, in a line or two. */
export const ConstraintSummary = ({ symbol, versionId }: ConstraintSummaryProps) => {
    const { view } = useContext(EditionContext)
    const snapshot = useSnapshot(versionId)
    if (!view) return null

    const { placement, pairedWith } = constraintsOf(symbol, snapshot)
    if (!placement && !pairedWith) return null

    return (
        <div style={{ color: 'gray', fontSize: '8pt' }}>
            {placement && <div>{relationLabel[placement.relation]} {describePerforation(placement.reference, view)}</div>}
            {pairedWith && <div>paired with {describePerforation(pairedWith, view)}</div>}
        </div>
    )
}
