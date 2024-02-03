import { Shifting, Stretching } from "linked-rolls/lib/.ldo/rollo.typings"

interface OperationsAsSecondaryTextProps {
    operations: (Shifting | Stretching)[]
}

export const OperationsAsText = ({ operations }: OperationsAsSecondaryTextProps) => {
    return (
        <div>
            {operations.map((op, i) => (
                <div key={op["@id"] || `op_${i}`}>
                    {op.type["@id"]}:{' '}
                    {op.type["@id"] === 'Shifting' && `${(op as Shifting).horizontal.toFixed(3)}mm, ${(op as Shifting).vertical}`}
                    {op.type["@id"] === 'Stretching' && `${(((op as Stretching).factor - 1) * 100).toFixed(3)}%`}
                </div>
            ))}
        </div >
    )
}