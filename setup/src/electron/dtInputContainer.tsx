import { SearchBox } from '@fluentui/react';
import React, { Dispatch, SetStateAction } from 'react';
import { FileUpload } from './core/controls/fileUpload';
import { DtNode, DtStyleScheme } from './dtModels';
import { DtModelViewer, Node as ModelNode } from './dtModelViewer';
import { DtTwinsViewer, Node as TwinNode } from './dtTwinsViewer';

import './inputContainer.css';

export interface NodeViewerProps {
    twinJsonFile: File;
    modelJsonFile: File;
    setTwinJsonFile: Dispatch<SetStateAction<File>>;
    setModelJsonFile: Dispatch<SetStateAction<File>>;
    twinJsonContent: object;
    modelJsonContent: object;
    onSelect: (selectedNode: DtNode) => void;
    styles?: DtStyleScheme;
}

export function DtInputContainer(props: NodeViewerProps) {
    const { twinJsonFile, setTwinJsonFile, modelJsonFile, setModelJsonFile, twinJsonContent, modelJsonContent, onSelect, styles } = props;

    const [ dtNode, setDtNode ] = React.useState<DtNode>();

    const onTwinSelect = React.useCallback((twinNode: TwinNode) => {
        setDtNode({ ...dtNode, 
            twinKey: twinNode?.key, 
            twinId: twinNode?.id, 
            twinName: twinNode?.name, 
            modelId: twinNode?.modelId
        });
    }, [dtNode]);

    const onModelSelect = React.useCallback((modelNode: ModelNode) => {
        setDtNode({ ...dtNode, 
            modelKey: modelNode?.key, 
            propertyName: modelNode?.name, 
            propertyId: modelNode?.id 
        });
    }, [dtNode]);

    // dtNode is updated only if one of the viewers changes their selection,
    // so on dtNode change, call onSelect to let the parent know
    React.useEffect(() => {
        onSelect(dtNode);
    }, [dtNode, onSelect])

    return (<div className='file-viewer-container'>
        <div className='twins-list'>
            <div className='section-header'>DT Twins Query Response</div>
            <div className='horizontal-group margin-bottom-xsmall'>      
                <FileUpload 
                    onChange={setTwinJsonFile} 
                    iconOnly
                    iconProps={{ iconName: 'openFile'}}
                    className='icon-button margin-end-xsmall'
                />
                <div className='margin-start-xsmall font-small ellipsis-left' title={twinJsonFile?.path || 'No file selected'}>
                    {twinJsonFile?.path || 'No file selected'}
                </div>
            </div>
            <div className='dt-viewer-container'>
                <SearchBox
                    placeholder={'Search'}
                    className='margin-bottom-xsmall'
                />
                <div className='viewer'>
                    <DtTwinsViewer jsonContent={twinJsonContent} onSelect={onTwinSelect} styles={styles}/>
                </div>
            </div>
        </div>
        <div className='model-list'>
            <div className='section-header margin-top-xsmall'>DT Models List Response</div>
            <div className='horizontal-group margin-bottom-xsmall'>      
                <FileUpload 
                    onChange={setModelJsonFile} 
                    iconOnly
                    iconProps={{ iconName: 'openFile'}}
                    className='icon-button margin-end-xsmall'
                />
                <div className='margin-start-xsmall font-small ellipsis-left' title={modelJsonFile?.path || 'No file selected'}>
                    {modelJsonFile?.path || 'No file selected'}
                </div>
            </div>
            <div className='dt-viewer-container'>
                <SearchBox
                    placeholder={'Search'}
                    className='margin-bottom-xsmall'
                />
                <div className='viewer'>
                    <DtModelViewer jsonContent={modelJsonContent} onSelect={onModelSelect} styles={styles}/>
                </div>
            </div>
        </div>
    </div>);
}