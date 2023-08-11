import React from 'react'

interface PairProps {
    parent: Element
    to: Element
    from: Element
    color: string
    onAltShiftClick: () => void
    onClick: () => void
}

export const Pair = ({ parent, to, from, color, onAltShiftClick, onClick }: PairProps) => {
    const parentBox = parent.getBoundingClientRect()
    const parentX = parentBox.x
    const parentY = parentBox.y

    return (
        <g>
            <path
                className='innerConnectionLine'
                d={`M ${to.getBoundingClientRect().x - parentX},${to.getBoundingClientRect().y - parentY}
                    C ${to.getBoundingClientRect().x - parentX},${to.getBoundingClientRect().y + 90 - parentY}
                      ${from.getBoundingClientRect().x - parentX},${from.getBoundingClientRect().y - 90 - parentY}
                      ${from.getBoundingClientRect().x - parentX},${from.getBoundingClientRect().y - parentY}`}
                stroke='black'
                fill='none'
                strokeWidth={0.7}/>
            <path
                data-original-id={to.getAttribute('id')}
                className='connectionLine'
                d={`M ${to.getBoundingClientRect().x - parentX},${to.getBoundingClientRect().y - parentY}
                    C ${to.getBoundingClientRect().x - parentX},${to.getBoundingClientRect().y + 90 - parentY}
                      ${from.getBoundingClientRect().x - parentX},${from.getBoundingClientRect().y - 90 - parentY}
                      ${from.getBoundingClientRect().x - parentX},${from.getBoundingClientRect().y - parentY}`}
                fill='none'
                strokeWidth={0.7}
                stroke={color}
                onClick={(e) => {
                    if (e.altKey && e.shiftKey) {
                        onAltShiftClick()
                    }
                    else {
                        onClick()
                    }
                }} />
        </g>
    )
}
