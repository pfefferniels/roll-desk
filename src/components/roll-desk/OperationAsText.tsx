import { Shifting, Stretching } from "linked-rolls"

interface OperationsAsSecondaryTextProps {
    operations: (Shifting | Stretching)[]
}

export const OperationsAsText = ({ operations }: OperationsAsSecondaryTextProps) => {
    return (
        <div>
            {operations.map((op, i) => (
                <div key={`op_${i}`}>
                    {op.type}:{' '}
                    {op.type === 'shifting' && `${(op as Shifting).horizontal.toFixed(3)}mm, ${(op as Shifting).vertical}`}
                    {op.type === 'stretching' && `${(((op as Stretching).factor - 1) * 100).toFixed(3)}%`}
                </div>
            ))}
        </div>
    )
}