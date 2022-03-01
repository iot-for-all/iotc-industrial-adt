import * as React from 'react';

export interface UseVisibilityOptions {
    /** The target element to observe */
    target: React.RefObject<HTMLElement>;
    /** The function to call on intersection change. If the callback doesn't accept any arguments, it only gets called once when the element becomes visible */
    callback: () => void | IntersectionObserverCallback;
    /** The element that is used as the viewport for checking visibility of the target. Must be the ancestor of the target. Defaults to the browser viewport if not specified or if null. */
    root?: React.RefObject<HTMLElement>;
    /** Margin around the root. Can have values similar to the CSS margin property */
    rootMargin?: string;
    /** Either a single number or an array of numbers which indicate at what percentage of the target's visibility the observer's callback should be executed. */
    threshold?: number | number[];
}

/**
 * Hook that triggers a callback function when the target element becomes visible
 * @param options {UseVisibilityOptions}
 */
export function useVisibility(options: UseVisibilityOptions) {
    React.useLayoutEffect(() => {
        const { target, callback, root, rootMargin, threshold } = options;
        let actualCallback: IntersectionObserverCallback = callback;
        if (callback.length === 0) {
            // this is a simplified callback that should only be triggered once,
            // when the element becomes visible
            let triggered = false;
            actualCallback = ([entry]) => {
                if (entry.isIntersecting && !triggered) {
                    triggered = true;
                    callback();
                }
            };
        }
        
        const observer = new IntersectionObserver(actualCallback, {
            root: root?.current,
            rootMargin,
            threshold,
        });

        const element = target.current;
        observer.observe(element);
        return () => observer.unobserve(element);
    }, [options]);
}
