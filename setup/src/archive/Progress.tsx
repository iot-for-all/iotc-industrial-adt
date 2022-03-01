import { mergeStyleSets } from '@fluentui/react';
import React from 'react';

const classNames = mergeStyleSets({
    content: {
        padding: 50,
        height: 100,
        display: 'flex',
        flexDirection: 'row'
    },
    bar: {
        width: 100,
        height: 20,
        backgroundColor: 'red',
        borderRadius: 7,
        marginLeft: -8
    },
    step: {
        width: 50,
        height: 50,
        marginTop: -15,
        borderRadius: 25,
        marginLeft: -7,
        textAlign: 'center',
        zIndex: 2
    },
    number: {
        color: 'white'
    }
});

const Progress = React.memo<{ steps: number, index: number }>(({ steps, index }) => {
    return (<div className={classNames.content}>
        <div className={classNames.bar} style={{ backgroundColor: 'green' }}>
        </div>
        {Array.from(Array(steps).keys()).map(step => (
            <React.Fragment key={`frag-${step}`}>
                <div key={`step-${step}`} className={classNames.step} style={(step + 1) < index ? { backgroundColor: 'green' } : { backgroundColor: 'red' }}>
                    <p key={`index-${step}`} className={classNames.number}>{step + 1}</p>
                </div>
                <div key={`bar2-${step}`} className={classNames.bar} style={(step + 1) < index ? { backgroundColor: 'green' } : { backgroundColor: 'red' }}>
                </div>
            </React.Fragment>
        ))}

    </div >)
});

export default Progress;