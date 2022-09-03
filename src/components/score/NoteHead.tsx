import { FC } from "react";

interface NoteHeadProps {
  id: string;
  x: number;
  y: number;
  staffSize: number;
  active: boolean;
  missingNote: boolean;
  accidentals: number;
  onClick: () => void;
}
/**
 * Draws a stemless notehead in SVG
 */
export const NoteHead: FC<NoteHeadProps> = ({ id, x, y, staffSize, active, missingNote, accidentals, onClick }): JSX.Element => {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {{
        '-1': <text x={-2.5 * staffSize} y={staffSize / 2}>b</text>,
        '1': <text x={-2.5 * staffSize} y={staffSize / 2}>♯</text>
      }[accidentals.toString()] || <text></text>}
      <ellipse
        id={`scoreNote_${id}`}
        className='scoreNote'
        cx={0}
        cy={0}
        ry={staffSize / 2}
        rx={staffSize}
        fill={missingNote ? 'red' : 'black'}
        strokeWidth={active ? 2 : 1}
        onClick={onClick} />
    </g>
  );
};
