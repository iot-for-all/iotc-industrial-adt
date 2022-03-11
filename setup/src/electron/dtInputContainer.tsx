import { IconButton, TextField } from '@fluentui/react';
import React, { Dispatch, SetStateAction } from 'react';
import { FileUpload } from './core/controls/fileUpload';
import { CustomTwin, DtItem, DtStyleScheme } from './models';
import { DtModelViewer, Node as ModelNode } from './dtModelViewer';
import { DtTwinsViewer, Node as TwinNode } from './dtTwinsViewer';

import './inputContainer.css';
import { useBoolean } from '@fluentui/react-hooks';
import { TooltipIconButton } from './core/controls/tooltipIconButton';

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
    onAddNewTwin: (twinId: string) => void;
    customTwin: CustomTwin;
}

export function DtInputContainer(props: NodeViewerProps) {
    const { twinJsonFile, setTwinJsonFile, modelJsonFile, setModelJsonFile, twinJsonContent, modelJsonContent, onSelect, dtItem, styles, onAddNewTwin, customTwin } = props;

    const [selectedTwinKey, selectedModelKey] = React.useMemo(() => {
        const hyphenIdx = dtItem?.key?.indexOf('-');
        const selectedTwinKey = hyphenIdx > 0 ? dtItem.key.substring(0, hyphenIdx) : undefined;
        const selectedModelKey = hyphenIdx > 0 ? dtItem.key.substring(hyphenIdx + 1) : undefined;
        return [selectedTwinKey, selectedModelKey];
    }, [dtItem]);
    const [showAdd, setShowAdd] = useBoolean(false);
    const [newTwin, setNewTwin] = React.useState<string>();

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

    const simpleIconStyles = {
        root: {
            width: '24px',
            height: '24px',
            alignSelf: 'center',
            marginBottom: '0.25rem', // moves vertical centering up by half the margin below the row
            icon: {
                fontSize: 'smaller',
            }
        }
    };

    const onAdd = React.useCallback(() => {
        onAddNewTwin(newTwin);
        setNewTwin('');
    }, [newTwin, onAddNewTwin]);

    return (
        <div className='file-viewer-container group-wrapper twins-wrapper'>
            <div className='section-header group-header'>Digital Twins</div>
            <div className='horizontal-group expand no-scroll-parent'>
            <div className='vertical-group twins-viewer  margin-end-xsmall'>
                    <div className='section-header'>Models</div>
                    <div className='horizontal-group margin-bottom-xsmall'>
                        <FileUpload
                            onChange={setModelJsonFile}
                            iconOnly
                            iconProps={{ iconName: 'openFile' }}
                            className='icon-button margin-end-xsmall'
                            tooltip='Upload Device Twin models json'
                        />
                        <div className='margin-start-xsmall font-small ellipsis-left' title={modelJsonFile?.path || 'No file selected'}>
                            {modelJsonFile?.path || 'No file selected'}
                        </div>
                    </div>
                    <div className='viewer-container'>
                        <DtModelViewer jsonContent={modelJsonContent} onSelect={onModelSelect} selectedModelKey={selectedModelKey} styles={styles} />
                    </div>
                </div>
                <div className='vertical-group twins-viewer'>
                    <div className='flatten-toggle horizontal-group justify-ends'>
                        <div className='section-header'>Twin Instances</div>
                        <div className='vertical-group'>
                            <TooltipIconButton
                                onClick={setShowAdd.toggle}
                                iconProps={{ iconName: 'add'}}
                                title='Add twin'
                                tooltip='Show/hide add input field'
                                className='add'
                            />
                        </div>
                    </div>
                    <div className='horizontal-group margin-bottom-xsmall'>
                        <FileUpload
                            onChange={setTwinJsonFile}
                            iconOnly
                            iconProps={{ iconName: 'openFile' }}
                            className='icon-button margin-end-xsmall'
                            tooltip='Upload Device Twin instances json'
                        />
                        <div className='margin-start-xsmall font-small ellipsis-left' title={twinJsonFile?.path || 'No file selected'}>
                            {twinJsonFile?.path || 'No file selected'}
                        </div>
                    </div>
                    <div className='viewer-container'>
                        {showAdd && <form className='horizontal-group'>
                            <TextField
                                name='newTwin'
                                label=''
                                title={!dtItem?.modelId ? 'Choose model first, then enter new twin name' : 'Enter name of new twin'}
                                className='margin-bottom-xsmall add-input margin-end-xsmall'
                                value={newTwin}
                                onChange={(_, twinId) => setNewTwin(twinId)}
                                placeholder={!dtItem?.modelId ? 'Choose from Models first' : 'Enter name of new twin'}
                                disabled={!dtItem?.modelId}
                            />
                            <IconButton 
                                iconProps={{iconName: 'add'}}
                                title='Add entry'
                                ariaLabel='add'
                                disabled={!newTwin || !dtItem?.modelId}
                                className='simple-icon-button-small margin-end-xsmall'
                                styles={simpleIconStyles}
                                onClick={onAdd}
                            />
                            <IconButton
                                iconProps={{iconName: 'cancel'}}
                                title='Clear entry' 
                                ariaLabel='cancel'
                                disabled={!newTwin}
                                className='simple-icon-button-small'
                                styles={simpleIconStyles}
                                onClick={() => setNewTwin('')}
                            />
                        </form>}
                        <DtTwinsViewer jsonContent={twinJsonContent} onSelect={onTwinSelect} selectedTwinKey={selectedTwinKey} styles={styles} customTwin={customTwin} />
                    </div>
                </div>
            </div>
        </div>
    );
}