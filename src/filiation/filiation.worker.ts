import { proposeStemma } from "linked-rolls"
import type { FiliationReply, FiliationRequest } from "./filiation"

/**
 * Proposes a stemma away from the page. Scoring every stemma of six
 * copies takes a second or more, through which the desk would otherwise
 * stand still.
 */
self.onmessage = ({ data: { edition, options } }: MessageEvent<FiliationRequest>) => {
    let reply: FiliationReply
    try {
        reply = { proposal: proposeStemma(edition, options) }
    }
    catch (error) {
        reply = { refusal: error instanceof Error ? error.message : String(error) }
    }
    self.postMessage(reply)
}
