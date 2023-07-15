import React, { useEffect, useState } from 'react';
import { loadVerovio } from '../../lib/globals';
import { useSession } from '@inrupt/solid-ui-react';
import { getFile, getUrl } from '@inrupt/solid-client';
import { RDFS } from '@inrupt/vocab-common-rdf';

interface ScoreViewerProps {
  url: string
}

export const ScoreViewer = ({ url }: ScoreViewerProps) => {
  const { session } = useSession()
  const [mei, setMei] = useState<string>()
  const [vrvToolkit, setVrvToolkit] = useState<any>()
  const [svg, setSvg] = useState<string>()

  useEffect(() => {
    loadVerovio().then(toolkit => setVrvToolkit(toolkit))
  }, [])

  useEffect(() => {
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

    vrvToolkit.loadData(mei)
    setSvg(vrvToolkit.renderToSVG(1))
  }, [svg, vrvToolkit])

  return (
    <div>
      {svg && <div dangerouslySetInnerHTML={{ __html: svg }} />}
    </div>
  );
};

