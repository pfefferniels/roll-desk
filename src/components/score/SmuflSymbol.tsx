import { FC } from "react";
import { glyphs } from "./BravuraGlyphs"
import { glyphnames } from "./glyphnames";

interface SmuflSymbolProps {
  name: string,
  id?: string;
  x: number;
  y: number;
  staffSize: number;
  active?: boolean;
  missingNote?: boolean;
  onClick?: () => void;
}

const glyphNameToCodePoint = (glyphname: string) => {
  return glyphname.replace('U+', 'uni')
}

/**
 * Draw a SMUFL character into a given SVG.
 */
export const SmuflSymbol: FC<SmuflSymbolProps> = ({ name, id, x, y, staffSize, active, missingNote, onClick }): JSX.Element => {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path
        id={`scoreNote_${id}`}
        transform="scale(0.03,-0.03)"
        height={1} width={1}
        x={0} y={0}
        stroke='red'
        strokeWidth={active ? 80 : 0}
        fill={missingNote ? 'red' : 'black'}
        className={`scoreNote`}
        onClick={onClick}
        d={glyphs[glyphNameToCodePoint(glyphnames[name].codepoint)]}>
      </path>
    </g>
  );
};
