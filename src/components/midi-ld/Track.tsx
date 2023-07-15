import { Thing, getUrlAll, getThing, getUrl, getInteger } from "@inrupt/solid-client";
import { DatasetContext } from "@inrupt/solid-ui-react";
import { useContext } from "react";
import { crm, midi } from "../../helpers/namespaces";
import { Note } from "./Note";
import { RDF } from "@inrupt/vocab-common-rdf";
import { Pedal } from "./Pedal";

interface TrackProps {
  track: Thing,
  color: string;
}

export const Track: React.FC<TrackProps> = ({ track, color }) => {
  const { solidDataset } = useContext(DatasetContext)

  if (!solidDataset) return null

  const events =
    getUrlAll(track, midi('hasEvent'))
      .reduce((acc, url) => {
        const event = getThing(solidDataset, url)
        if (event) acc.push(event)
        return acc
      }, [] as Thing[]);

  const notes = events.filter(event =>
    getUrl(event, crm('P2_has_type')) === midi('NoteEvent'))

  const pedals = events.filter(event =>
    getUrlAll(event, RDF.type).includes(midi('ControllerEvent')) &&
    getInteger(event, midi('controllerType')) === 64)
  
  return (
    <>
      <g>
        {notes.map((note, index) => (
          <Note
            key={`note_${index}`}
            note={note}
            color={color}
          />
        ))}
      </g>
      <g>
        {pedals.map((pedal, index) => (
          <Pedal
            key={`pedal_${index}`}
            pedal={pedal} />
        ))}
      </g>
    </>
  )
}

