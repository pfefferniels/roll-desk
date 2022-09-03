import { FC } from "react";

interface StaffLineProps {
  verticalStretch: number;
  verticalOffset: number;
}
/**
 * Draws SVG staff lines using the standard F and G clef.
 */
export const StaffLines: FC<StaffLineProps> = ({ verticalStretch, verticalOffset }): JSX.Element => {
  return (
    <g>
      {[43, 47, 50, 53, 57,
        64, 67, 71, 74, 77] // for right hand
        .map(pitch => ((127 - pitch) * verticalStretch + verticalOffset))
        .map(yPosition => (
          <line
            x1={0}
            y1={yPosition}
            x2={2000}
            y2={yPosition}
            stroke='black'
            strokeWidth={0.4} />
        ))}
    </g>

  );
};
