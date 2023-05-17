import { Thing, getUrlAll, getThing, getUrl } from "@inrupt/solid-client";
import { DatasetContext } from "@inrupt/solid-ui-react";
import { useContext } from "react";
import { crm, midi } from "../../helpers/namespaces";
import { Note } from "./Note";

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


  return (
    <g>
      {events.map((event, index) => {
        if (getUrl(event, crm('P2_has_type')) === midi('NoteEvent')) {
          return (
            <Note
              key={index}
              note={event}
              color={color}
            />
          )
        }
      })}
    </g>
  )
}

