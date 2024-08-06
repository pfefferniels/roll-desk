import { AnyRollEvent, CollatedEvent } from "linked-rolls/lib/types";

interface SelectionProps {
    pins: (AnyRollEvent | CollatedEvent)[]
    remove: (pin: (AnyRollEvent | CollatedEvent)) => void
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
