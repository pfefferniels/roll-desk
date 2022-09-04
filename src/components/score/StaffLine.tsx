import { FC } from "react";

interface StaffLineProps {
  staffSize: number
  width: number
}

/**
 * Draws SVG staff lines using the standard F and G clef.
 */
export const StaffLines: FC<StaffLineProps> = ({ staffSize, width }): JSX.Element => {
  return (
    <g>
      {[43, 47, 50, 53, 57,
        64, 67, 71, 74, 77] // for right hand
        .map(pitch => ((127 - pitch) * staffSize))
        .map(yPosition => (
          <line
            x1={0}
            y1={yPosition}
            x2={width}
            y2={yPosition}
            stroke='black'
            strokeWidth={0.4} />
        ))}
    </g>

  );
};
