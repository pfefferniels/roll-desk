import React, { FC } from "react";

interface SystemProps {
  staffSize: number;
  spacing: number;
  children?: React.ReactNode;
}

export const System: FC<SystemProps> = ({ children, staffSize, spacing }): JSX.Element => {
  return (
    <g className='system'>
      {React.Children.map(children, (child, n) => {
        return (
          <g transform={`translate(0, ${spacing * staffSize * n})`}>
            {child}
          </g>
        );
      })}
    </g>
  );
};

