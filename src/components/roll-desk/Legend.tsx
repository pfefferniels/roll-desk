import { Help } from "@mui/icons-material"
import { Box, Paper, Stack, Tooltip, IconButton, Popover } from "@mui/material"
import { ReactNode, useState } from "react"
import { NavigationNode } from "./Stemma"

interface LegendRowProps {
  symbol: ReactNode
  description: string
  help?: string
}

const LegendRow = ({ symbol, description, help }: LegendRowProps) => {
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

export const Legend = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const width = 35
  const shadowMargin = 25

  return (
    <>
      <IconButton
        onClick={(event) => setAnchorEl(anchorEl ? null : event.currentTarget)}
      >
        <Help />
      </IconButton>
      <Popover anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <Stack direction="column" sx={{ p: 2}}>
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
                    type: 'edition',
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
        </Stack>
      </Popover>
    </>
  )
}