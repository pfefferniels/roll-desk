import { CollatedEvent, Expression, Note } from "linked-rolls/lib/.ldo/rollo.typings";

interface PinContainerProps {
    pins: (Note | Expression | CollatedEvent)[]
    remove: (pin: (Note | Expression | CollatedEvent)) => void
}

export const PinContainer = ({ pins, remove }: PinContainerProps) => {
    return (
        <g className="pins">
            {pins.map((pin, i) => {
                return (
                    <use
                        filter="url(#purple-glow)"
                        href={'#' + pin['@id']}
                        onClick={() => remove(pin)} />
                )
            })}
        </g>
    )
}