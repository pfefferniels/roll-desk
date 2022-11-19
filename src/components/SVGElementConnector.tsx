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
            <path
                className='innerConnectionLine'
                d={`M ${firstElement.getBoundingClientRect().x - parentX},${firstElement.getBoundingClientRect().y - parentY}
                    C ${firstElement.getBoundingClientRect().x - parentX},${firstElement.getBoundingClientRect().y + 90 - parentY}
                      ${secondElement.getBoundingClientRect().x - parentX},${secondElement.getBoundingClientRect().y - 90 - parentY}
                      ${secondElement.getBoundingClientRect().x - parentX},${secondElement.getBoundingClientRect().y - parentY}`}
                stroke='black'
                fill='none'
                strokeWidth={0.7}/>
            <path
                data-original-id={firstElement.getAttribute('id')}
                className='connectionLine'
                d={`M ${firstElement.getBoundingClientRect().x - parentX},${firstElement.getBoundingClientRect().y - parentY}
                    C ${firstElement.getBoundingClientRect().x - parentX},${firstElement.getBoundingClientRect().y + 90 - parentY}
                      ${secondElement.getBoundingClientRect().x - parentX},${secondElement.getBoundingClientRect().y - 90 - parentY}
                      ${secondElement.getBoundingClientRect().x - parentX},${secondElement.getBoundingClientRect().y - parentY}`}
                fill='none'
                strokeWidth={0.7}
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
