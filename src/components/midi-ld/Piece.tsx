import { getUrlAll, getThing, Thing } from "@inrupt/solid-client"
import { ThingContext, DatasetContext } from "@inrupt/solid-ui-react"
import { useContext, useRef, useEffect } from "react"
import { midi } from "../../helpers/namespaces"
import { Track } from "./Track"
import { useNoteContext } from "../../providers/NoteContext"
import { UncontrolledReactSVGPanZoom } from 'react-svg-pan-zoom';

export const Piece = () => {
  const { thing: piece } = useContext(ThingContext)
  const { solidDataset } = useContext(DatasetContext)
  const { noteHeight } = useNoteContext()

  if (!piece || !solidDataset) return null

  const tracks = getUrlAll(piece, midi('hasTrack'))
    .reduce((acc, url) => {
      const track = getThing(solidDataset, url)
      if (track) acc.push(track)
      return acc
    }, [] as Thing[])

  const trackColors = ["red", "blue", "green", "purple", "orange"];

  return (
      <svg width={10000} height={128 * noteHeight}>
        {tracks.map((track, trackIndex) => (
          <Track
            track={track}
            key={trackIndex}
            color={trackColors[trackIndex % trackColors.length]}
          />
        ))}
      </svg>
  );
};
