import { useContext, useEffect } from "react";
import { AnnotationContext, RdfStoreContext } from "../../providers";
import * as rdf from "rdflib";

const OA = new (rdf.Namespace as any)('http://www.w3.org/ns/oa#')
const ME = new (rdf.Namespace as any)('https://measuring-early-records.org/')
const RDF = new (rdf.Namespace as any)('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
const DC = new (rdf.Namespace as any)('http://purl.org/dc/terms/')

export interface WithAnnotationProps {
    onAnnotation?: (annotationTarget: string) => void,
    annotationTarget?: string
}

export function withAnnotation<T extends WithAnnotationProps = WithAnnotationProps>(
    WrappedComponent: React.ComponentType<T>
) {
    const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";

    const ComponentWithAnnotation = (props: T) => {
        const { targets, setTargets } = useContext(AnnotationContext)
        const rdfStore = useContext(RdfStoreContext)

        const findExistingAnnotation = (target: string) => {
            console.log('searching for', props.annotationTarget, 'in', rdfStore)
            if (!rdfStore) {
                console.warn('Failed loading RDF store')
                return
            }

            const store = rdfStore.rdfStore

            store.anyStatementMatching(undefined, OA('hasTarget'), ME(target))
        }

        return (
            <>
                <WrappedComponent
                    onAnnotation={(annotationTarget) => {
                        // do not set a target twice
                        if (targets.includes(annotationTarget)) return

                        setTargets([
                            ...targets, 
                            annotationTarget
                        ])
                    }}
                    {...(props as T)} />
            </>
        );
    };

    ComponentWithAnnotation.displayName = `withAnnotation(${displayName})`;

    return ComponentWithAnnotation;
}
