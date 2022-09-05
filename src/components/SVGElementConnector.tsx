import { FC } from "react"

type SVGElementConnectorProps = {
    parentElement: Element,
    firstElement: SVGGraphicsElement,
    secondElement: SVGGraphicsElement,
    highlight: boolean,
    onAltClick: () => void,
    onClick: () => void
}

export const SVGElementConnector: FC<SVGElementConnectorProps> = ({ parentElement, firstElement, secondElement, highlight, onAltClick, onClick }): JSX.Element => {
    const parentBox = parentElement.getBoundingClientRect()
    const parentX = parentBox.x
    const parentY = parentBox.y

    return (
        <line
            className='connectionLine'
            data-original-id={firstElement.getAttribute('id')}
            x1={firstElement.getBoundingClientRect().x - parentX}
            y1={firstElement.getBoundingClientRect().y - parentY}
            x2={secondElement.getBoundingClientRect().x - parentX}
            y2={secondElement.getBoundingClientRect().y - parentY}
            stroke={highlight ? 'blue' : 'black'}
            onClick={(e) => {
                if (e.altKey) {
                    onAltClick()
                }
                else {
                    onClick()
                }
            }} />
    )
}
