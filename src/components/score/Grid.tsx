import React, { FC, useState } from "react";

interface GenericGridProps {
  children: ((fn: any) => React.ReactNode)[] | ((fn: any) => React.ReactNode)
  width: number
}

export type Clef = 'G' | 'F'

interface StaffLikeGridProps extends GenericGridProps {
  clef: Clef
  staffSize: number
}

/**
 * Draws SVG staff lines using the standard F and G clef.
 */
export const StaffLikeGrid: FC<StaffLikeGridProps> = ({ children, staffSize, width, clef }): JSX.Element => {
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

    return (-(relativeOctave * 7 + relativeDiatonicPitch) + 3) * (staffSize / 2)
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
      {Array.isArray(children) ? children.map(child => child(getVerticalPosition)) : children(getVerticalPosition)}
    </g>
  )
}


interface MidiLikeGridProps extends GenericGridProps {
  // vertical space required to display a single MIDI pitch
  pitchHeight: number
}

/**
 * Draws a MIDI grid
 */
export const MidiLikeGrid: FC<MidiLikeGridProps> = ({ children, pitchHeight, width }): JSX.Element => {
  const range = [21, 84] // normal pianos range from A0 to C8, 88 keys in total
  const getVerticalPosition = (pnum: number) => {
    return (range[1] - pnum) * pitchHeight
  }

  return (
    <g className='midi-grid'>
      {Array.from(Array(88).keys()).map(pitch => {
        const y = getVerticalPosition(pitch + range[0])
        const bold = ((pitch + range[0] + 1) % 12) === 0 

        return (
          <g>
            {bold ? (
              <text y={y} x={0} className='labelText'>C{(pitch + range[0] + 1) / 12 - 1}</text>
            ) : null}
            <line
              key={`line${Date.now()}-${pitch}`}
              className={`midiLine${bold ? ' bold' : ''}`}
              x1={0}
              y1={y}
              x2={width}
              y2={y} />
          </g>
        )
      })}
      {Array.isArray(children) ? children.map(child => child(getVerticalPosition)) : children(getVerticalPosition)}
    </g>
  )
}

interface GraphicalLikeGridProps extends GenericGridProps {
  numberOfRows: number
}

/**
 * Draws a Grid for graphical notation
 */
export const GraphicalLikeGrid: FC<GraphicalLikeGridProps> = ({ children, numberOfRows, width }): JSX.Element => {

  const rowHeight = 50
  const getVerticalPosition = (row: number) => {
    return (row + 1) * rowHeight
  }

  return (
    <g className='graphical-grid'>
      {Array.from(Array(numberOfRows).keys()).map(lineNumber => (
        <line
          key={`line${Date.now()}-${lineNumber}`}
          className='separator-line'
          x1={0}
          y1={getVerticalPosition(lineNumber)}
          x2={width}
          y2={getVerticalPosition(lineNumber)} />
      ))}
      {Array.isArray(children) ? children.map(child => child(getVerticalPosition)) : children(getVerticalPosition)}
    </g>
  )
}
