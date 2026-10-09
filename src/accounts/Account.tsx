import { ExpandMore } from "@mui/icons-material"
import { Box, ButtonBase, Collapse, Stack, Tooltip, Typography } from "@mui/material"
import { Belief } from "linked-rolls"
import { ReactElement, ReactNode, useState } from "react"
import { CertaintyMark } from "./CertaintyMark"
import { BeliefAccount } from "./Reasons"

/**
 * What a tab holds, kept within the window so that an account in it
 * scrolls instead of running off the page. The rest keeps its height,
 * a flex item not shrinking below its content.
 */
export const TabColumn = ({ children }: { children: ReactNode }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 7rem)' }}>
        {children}
    </Box>
)

/** The sheet an account is written on, scrolling where it runs longer than the room it is given. */
export const AccountPanel = ({ children }: { children: ReactNode }) => (
    <Box sx={{
        width: 300,
        minHeight: 0,
        overflow: 'auto',
        mt: 1,
        p: 1.5,
        bgcolor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 1
    }}>
        {children}
    </Box>
)

interface AccountSectionProps {
    title: string
    /** What the title means, in a sentence shown under the pointer. */
    hint?: string
    /**
     * Where given, the section folds under its title, a click on which opens
     * and shuts it; true starts it shut, for what a reader seldom needs to see.
     */
    folded?: boolean
    children: ReactNode
}

const sectionSx = { pt: 1, borderTop: '1px solid #f3f4f6' }

/** One part of an account, under its title. */
export const AccountSection = ({ title, hint, folded, children }: AccountSectionProps) => {
    const [open, setOpen] = useState(!folded)

    const heading = (
        <Typography
            variant='overline'
            color='text.secondary'
            sx={{
                lineHeight: 1.5,
                alignSelf: 'flex-start',
                // A dotted line under a title says there is more to it under the pointer.
                ...(hint && { textDecoration: 'underline dotted', textUnderlineOffset: 3 }),
                ...(hint && folded === undefined && { cursor: 'help' })
            }}
        >
            {title}
        </Typography>
    )

    const explained = (heading: ReactElement) => hint
        ? <Tooltip title={hint} describeChild placement='top-start'>{heading}</Tooltip>
        : heading

    if (folded === undefined) {
        return (
            <Stack spacing={0.75} sx={sectionSx}>
                {explained(heading)}
                {children}
            </Stack>
        )
    }

    // The tooltip hangs on the button, so that it shows where the keyboard is too.
    return (
        <Stack sx={sectionSx}>
            {explained(<ButtonBase
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                sx={{
                    alignSelf: 'flex-start',
                    borderRadius: 0.5,
                    // ButtonBase takes the browser's ring away and draws none of its own.
                    '&.Mui-focusVisible': { outline: '2px solid #1976d2', outlineOffset: 1 }
                }}
            >
                {heading}
                <ExpandMore
                    fontSize='small'
                    sx={{
                        color: 'text.secondary',
                        transform: open ? 'none' : 'rotate(-90deg)',
                        transition: 'transform 150ms'
                    }}
                />
            </ButtonBase>)}
            <Collapse in={open}>
                <Stack spacing={0.75} sx={{ pt: 0.75 }}>
                    {children}
                </Stack>
            </Collapse>
        </Stack>
    )
}

interface HeldStatementProps {
    /** Left out where the statement is made without a belief, and so held true. */
    belief?: Belief
    children: ReactNode
}

/** A statement, with the mark of the belief it is held under, which opens the reasons for it. */
export const HeldStatement = ({ belief, children }: HeldStatementProps) => (
    <Typography variant='body2' component='div'>
        {children}
        {belief && (
            <CertaintyMark certainty={belief.certainty}>
                <BeliefAccount belief={belief} />
            </CertaintyMark>
        )}
    </Typography>
)
