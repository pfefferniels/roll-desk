import { MutableRefObject, useContext, useEffect, useMemo, useState } from "react"
import { GlobalContext } from "../../providers"
import { Motivation, SemanticAlignmentPair } from "../../lib/AlignedPerformance"
import { MeiNote } from "../../lib/Score"
import { EditMotivation } from "./EditMotivation"
import { AnnotatableAlignment } from "../SVGElementConnector"
import { AlignmentActions } from "./AlignmentActions"
import { MEIGrid, MIDIGrid } from "../grids"

export default function AlignmentEditor() {
  const { alignedPerformance, alignmentReady, triggerUpdate } = useContext(GlobalContext)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [currentAlignmentPair, setCurrentAlignmentPair] = useState<SemanticAlignmentPair>()
  const [activeScoreNote, setActiveScoreNote] = useState<MeiNote>()
  const [svgChanged, setSvgChanged] = useState<number>(0)
  const [observer, setObserver] = useState<any>()
  const [areaRef, setAreaRef] = useState<MutableRefObject<SVGGElement>>()

  const changeMotivation = (pair: SemanticAlignmentPair, target: Motivation) => {
    alignedPerformance.updateMotivation(pair, target)
    triggerUpdate()
  }

  const updateConnectors = () => setSvgChanged(prev => prev + 1)

  useEffect(() => {
    const observer = new MutationObserver((mutationRecords) => updateConnectors());
    setObserver(observer);
  }, []);

  useEffect(() => {
    if (!areaRef || !areaRef.current) {
      console.log('couldnt find area ref element')
      return
    }

    observer.observe(areaRef.current, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true
    });
  }, [areaRef])

  const area = useMemo(() => {
    if (!alignedPerformance.ready()) return

    return (
      <g ref={(ref) => ref && setAreaRef({ current: ref })} data-test={svgChanged}>
        <g className='scoreArea' transform={`translate(0, ${100})`}>
          <MEIGrid
            notes={alignedPerformance.score!.allNotes()}
            activeNote={activeScoreNote}
            setActiveNote={setActiveScoreNote}
          />
        </g>

        <g className='midiArea' transform={`translate(0, ${/*midiDimensions.areaHeight*/ 280})`}>
          <MIDIGrid
            performance={alignedPerformance.rawPerformance!}
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

  const connectors = 
      <g className='connectionLines'>
        {alignedPerformance.getSemanticPairs()
          .filter(pair => pair.midiNote && pair.scoreNote)
          .map((pair, n) => {
            const parentEl = document.querySelector('#alignment')
            const midiNoteEl = document.querySelector(`#${alignedPerformance.rawPerformance!.id}_${pair.midiNote!.id}`)
            const scoreNoteEl = document.querySelector(`#scoreNote_${pair.scoreNote!.id}`)

            if (!parentEl || !midiNoteEl || !scoreNoteEl) {
              console.log('either midi note or score note could not be found')
              return null
            }

            return (
              <AnnotatableAlignment
                key={`connector_${n}_${Date.now()}`}
                annotationTarget={`alignment_${n}`}
                parentElement={parentEl}
                firstElement={scoreNoteEl}
                secondElement={midiNoteEl}
                highlight={pair.motivation !== Motivation.ExactMatch}
                onAltShiftClick={() => {
                  alignedPerformance.removeAlignment(pair)
                  triggerUpdate()
                }}
                onClick={() => {
                  setCurrentAlignmentPair(pair)
                  setEditDialogOpen(true)
                }} />)
          })}
      </g>

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



