import { usePinchZoom } from "../../hooks/usePinchZoom"

interface CursorProps {
    x: number
    fixed?: boolean
    onFix?: () => void
}

export const Cursor = ({ x, fixed, onFix }: CursorProps) => {
    const { translateX } = usePinchZoom()

    const translatedX = translateX(x)

    return (
        <line
            onClick={onFix}
            x1={translatedX}
            y1={0}
            x2={translatedX}
            y2={4000}
            strokeWidth={1}
            stroke='black'
            strokeDasharray={fixed ? 4 : undefined}
            className='cursor' />
    )
}