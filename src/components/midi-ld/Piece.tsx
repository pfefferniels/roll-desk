import { getUrlAll, getThing, Thing, SolidDataset } from "@inrupt/solid-client"
import { useRef, useEffect } from "react"
import { midi } from "../../helpers/namespaces"
import { Track } from "./Track"
import { NoteProvider } from "../../providers/NoteContext"
import * as d3 from 'd3';

interface PieceProps {
  piece: Thing

  // the dataset in which the piece lives
  dataset: SolidDataset
  pixelsPerTick?: number
  noteHeight?: number
  onSelect: (note: Thing) => void

  /**
   * gets called when the user shifts
   * the boundaries of a note
   */
  onChange: (newAttributes: Thing[]) => void
}

export const Piece = ({ piece, dataset: solidDataset, pixelsPerTick, noteHeight, onSelect, onChange }: PieceProps) => {
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

  // since the MIDI data can be is deeply nested
  // we're using a provider to pass the settings 
  // and callbacks down to the single components.
  return (
    <svg ref={ref} width={1000} height={128 * (noteHeight || 8)}>
      <g id='roll'>
        <NoteProvider
          pixelsPerTick={pixelsPerTick || 0.5}
          noteHeight={noteHeight || 9}
          onSelect={onSelect}
          onChange={onChange}>
          {tracks.map((track, trackIndex) => (
            <Track
              track={track}
              key={trackIndex}
              color={trackColors[trackIndex % trackColors.length]}
            />
          ))}
        </NoteProvider>
      </g>
    </svg>
  );
};
