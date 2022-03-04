import { SearchBox, Toggle } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import React from 'react';
import { FileUpload } from './core/controls/fileUpload';
import { OpcuaViewer, OpcuaStyleScheme, TagNode } from './opcuaViewer';

import './inputContainer.css';

export interface OpcuaInputContainerProps {
    jsonFile: File;
    setJsonFile: () => void;
    jsonContent: object;
    onSelect: (selectedNode: TagNode) => void;
    styles?: OpcuaStyleScheme;
    clearSelect?: boolean;
}

export function OpcuaInputContainer(props) {
    const { jsonFile, setJsonFile, jsonContent, onSelect, styles, clearSelect } = props;

    const [ flattened, setFlattened ] = useBoolean(false);

    const onChange = React.useCallback((e: React.MouseEvent<HTMLElement>, checked: boolean) => {
        if (checked) {
            setFlattened.setTrue();
        } else {
            setFlattened.setFalse();
        }
    }, [setFlattened]);

    return (
        <div className='file-viewer-container group-wrapper opcua-wrapper margin-end-xsmall'>
            <div className='section-header group-header'>OPC-UA Node Hierarchy</div>
            <div className='flatten-toggle'>
                <Toggle label="Flattened" inlineLabel onText="On" offText="Off" onChange={onChange} />
            </div>
            <div className='horizontal-group margin-bottom-xsmall'>      
                <FileUpload 
                    onChange={setJsonFile} 
                    iconOnly
                    iconProps={{ iconName: 'openFile'}}
                    className='icon-button margin-end-xsmall'
                />
                <div className='margin-start-xsmall font-small ellipsis-left' title={jsonFile?.path || 'No file selected'}>
                    {jsonFile?.path || 'No file selected'}
                </div>
            </div>
            <div className='viewer-container'>
                <SearchBox
                    placeholder={'Search'}
                    className='margin-bottom-xsmall'
                />
                <OpcuaViewer jsonContent={jsonContent} flatten={flattened} onSelect={onSelect} styles={styles} clearSelect={clearSelect} />
            </div>
        </div>
    );
}