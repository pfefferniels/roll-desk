import { useContext, useMemo, useState } from "react"
import GlobalContext from "../GlobalContext"
import { Motivation, SemanticAlignmentPair } from "../../lib/AlignedPerformance"
import { MeiNote } from "../../lib/Score"
import { EditMotivation } from "./EditMotivation"
import { SVGElementConnector } from "../SVGElementConnector"
import { AlignmentActions } from "./AlignmentActions"
import { MEIGrid, MIDIGrid } from "../grids"

export default function AlignmentEditor() {
  const { alignedPerformance, alignmentReady, triggerUpdate } = useContext(GlobalContext)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [currentAlignmentPair, setCurrentAlignmentPair] = useState<SemanticAlignmentPair>()
  const [activeScoreNote, setActiveScoreNote] = useState<MeiNote>()
  const [svgRef, setSvgRef] = useState<number>(0)

  const changeMotivation = (pair: SemanticAlignmentPair, target: Motivation) => {
    alignedPerformance.updateMotivation(pair, target)
    triggerUpdate()
  }

  const area = useMemo(() => {
    return (
      <g ref={(el) => {
        if (el/* && !el.isEqualNode(svgRef)*/) {
          console.log('updating alignment display')
          setSvgRef(svgRef + 1)
        }
      }}>
        <g className='scoreArea' transform={`translate(0, ${100})`}>
          <MEIGrid
            notes={alignedPerformance.getSemanticPairs().filter(p => p.scoreNote !== undefined).map(p => p.scoreNote!)}
            activeNote={activeScoreNote}
            setActiveNote={setActiveScoreNote}
          />
        </g>

        <g className='midiArea' transform={`translate(0, ${/*midiDimensions.areaHeight*/ 280})`}>
          <MIDIGrid
            notes={alignedPerformance.getSemanticPairs().filter(p => p.midiNote !== undefined).map(p => p.midiNote!)}
            setActiveNote={(note) => {
              if (!activeScoreNote) return

              alignedPerformance.align(note, activeScoreNote)
              setActiveScoreNote(undefined)
              triggerUpdate()
            }}
          />
        </g>
      </g>
    )
  }, [activeScoreNote, alignedPerformance, alignmentReady])

  const connectors = useMemo(() => {
    if (!svgRef) return null

    return (
      <g className='connectionLines'>
        {alignedPerformance.getSemanticPairs()
          .filter(pair => pair.midiNote && pair.scoreNote)
          .map((pair, n) => {
            const parentEl = document.querySelector('#alignment')
            const midiNoteEl = document.querySelector(`#midiNote_${pair.midiNote!.id}`)
            const scoreNoteEl = document.querySelector(`#scoreNote_${pair.scoreNote!.id}`)

            if (!parentEl || !midiNoteEl || !scoreNoteEl) {
              console.log('either midi note or score note could not be found')
              return null
            }

            return (
              <SVGElementConnector
                key={`connector_${n}_${Date.now()}`}
                parentElement={parentEl}
                firstElement={scoreNoteEl}
                secondElement={midiNoteEl}
                highlight={pair.motivation !== Motivation.ExactMatch}
                onAltClick={() => {
                  alignedPerformance.removeAlignment(pair)
                  triggerUpdate()
                }}
                onClick={() => {
                  setCurrentAlignmentPair(pair)
                  setEditDialogOpen(true)
                }} />)
          })}
      </g>
    )
  }, [svgRef, currentAlignmentPair, alignmentReady, alignedPerformance])

  return (
    <div
      tabIndex={0}
    >
      {alignedPerformance.ready() && (
        <AlignmentActions alignedPerformance={alignedPerformance} triggerUpdate={triggerUpdate} />
      )}

      {alignedPerformance.ready() && (
        <svg
          id='alignment'
          width={/*maxWidth*/ 5000}
          height={/*midiDimensions.areaHeight * 2*/ 560}
          style={{ margin: '1rem' }}>
          {area}
          {connectors}
        </svg>
      )}

      <EditMotivation
        pair={currentAlignmentPair}
        changeMotivation={changeMotivation}
        dialogOpen={editDialogOpen}
        setDialogOpen={setEditDialogOpen} />
    </div>
  )
}



