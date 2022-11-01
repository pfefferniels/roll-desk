import { graph, Store } from "rdflib";
import { useState } from "react";
import { MidiOutputProvider, RdfStoreContext } from "./providers";

export default function Viewer() {
  const [rdfStore] = useState<Store>(graph())

  return (
    <div className="viewer">
      <MidiOutputProvider>
        <RdfStoreContext.Provider value={rdfStore && {
          rdfStore: rdfStore
        }}>
            <article>
                <h2>Browse</h2>
                <ul>
                    <li>X spielt Y</li>
                </ul>
            </article>
            <div>
                [annotated verovio display]
            </div>
        </RdfStoreContext.Provider>
      </MidiOutputProvider>
    </div>
  );
}
