import { FC } from "react";
import { WithAnnotationProps } from "../annotation/WithAnnotation";
import { glyphs } from "./BravuraGlyphs"
import { glyphnames } from "./glyphnames";

interface SmuflSymbolProps extends WithAnnotationProps {
  name: string,
  x: number;
  y: number;
  staffSize: number;
  active?: boolean;
  missingNote?: boolean;
  onClick?: (e?: any) => void;
}

const glyphNameToCodePoint = (glyphname: string) => {
  return glyphname.replace('U+', 'uni')
}

/**
 * Draw a SMUFL character into a given SVG.
 */
export const SmuflSymbol: FC<SmuflSymbolProps> = ({ name, x, y, staffSize, active, missingNote, onClick, annotationTarget, onAnnotation }): JSX.Element => {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path
        id={`scoreNote_${annotationTarget}`}
        transform="scale(0.03,-0.03)"
        height={1}
        width={1}
        x={0} y={0}
        stroke='red'
        strokeWidth={active ? 80 : 0}
        fill={missingNote ? 'red' : 'black'}
        className={`scoreNote`}
        onClick={(e) => {
          if (onAnnotation && e.altKey) {
            onAnnotation(annotationTarget || 'unknown')
          }
          else if (onClick) {
            onClick()
          }
        }}
        d={glyphs[glyphNameToCodePoint(glyphnames[name].codepoint)]}>
      </path>
    </g>
  );
};
