import { Thing, getUrlAll, getThing, getUrl, getInteger } from "@inrupt/solid-client";
import { DatasetContext } from "@inrupt/solid-ui-react";
import { useContext } from "react";
import { crm, midi } from "../../helpers/namespaces";
import { Note } from "./Note";
import { RDF } from "@inrupt/vocab-common-rdf";
import { Pedal } from "./Pedal";
import { typeOf } from "../../helpers/typeOfEvent";

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

  const notes = events.filter(event => typeOf(event) === 'note')
  const pedals = events.filter(event => typeOf(event) === 'pedal')
  
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

