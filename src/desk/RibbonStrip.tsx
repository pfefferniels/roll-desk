import { ChevronLeft, ChevronRight } from "@mui/icons-material"
import { Box, Stack } from "@mui/material"
import { ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { scrollBehavior } from "./motion"
import { ToolButton } from "./ToolButton"

interface RibbonStripProps {
    children: ReactNode
}

/** How much of what shows one press of an arrow moves on. */
const step = 0.8

/**
 * The ribbons of the bar, in a row as wide as the bar leaves them. Where
 * they run wider, a ribbon is not squeezed, which would break its labels
 * over lines and make the bar, and the desk below it, taller with every
 * ribbon a selection brings. The row moves along instead: by the arrows
 * at its ends, by a sideways swipe, or as the focus goes to a tool out of
 * view. It shows no scrollbar, which where the system gives one room of
 * its own would make the bar taller just as well.
 */
export const RibbonStrip = ({ children }: RibbonStripProps) => {
    const stripRef = useRef<HTMLDivElement>(null)
    const rowRef = useRef<HTMLDivElement>(null)
    const [more, setMore] = useState({ before: false, after: false })

    /** Whether more of the row lies to either side than shows. */
    const measure = useCallback(() => {
        const strip = stripRef.current
        if (!strip) return
        const before = strip.scrollLeft > 1
        const after = strip.scrollWidth - strip.clientWidth - strip.scrollLeft > 1
        setMore(was => was.before === before && was.after === after ? was : { before, after })
    }, [])

    useEffect(() => {
        const strip = stripRef.current
        const row = rowRef.current
        if (!strip || !row) return

        // The strip changes its width with the window, the row with the ribbons a selection brings.
        const observer = new ResizeObserver(measure)
        observer.observe(strip)
        observer.observe(row)
        return () => observer.disconnect()
    }, [measure])

    const move = (direction: -1 | 1) => {
        const strip = stripRef.current
        if (!strip) return
        strip.scrollBy({ left: direction * strip.clientWidth * step, behavior: scrollBehavior() })
    }

    // Both arrows stand while the row runs wider, the one with nothing
    // beyond it disabled, so that the strip keeps its width as it is moved.
    const overflows = more.before || more.after

    // The arrows are for the pointer; the keyboard brings a tool into view by going to it.
    return (
        <Stack direction='row' alignItems='center' sx={{ flex: 1, minWidth: 0 }}>
            {overflows && (
                <ToolButton
                    label='Show the tools to the left'
                    size='small'
                    tabIndex={-1}
                    disabled={!more.before}
                    onClick={() => move(-1)}
                >
                    <ChevronLeft />
                </ToolButton>
            )}
            <Box
                ref={stripRef}
                onScroll={measure}
                sx={{
                    display: 'flex',
                    minWidth: 0,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' }
                }}
            >
                <Box ref={rowRef} sx={{ display: 'flex', flexShrink: 0 }}>
                    {children}
                </Box>
            </Box>
            {overflows && (
                <ToolButton
                    label='Show the tools to the right'
                    size='small'
                    tabIndex={-1}
                    disabled={!more.after}
                    onClick={() => move(1)}
                >
                    <ChevronRight />
                </ToolButton>
            )}
        </Stack>
    )
}
