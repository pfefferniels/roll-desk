import { RefObject, useEffect, useState } from "react";

export default function useIsVisible(ref: RefObject<Element | null>): boolean {
    const [isIntersecting, setIntersecting] = useState(false);

    useEffect(() => {
        if (!ref.current) return 

        // Create an IntersectionObserver to observe the ref's visibility
        const observer = new IntersectionObserver(([entry]) =>
            setIntersecting(entry.isIntersecting)
        );

        // Start observing the element
        observer.observe(ref.current);

        // Cleanup the observer when the component unmounts or ref changes
        return () => {
            observer.disconnect();
        };
    }, [ref]);

    return isIntersecting;
}
