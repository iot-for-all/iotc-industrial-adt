import React, { useCallback, useMemo, useRef, useState } from 'react';

const ResizeableDiv = React.memo<{ containerStyle?: React.CSSProperties }>(({ containerStyle, children }) => {
    const [size, setSize] = useState({ x: 400, y: 300 });
    const ref = useRef<HTMLButtonElement | null>(null);

    const style = useMemo<React.CSSProperties>(() => ({
        width: size.x,
        height: size.y,
        position:'relative'
    }), [size]);

    const handler = useCallback(() => {
        function onMouseMove(e: any) {
            setSize(currentSize => ({
                x: currentSize.x + e.movementX,
                y: currentSize.y + e.movementY
            }));
        }
        function onMouseUp() {
            ref.current?.removeEventListener("mousemove", onMouseMove);
            ref.current?.removeEventListener("mouseup", onMouseUp);
        }
        ref.current?.addEventListener("mousemove", onMouseMove);
        ref.current?.addEventListener("mouseup", onMouseUp);
    }, [setSize]);

    return (
        <div style={{ ...style, ...containerStyle }}>
            <button ref={ref} onMouseDown={handler} />
            {children}
        </div>
    );
});

export default ResizeableDiv;