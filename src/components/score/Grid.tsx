import React, { FC } from "react";

export type Clef = 'G' | 'F'

interface GridProps {
  children: (fn: any) => React.ReactNode
  type: 'music-staff' | 'midi' | 'euclidean'
  clef: Clef
  staffSize: number
  width: number
}

/**
 * Draws SVG staff lines using the standard F and G clef.
 */
export const Grid: FC<GridProps> = ({ children, staffSize, width, clef }): JSX.Element => {
  const getVerticalPosition = (pnum: number) => {
    const staffLocationsByClef = {
      G: 76,
      F: 56
    }
    
    const start = staffLocationsByClef[clef]
  
    const diatonicPitchOf = (pnum: number) => {
      return [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][(pnum) % 12]
    }

    const diatonicPitch = diatonicPitchOf(pnum)
    const startDiatonicPitch = diatonicPitchOf(start)
    const relativeDiatonicPitch = diatonicPitch - startDiatonicPitch
    
    const octaveOf = (pnum: number) => Math.trunc(pnum / 12 - 1)
    const relativeOctave = octaveOf(pnum) - octaveOf(start)

    return (-(relativeOctave * 6 + relativeDiatonicPitch) + 3) * (staffSize / 2)
  }

  return (
    <g className='staff'>
      {[1, 2, 3, 4, 5].map(lineNumber => (
        <line
          key={`line${Date.now()}-${lineNumber}`}
          className='staffLine'
          x1={0}
          y1={lineNumber * staffSize}
          x2={width}
          y2={lineNumber * staffSize}
          stroke='black'
          strokeWidth={0.4} />
      ))}
      {children(getVerticalPosition)}
    </g>
  )
}


