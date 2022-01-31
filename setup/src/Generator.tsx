import { DefaultButton, Text, TextField } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import React, { useCallback, useState } from 'react';
import Editor from "@monaco-editor/react";


const Generator = React.memo(() => {
    const [state, setState] = useState<{ apiKey?: string, mapping?: string }>({ apiKey: '', mapping: '' });
    const [errorText, setErrorText] = useState('');
    const jsonDiv = useId();
    const jqDiv = useId();

    const generateAndSave = useCallback(() => {
        try {
            const mapping = JSON.stringify(state.mapping);
        } catch (e) {
            setErrorText(`Mapping data is malformed. Check is a valid JSON.`)
        }
    }, [state, setErrorText]);


    return <div className='width-400 full-height'>
        <div className='padding-vertical'><TextField label='Api Key' value={state.apiKey} onChange={(_, apiKey) => setState(current => ({ ...current, apiKey }))} /></div>
        <div className='padding-vertical'></div>
        <div className='padding-vertical'>
            <div>
                <label htmlFor={jsonDiv} className='ms-label root-112'>Mapping</label>
                <div className='padding-vertical box' id={jsonDiv}>
                    <Editor
                        height="40vh"
                        defaultLanguage="json"
                        defaultValue="{}"
                    />
                </div>
            </div>
            <div>
                <label htmlFor={jqDiv} className='ms-label root-112'>Mapping</label>
                <div className='padding-vertical box' id={jqDiv}>
                    <Editor
                        height="40vh"
                        defaultLanguage="json"
                        defaultValue="{}"
                    />
                </div>
            </div>
        </div>
        <div className='padding-vertical'><DefaultButton text='Send' onClick={generateAndSave} /></div>
        <div className='padding-vertical'><Text>{errorText}</Text></div>

    </div>
});

export default Generator;