import { SearchBox } from '@fluentui/react';
import React, { Dispatch, SetStateAction } from 'react';
import { FileUpload } from './core/controls/fileUpload';
import { DtItem, DtStyleScheme } from './models';
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
    onSelect: (selectedNode: DtItem) => void;
    dtItem: DtItem;
    styles?: DtStyleScheme;
}

export function DtInputContainer(props: NodeViewerProps) {
    const { twinJsonFile, setTwinJsonFile, modelJsonFile, setModelJsonFile, twinJsonContent, modelJsonContent, onSelect, dtItem, styles } = props;

    const [selectedTwinKey, selectedModelKey] = React.useMemo(() => {
        const hyphenIdx = dtItem?.key.indexOf('-');
        const selectedTwinKey = hyphenIdx > 0 ? dtItem.key.substring(0, hyphenIdx) : undefined;
        const selectedModelKey = hyphenIdx > 0 ? dtItem.key.substring(hyphenIdx + 1) : undefined;
        return [selectedTwinKey, selectedModelKey];
    }, [dtItem]);

    const onTwinSelect = React.useCallback((twinNode: TwinNode) => {
        onSelect({
            ...dtItem,
            key: `${twinNode?.key}-${selectedModelKey}`,
            twinKey: twinNode?.key,
            twinId: twinNode?.id,
            twinName: twinNode?.name,
            modelId: twinNode?.modelId
        });
    }, [dtItem, onSelect, selectedModelKey]);

    const onModelSelect = React.useCallback((modelNode: ModelNode) => {
        onSelect({
            ...dtItem,
            key: `${selectedTwinKey}-${modelNode?.key}`,
            modelKey: modelNode?.key,
            propertyName: modelNode?.name,
            propertyId: modelNode?.id,
            modelId: modelNode?.modelId
        });
    }, [dtItem, onSelect, selectedTwinKey]);

    return (
        <div className='file-viewer-container group-wrapper twins-wrapper'>
            <div className='section-header group-header'>Digital Twins</div>
            <div className='horizontal-group expand no-scroll-parent'>
                <div className='vertical-group twins-viewer margin-end-xsmall'>
                    <div className='section-header'>Twin Instances</div>
                    <div className='horizontal-group margin-bottom-xsmall'>
                        <FileUpload
                            onChange={setTwinJsonFile}
                            iconOnly
                            iconProps={{ iconName: 'openFile' }}
                            className='icon-button margin-end-xsmall'
                        />
                        <div className='margin-start-xsmall font-small ellipsis-left' title={twinJsonFile?.path || 'No file selected'}>
                            {twinJsonFile?.path || 'No file selected'}
                        </div>
                    </div>
                    <div className='viewer-container'>
                        <SearchBox
                            placeholder={'Search'}
                            className='margin-bottom-xsmall'
                        />
                        <DtTwinsViewer jsonContent={twinJsonContent} onSelect={onTwinSelect} selectedTwinKey={selectedTwinKey} styles={styles} />
                    </div>
                </div>
                <div className='vertical-group twins-viewer'>
                    <div className='section-header'>Models</div>
                    <div className='horizontal-group margin-bottom-xsmall'>
                        <FileUpload
                            onChange={setModelJsonFile}
                            iconOnly
                            iconProps={{ iconName: 'openFile' }}
                            className='icon-button margin-end-xsmall'
                        />
                        <div className='margin-start-xsmall font-small ellipsis-left' title={modelJsonFile?.path || 'No file selected'}>
                            {modelJsonFile?.path || 'No file selected'}
                        </div>
                    </div>
                    <div className='viewer-container'>
                        <SearchBox
                            placeholder={'Search'}
                            className='margin-bottom-xsmall'
                        />
                        <DtModelViewer jsonContent={modelJsonContent} onSelect={onModelSelect} selectedModelKey={selectedModelKey} styles={styles} />
                    </div>
                </div>
            </div>
        </div>
    );
}