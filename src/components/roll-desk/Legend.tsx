import { Help } from "@mui/icons-material"
import { Box, Stack, IconButton, Popover } from "@mui/material"
import { ReactNode, useState } from "react"
import { NavigationNode } from "./Stemma"
import { CertaintyIcon } from "./CertaintyIcon"

interface LegendRowProps {
  symbol: ReactNode
  description: string
  help?: string
}

export const LegendRow = ({ symbol, description, help }: LegendRowProps) => {
  return (
    <div style={{ maxWidth: '300px'}}>
      <Box sx={{ display: "flex", alignItems: "center",  }}>
        {symbol}
        <Box component='span' sx={{ ml: 1, fontSize: "0.9rem" }}>
          =&nbsp;<b>{description}</b>
        </Box>
      </Box>
      {
        help && (
          <div style={{ fontSize: 'small' }}>
            {help}
          </div>
        )
      }
    </div>
  )
}

/** A help button that opens the rows given to it. */
export const LegendPopover = ({ children }: { children: ReactNode }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  return (
    <>
      <IconButton
        onClick={(event) => setAnchorEl(anchorEl ? null : event.currentTarget)}
      >
        <Help />
      </IconButton>
      <Popover anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <Stack direction="column" spacing={1} sx={{ p: 2}}>
          {children}
        </Stack>
      </Popover>
    </>
  )
}

export const Legend = () => {
  const width = 35
  const shadowMargin = 25

  return (
    <LegendPopover>
      <LegendRow
        symbol={
          <svg
            width={width + shadowMargin}
            height={width + shadowMargin}
            className="legend"
          >
            <NavigationNode
              node={{
                generation: 0,
                id: '',
                label: 'V',
                x: width / 2 + shadowMargin / 2,
                y: width / 2 + shadowMargin / 2,
                radius: width / 2
              }}
              highlight={false}
            />
          </svg>
        }
        description="Version"
        help={`
        A version is an abstract definition of a state, that a roll
        historically went through, whether it is witnessed in physical
        copies or not. A version consists of symbols, which in turn
        may be associated with features found on physical copies.
        `}
      />

      <LegendRow
        symbol={
          <svg
            width={width + shadowMargin}
            height={width + shadowMargin}
            className="legend"
          >
            <NavigationNode
              node={{
                generation: 0,
                id: '',
                label: 'v',
                inferred: true,
                x: width / 2 + shadowMargin / 2,
                y: width / 2 + shadowMargin / 2,
                radius: width / 2
              }}
              highlight={false}
            />
          </svg>
        }
        description="Inferred version"
        help={`
        An open node and a siglum in lowercase mark a version no copy's
        features carry at first hand, whether it is reached only through the
        versions derived from it or a copy does no more than state that it
        carries it. Its text is a reconstruction rather than a reading.
        `}
      />

      <LegendRow
        symbol={
          <svg
            width={width + shadowMargin}
            height={width + shadowMargin}
            className="legend"
          >
            <path
              // draw a half-circle that leads down and up again
              d={`
              M ${shadowMargin / 2},${width / 2 + shadowMargin / 2}
              A ${width / 2},${width / 2} 0 0 0 ${width + shadowMargin / 2},${width / 2 + shadowMargin / 2}
            `}
              strokeWidth={4}
              stroke="black"
              strokeOpacity={0.33}
              fill="none"
            />
          </svg>
        }
        description="Intention"
        help={`
          Edges represent the intentions, that lead from one stage to the other.
          Intentions in turn are editorial conclusions based on the factual edits
          (addition or removal of symbols) observed between two versions.
        `}
      />

      <LegendRow
        symbol={
          <svg
            width={width + shadowMargin}
            height={width + shadowMargin}
            className="legend"
          >
            <line
              x1={shadowMargin / 2}
              y1={width + shadowMargin / 2}
              x2={width + shadowMargin / 2}
              y2={shadowMargin / 2}
              stroke="#b45309"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          </svg>
        }
        description="Transfer"
        help={`
          A derivation that crosses to another reproducing system re-spells the
          whole expression vocabulary, so the version names the system it is in.
          A version that stays on the system it was based on names nothing and
          simply inherits it.
        `}
      />

      <LegendRow
        symbol={
          <svg
            width={width + shadowMargin}
            height={width + shadowMargin}
            className="legend"
          >
            <line
              x1={shadowMargin / 2}
              y1={width + shadowMargin / 2}
              x2={width + shadowMargin / 2}
              y2={shadowMargin / 2}
              stroke="#6b7280"
              strokeWidth={1.5}
              strokeDasharray="2 4"
            />
          </svg>
        }
        description="Hypothesis"
        help={`
          A derivation stated beside the one the version's text is read
          against, such as a contamination. It carries no motivations.
        `}
      />

      <LegendRow
        symbol={
          <Stack direction='row' spacing={0.5} sx={{ width: width + shadowMargin, justifyContent: 'center' }}>
            {(['true', 'likely', 'possible', 'unlikely'] as const).map(certainty => (
              <CertaintyIcon key={certainty} certainty={certainty} size={16} />
            ))}
          </Stack>
        }
        description="Truth value"
        help={`
          An editorial assumption is marked by the truth value it is held to
          have: true, likely, possible, or unlikely and false. The mark opens
          the reasons it rests on.
        `}
      />
    </LegendPopover>
  )
}
