import { Shift, Stretch } from "linked-rolls"

interface OperationsAsSecondaryTextProps {
    stretch?: Stretch
    shift?: Shift
}

export const OperationsAsText = ({ stretch, shift }: OperationsAsSecondaryTextProps) => {
    return (
        <div>
            {shift && `${(shift.horizontal / 10).toFixed(2)}cm, ${shift.vertical} track(s)`}
            <br />
            {stretch && `${((stretch.factor - 1) * 100).toFixed(3)}%`}
        </div>
    )
}
