import { useEffect, useState } from 'react';
import { loadVerovio } from '../../lib/globals';
import { useSession } from '@inrupt/solid-ui-react';
import { getFile } from '@inrupt/solid-client';
import { LinkOutlined } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { Mei } from '../../lib/mei';
import './ScoreViewer.css'

interface ScoreViewerProps {
  // you should either pass url or mei
  url?: string
  mei?: string

  landscape?: boolean
  onSelect?: (noteId: string) => void
  onDone?: (mei: Mei) => void
  asSvg?: boolean
}

export const ScoreViewer = ({ url, mei: meiProp, landscape, onSelect, onDone, asSvg }: ScoreViewerProps) => {
  const { session } = useSession()
  const [mei, setMei] = useState<string | undefined>(meiProp)
  const [vrvToolkit, setVrvToolkit] = useState<any>()
  const [svg, setSvg] = useState<string>()

  useEffect(() => setMei(meiProp), [meiProp])

  useEffect(() => {
    loadVerovio().then(toolkit => setVrvToolkit(toolkit))
  }, [])

  useEffect(() => {
    if (!url) return

    const fetchMei = async () => {
      const meiBlob = await getFile(
        url,
        { fetch: session.fetch as any }
      )
      setMei(await meiBlob.text() || undefined)
    }

    fetchMei()
  }, [url, session.fetch])

  useEffect(() => {
    if (!vrvToolkit || !mei) return

    onDone && onDone(new Mei(mei, vrvToolkit, new DOMParser()))

    if (landscape) {
      vrvToolkit.setOptions({
        pageWidth: landscape ? 60000 : 2100,
        adjustPageHeight: true,
        adjustPageWidth: true,
        svgHtml5: true,
        svgViewBox: true,
      })
    }
    vrvToolkit.loadData(mei)
    setSvg(vrvToolkit.renderToSVG(1))
  }, [mei, landscape, onDone, vrvToolkit])

  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll('.verovioCanvas .note').forEach(el => {
        el.addEventListener('click', () => {
          onSelect && onSelect(el.getAttribute('data-id') || 'unknown')
        })
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [svg, onSelect])

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

