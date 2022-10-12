import { FC } from "react"
import { withAnnotation, WithAnnotationProps } from "./annotation/WithAnnotation"

interface SVGElementConnectorProps extends WithAnnotationProps {
    parentElement: Element
    firstElement: Element
    secondElement: Element
    highlight: boolean
    onAltShiftClick: () => void
    onClick: () => void
}

export const SVGElementConnector: FC<SVGElementConnectorProps> = ({ parentElement, firstElement, secondElement, highlight, onAltShiftClick, onClick, onAnnotation, annotationTarget }): JSX.Element => {
    const parentBox = parentElement.getBoundingClientRect()
    const parentX = parentBox.x
    const parentY = parentBox.y

    return (
        <g>
            <line
                className='innerConnectionLine'
                x1={firstElement.getBoundingClientRect().x - parentX}
                y1={firstElement.getBoundingClientRect().y - parentY}
                x2={secondElement.getBoundingClientRect().x - parentX}
                y2={secondElement.getBoundingClientRect().y - parentY}
                stroke='black'
                strokeWidth={0.7} />
            <line
                className='connectionLine'
                data-original-id={firstElement.getAttribute('id')}
                x1={firstElement.getBoundingClientRect().x - parentX}
                y1={firstElement.getBoundingClientRect().y - parentY}
                x2={secondElement.getBoundingClientRect().x - parentX}
                y2={secondElement.getBoundingClientRect().y - parentY}
                stroke={highlight ? 'blue' : 'black'}
                onClick={(e) => {
                    if (e.altKey && e.shiftKey) {
                        onAltShiftClick()
                    }
                    else if (e.shiftKey && onAnnotation) {
                        onAnnotation(annotationTarget || 'unknown target')
                    }
                    else {
                        onClick()
                    }
                }} />
        </g>
    )
}

export const AnnotatableAlignment = withAnnotation(SVGElementConnector)
