import { AnyEditorialAssumption } from "linked-rolls";
import React from "react";
import { createPortal } from "react-dom";

type OverlayProps = {
    assumption: AnyEditorialAssumption,
    highlight: boolean
} & React.SVGProps<SVGForeignObjectElement>;

export const TextOverlay = (props: OverlayProps) => {
    const { assumption, highlight, ...svgAttrs } = props;

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
        <>
            {createPortal((
                <foreignObject
                    width={width}
                    height={height}
                    {...svgAttrs}
                >
                    <div style={{
                        fontSize: '12px',
                        padding: '5px',
                        backgroundColor: assumption.type === 'question' ? '#CCCCFF' : 'wheat',
                        opacity: highlight ? 1 : 0.5
                    }}>
                        <span style={{ color: 'gray' }}>[{assumption.type}]</span> {text}
                    </div>
                </foreignObject>
            ), document.querySelector('.overlayContainer')!
            )}
        </>
    )
}
