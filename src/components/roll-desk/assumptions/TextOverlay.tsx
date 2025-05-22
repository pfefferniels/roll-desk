import { AnyEditorialAssumption } from "linked-rolls";
import React from "react";

type OverlayProps = {
    assumption: AnyEditorialAssumption;
} & React.SVGProps<SVGForeignObjectElement>;

export const TextOverlay = (props: OverlayProps) => {
    const { assumption, ...svgAttrs } = props;

    let text = ''
    if (assumption.type === 'intention') {
        text = assumption.description
    }
    else if (assumption.type === 'question') {
        text = assumption.question
    }

    const width = 150;
    const height = 200;

    return (
        <foreignObject
            width={width}
            height={height}
            {...svgAttrs}
        >
            <div style={{ fontSize: '12px', color: 'black', padding: '5px', backgroundColor: assumption.type === 'question' ? '#CCCCFF' : 'wheat' }}>
                {text}
            </div>
        </foreignObject>
    )
}