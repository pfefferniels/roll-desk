import { Shift, Stretch } from "linked-rolls"

interface OperationsAsSecondaryTextProps {
    stretch?: Stretch
    shift?: Shift
}

export const OperationsAsText = ({ stretch, shift }: OperationsAsSecondaryTextProps) => {
    return (
        <div>
            {shift && `${shift.horizontal.toFixed(3)}mm, ${shift.vertical} track(s)`}
            <br />
            {stretch && `${((stretch.factor - 1) * 100).toFixed(3)}%`}
        </div>
    )
}
