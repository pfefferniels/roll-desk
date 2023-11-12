import { useEffect, useRef, useState } from 'react';
import { loadVerovio } from '../../lib/loadVerovio.mjs';
import { useSession } from '@inrupt/solid-ui-react';
import { getFile } from '@inrupt/solid-client';
import { LinkOutlined } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { MEI } from '../../lib/mei';
import * as d3 from 'd3';
import './ScoreViewer.css'

interface ScoreViewerProps {
  // you should either pass url or mei
  url?: string
  mei?: string

  landscape?: boolean
  onSelect?: (noteId: string) => void
  onDone?: (mei: MEI) => void
  asSvg?: boolean
}

export const ScoreViewer = ({ url, mei: meiProp, landscape, onSelect, onDone, asSvg }: ScoreViewerProps) => {
  const { session } = useSession()
  const [mei_, setMEI] = useState<string | undefined>()
  const [vrvToolkit, setVrvToolkit] = useState<any>()
  const [svg, setSvg] = useState<string>()

  const mei = meiProp || mei_

  useEffect(() => {
    loadVerovio().then(toolkit => setVrvToolkit(toolkit))
  }, [])

  useEffect(() => {
    if (!url) return

    const fetchMEI = async () => {
      const meiBlob = await getFile(
        url,
        { fetch: session.fetch as any }
      )
      setMEI(await meiBlob.text() || undefined)
    }

    fetchMEI()
  }, [url, session.fetch])

  useEffect(() => {
    if (!vrvToolkit || !mei) return

    if (landscape) {
      vrvToolkit.setOptions({
        pageWidth: landscape ? 60000 : 2100,
        adjustPageHeight: true,
        adjustPageWidth: true,
        svgHtml5: true,
        svgViewBox: true,
        svgAdditionalAttribute: [
          'artic@resp', 'dir@resp', 'tempo@resp', 'arpeg@resp', 'hairpin@resp', 'dynam@resp', 'app@resp',
          'artic@corresp', 'dir@corresp', 'tempo@corresp', 'arpeg@corresp', 'hairpin@corresp', 'dynam@corresp', 'app@corresp'
        ],
        appXPathQuery: []
      })
    }
    vrvToolkit.loadData(mei)
    setSvg(vrvToolkit.renderToSVG(1))
  }, [mei, landscape, onDone, vrvToolkit])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mei) return
      onDone && onDone(new MEI(mei, vrvToolkit, new DOMParser()))


      document.querySelectorAll('.verovioCanvas .note').forEach(el => {
        el.addEventListener('click', () => {
          onSelect && onSelect(el.getAttribute('data-id') || 'unknown')
        })
      })

      const svgEl = document.querySelector('.verovioCanvas svg')
      if (!svgEl) return
      const svg = d3.select(svgEl);
      svg.insert('rect', '.page-margin')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 1000)
        .attr('height', 300)
        .attr('fill', 'orange')

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .on('zoom', (event: d3.ZoomBehavior<SVGSVGElement, unknown>) => {
          const zoom = (event.transform as any).k
          const x = (event.transform as any).x

          svg.attr('transform', `translate(${x}, 0) scale(${zoom * 2}, ${zoom * 2})`)
        })
      svg.call(zoom as any);
    }, 1000)
    return () => clearTimeout(timer)
  }, [svg, onSelect, mei, onDone, vrvToolkit])

  if (asSvg) {
    return (
      svg ? <svg className='verovioCanvas' dangerouslySetInnerHTML={{ __html: svg }} />
        : <svg><text>loading ...</text></svg>
    )
  }

  return (
    <div>
      <div style={{ marginLeft: '1rem' }}>
        <h4 style={{ margin: 0 }}>
          Score Viewer
          <IconButton onClick={() => window.open(url)}>
            <LinkOutlined />
          </IconButton>
        </h4>
      </div>

      {svg && <div className={`verovioCanvas ${landscape ? 'landscape' : ''}`} dangerouslySetInnerHTML={{ __html: svg }} />}
    </div>
  );
};

