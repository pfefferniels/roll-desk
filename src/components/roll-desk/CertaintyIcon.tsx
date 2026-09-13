import { Done, DoneAll, QuestionMarkTwoTone, RadioButtonUnchecked, RemoveDone } from "@mui/icons-material"
import type { SvgIconComponent } from "@mui/icons-material"
import { Certainty } from "linked-rolls"

const icons: Record<Certainty, SvgIconComponent> = {
    true: DoneAll,
    likely: Done,
    possible: QuestionMarkTwoTone,
    unlikely: RemoveDone,
    false: RemoveDone
}

interface CertaintyIconProps {
    /** Left out where nothing is believed of the statement. */
    certainty?: Certainty
    size?: number
}

/** The mark of the truth value a statement is held to have, or an empty circle where nothing is believed of it. */
export const CertaintyIcon = ({ certainty, size = 14 }: CertaintyIconProps) => {
    const Icon = certainty ? icons[certainty] : RadioButtonUnchecked
    return <Icon sx={{ fontSize: size }} />
}
