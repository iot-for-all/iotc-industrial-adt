import { IconButton, SearchBox, TextField } from '@fluentui/react';
import React, { Dispatch, SetStateAction } from 'react';
import { FileUpload } from './core/controls/fileUpload';
import { CustomTwin, DtItem, DtStyleScheme } from './models';
import { DtModelViewer, Node as ModelNode } from './dtModelViewer';
import { DtTwinsViewer, Node as TwinNode } from './dtTwinsViewer';

import './inputContainer.css';
import { useBoolean } from '@fluentui/react-hooks';
import { TooltipIconButton } from './core/controls/tooltipIconButton';
import { ErrorBoundary } from './core/controls/errorBoundary';
import { HideSearch } from './hideSearchSvg';

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
    const [invalidName, setInvalidName] = useBoolean(false);

    // search
    const [showModelSearch, setShowModelSearch] = useBoolean(false);
    const [modelSearchFilter, setModelSearchFilter] = React.useState<string>();
    const [showTwinSearch, setShowTwinSearch] = useBoolean(false);
    const [twinSearchFilter, setTwinSearchFilter] = React.useState<string>();

    const onTwinSelect = React.useCallback((twinNode: TwinNode) => {
        // note: 'twinNode' will become undefined when the current twin selection is clicked off
        // don't allow twin selection from a different model if model is already selected
        const currModelId = twinNode?.modelId;
        if (currModelId && dtItem?.modelId && dtItem.modelId !== currModelId) {
            return;
        }
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
        // note: 'modelNode' will become undefined when the current model selection is clicked off
        const currModelId = dtItem?.modelId;
        const newItem = {
            ...dtItem,
            key: `${selectedTwinKey}-${modelNode?.key}`,
            modelKey: modelNode?.key,
            propertyName: modelNode?.name,
            propertyId: modelNode?.id,
            modelId: modelNode?.modelId
        };
        if (modelNode?.modelId !== currModelId) {
            newItem.key = `undefined-${modelNode?.key}`,
            newItem.twinKey = undefined;
            newItem.twinId = undefined;
            newItem.twinName = undefined;
        }
        onSelect(newItem);
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

    const addDisabled = !newTwin || !dtItem?.modelId || invalidName;
    const onAdd = React.useCallback(() => {
        onAddNewTwin(newTwin);
        setNewTwin('');
    }, [newTwin, onAddNewTwin]);

    const onSubmit = React.useCallback((e: React.SyntheticEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!addDisabled) {
            onAdd();
        }
    }, [addDisabled, onAdd]);

    const onTwinNameError = React.useCallback((value) => {
        if ((value as string)?.match('.*[\\s].*')) {
            setInvalidName.setTrue();
            return 'Name cannot contain spaces';
        }
        setInvalidName.setFalse();
        return '';
    }, [setInvalidName]);

    const modelSearchTitle = `${!showModelSearch ? 'Show' : 'Hide'} search field`;
    const twinSearchTitle = `${!showTwinSearch ? 'Show' : 'Hide'} search field`;

    return (
        <ErrorBoundary>
            <div className='file-viewer-container group-wrapper twins-wrapper'>
                <div className='section-header group-header'>Digital Twins</div>
                <div className='horizontal-group expand no-scroll-parent'>
                    <div className='vertical-group twins-viewer margin-end-xsmall'>
                        <div className='flatten-toggle horizontal-group justify-ends'>
                            <div className='section-header'>Models</div>
                            <div className='vertical-group search-toggle margin-end-xsmall'>
                                <TooltipIconButton
                                    onClick={setShowModelSearch.toggle}
                                    iconProps={{ iconName: `${!showModelSearch ? 'search' : undefined}` }}
                                    title={modelSearchTitle}
                                    tooltip={modelSearchTitle}
                                    className='search-toggle'
                                    img={showModelSearch ? <HideSearch /> : undefined}
                                />
                            </div>
                        </div>
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
                            {showModelSearch && <SearchBox
                                placeholder={'Search'}
                                className='margin-bottom-xsmall search'
                                onChange={(_, value) => setModelSearchFilter(value)}
                            />}
                            <DtModelViewer
                                jsonContent={modelJsonContent}
                                onSelect={onModelSelect}
                                selectedModelKey={selectedModelKey}
                                styles={styles}
                                searchFilter={modelSearchFilter}
                            />
                        </div>
                    </div>
                    <div className='vertical-group twins-viewer'>
                        <div className='flatten-toggle horizontal-group justify-ends'>
                            <div className='section-header'>Twin Instances</div>
                            <div className='horizontal-group place-end'>
                                <div className='vertical-group'>
                                    <TooltipIconButton
                                        onClick={setShowAdd.toggle}
                                        iconProps={{ iconName: `${!showAdd ? 'add' : 'remove'}` }}
                                        title='Show/hide add twin'
                                        tooltip='Show/hide add input field'
                                        className='add'
                                    />
                                </div>
                                <div className='vertical-group search-toggle margin-end-xsmall'>
                                    <TooltipIconButton
                                        onClick={setShowTwinSearch.toggle}
                                        iconProps={{ iconName: `${!showTwinSearch ? 'search' : undefined}` }}
                                        title={twinSearchTitle}
                                        tooltip={twinSearchTitle}
                                        className='search-toggle'
                                        img={showTwinSearch ? <HideSearch /> : undefined}
                                    />
                                </div>
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
                            {showAdd && <form className='horizontal-group' onSubmit={onSubmit}>
                                <TextField
                                    name='newTwin'
                                    label=''
                                    title={!dtItem?.modelId ? 'Choose model first, then enter new twin name' : 'Enter name of new twin'}
                                    className='margin-bottom-xsmall add-input margin-end-xsmall'
                                    value={newTwin}
                                    onChange={(_, twinId) => setNewTwin(twinId)}
                                    placeholder={!dtItem?.modelId ? 'Choose from Models first' : 'Enter name of new twin'}
                                    disabled={!dtItem?.modelId}
                                    onGetErrorMessage={onTwinNameError}
                                    autoFocus
                                />
                                <IconButton
                                    iconProps={{iconName: 'add'}}
                                    title='Add entry'
                                    ariaLabel='add'
                                    disabled={addDisabled}
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
                            {showTwinSearch && <SearchBox
                                placeholder={'Search'}
                                className='margin-bottom-xsmall search'
                                onChange={(_, value) => setTwinSearchFilter(value)}
                            />}
                            <DtTwinsViewer
                                jsonContent={twinJsonContent}
                                onSelect={onTwinSelect}
                                selectedModelId={dtItem?.modelId}
                                selectedTwinKey={selectedTwinKey}
                                styles={styles}
                                customTwin={customTwin}
                                searchFilter = {twinSearchFilter}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </ErrorBoundary>);
}