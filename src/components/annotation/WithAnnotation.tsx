import { useContext } from "react";
import { AnnotationContext } from "../../providers";

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
