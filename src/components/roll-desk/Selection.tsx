import { CollatedEvent, Expression, Note } from "linked-rolls/lib/types";

interface SelectionProps {
    pins: (Note | Expression | CollatedEvent)[]
    remove: (pin: (Note | Expression | CollatedEvent)) => void
}

export const Selection = ({ pins, remove }: SelectionProps) => {
    return (
        <g className="selection">
            {pins.map((pin, i) => {
                return (
                    <use
                        key={`selected_${pin.id}`}
                        filter="url(#purple-glow)"
                        href={'#' + pin.id}
                        onClick={() => remove(pin)} />
                )
            })}
        </g>
    )
}
