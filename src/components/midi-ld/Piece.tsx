import { getUrlAll, getThing, Thing } from "@inrupt/solid-client"
import { ThingContext, DatasetContext } from "@inrupt/solid-ui-react"
import { useContext, useRef, useEffect } from "react"
import { midi } from "../../helpers/namespaces"
import { Track } from "./Track"
import { useNoteContext } from "../../providers/NoteContext"
import * as d3 from 'd3';

export const Piece = () => {
  const { thing: piece } = useContext(ThingContext)
  const { solidDataset } = useContext(DatasetContext)
  const { noteHeight } = useNoteContext()
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    const zoom = d3.zoom()
      .on('zoom', (event) => {
        svg
          .select('#roll')
          .attr('transform', event.transform);
      })
    svg.call(zoom as any);
  }, [ref, ref.current]);


  if (!piece || !solidDataset) return null

  const tracks = getUrlAll(piece, midi('hasTrack'))
    .reduce((acc, url) => {
      const track = getThing(solidDataset, url)
      if (track) acc.push(track)
      return acc
    }, [] as Thing[])

  const trackColors = ["red", "blue", "green", "purple", "orange"];

  return (
    <svg ref={ref} width={1000} height={128 * noteHeight}>
      <g id='roll'>
        {tracks.map((track, trackIndex) => (
          <Track
            track={track}
            key={trackIndex}
            color={trackColors[trackIndex % trackColors.length]}
          />
        ))}
      </g>
    </svg>
  );
};
