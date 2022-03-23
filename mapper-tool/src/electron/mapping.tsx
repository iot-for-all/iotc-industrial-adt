import * as React from "react";

import "./mapping.css";
import {
  DefaultButton,
  MessageBar,
  MessageBarType,
  PrimaryButton,
  TextField,
  TooltipHost,
} from "@fluentui/react";
import { MappingGrid, MappingGridItem } from "./mappingGrid";
import { generateId } from "./core/generateId";
import { useBoolean, useId } from "@fluentui/react-hooks";
import { OpcuaStyleScheme, TagNode } from "./opcuaViewer";
import { OpcuaInputContainer } from "./opcuaInputContainer";
import { DtInputContainer } from "./dtInputContainer";
import { DtStyleScheme, OpcuaItem, DtItem, CustomTwin } from "./models";
import { JqModal } from "./jqModal";
import { downloadFile } from "./core/controls/downloadFile";
import { Twin } from "./dtTwinsViewer";
import { Interface } from "./dtModelViewer";

export const Mapping = React.memo(function Mapping() {
  const [opcuaFile, setOpcuaFile] = React.useState<File>(); // json input file for opcua definitions
  const [opcuaJson, setOpcuaJson] = React.useState<object>({}); // json content from the opcua input file

  const [dtTwinsFile, setDtTwinsFile] = React.useState<File>(); // json input file for dt definitions
  const [dtTwinsJson, setDtTwinsJson] = React.useState<Twin[]>([]); // json content from the dt input file

  const [dtModelsFile, setDtModelsFile] = React.useState<File>(); // json input file for dt definitions
  const [dtModelsJson, setDtModelsJson] = React.useState<Interface[]>([]); // json content from the dt input file

  const [selectedKey, setSelectedKey] = React.useState<string | number>(); // tracks the selected row key in the grid (make sure item keys aren't changing)‰

  // Item is an object containing the base properties needed to map the selected entry.
  // 'Selected entry' refers to the data transferred when clicking on the raw opcua or dt input in the viewer or
  // from selecting a grid row for update. The item contents are shown in the working row and stored in the grid
  // item when the working row is saved.
  const [opcuaItem, setOpcuaItem] = React.useState<OpcuaItem>();
  const [dtItem, setDtItem] = React.useState<DtItem>();

  const [deselectGrid, setDeselectGrid] = useBoolean(false); // after update, does the grid row need to be unselected?
  const [error, setError] = React.useState<string>(); // did an error occur?

  const [items, setItems] = React.useState<MappingGridItem[]>([]); // rows for the grid
  const [filter, setFilter] = React.useState<string>();

  // Jq state
  const [showJqModal, setShowJqModal] = useBoolean(false);
  const [copyResult, setCopyResult] = React.useState<string>();
  const [resultClass, setResultClass] = React.useState<string>();
  const [customTwin, setCustomTwin] = React.useState<CustomTwin>();
  // if a file has been selected, opcuaFile will be updated with the File object.
  // Get the content of the file as JSON
  React.useEffect(() => {
    if (opcuaFile) {
      (async () => {
        try {
          const content = await window.electron.loadFile(opcuaFile.path);
          setOpcuaJson(JSON.parse(content));
        } catch (e) {
          setError(e.message);
          setOpcuaJson(undefined);
          setOpcuaFile(undefined);
        }
      })();
    }
  }, [opcuaFile]);

  React.useEffect(() => {
    if (dtTwinsFile) {
      (async () => {
        try {
          const content = await window.electron.loadFile(dtTwinsFile.path);
          setDtTwinsJson(JSON.parse(content));
        } catch (e) {
          setError(e.message);
          setDtTwinsJson(undefined);
          setDtTwinsFile(undefined);
        }
      })();
    }
  }, [dtTwinsFile]);

  React.useEffect(() => {
    if (dtModelsFile) {
      (async () => {
        try {
          const content = await window.electron.loadFile(dtModelsFile.path);
          setDtModelsJson(JSON.parse(content));
        } catch (e) {
          setError(e.message);
          setDtModelsJson(undefined);
          setDtModelsFile(undefined);
        }
      })();
    }
  }, [dtModelsFile]);

  // callback invoked by MappingGrid when the row selection changes
  const onGridRowSelectionChange = React.useCallback(
    (newKey) => {
      if (newKey) {
        const item = items.find((item) => item.key === newKey);
        if (item) {
          const opcua = createOpcuaItemFromSelectedRow(item);
          setOpcuaItem(opcua);
          const dt = createDtItemFromSelectedRow(item);
          setDtItem(dt);
        }
      } else {
        if (opcuaItem) {
          setOpcuaItem(undefined);
        }
        if (dtItem) {
          setDtItem(undefined);
        }
      }
      setSelectedKey(newKey);
      setDeselectGrid.setFalse();
    },
    [dtItem, items, opcuaItem, setDeselectGrid]
  );

  const onSelectOpcuaInput = React.useCallback((tagNode: TagNode) => {
    const opcua: OpcuaItem = tagNode
      ? {
          key: tagNode.key,
          nodeId: tagNode.id,
          nodeName: tagNode.name,
          namespace: tagNode.namespace,
        }
      : undefined;
    setOpcuaItem(opcua);
  }, []);

  const onDismiss = React.useCallback(
    (row: MappingGridItem) =>
      setItems([...items.filter((item) => item.key !== row.key)]),
    [items]
  );

  // callback for confirming (button click) the entries in the node pair input fields
  const onUpdateGrid = React.useCallback(() => {
    if (opcuaItem && dtItem) {
      if (selectedKey) {
        // find and update existing row
        const item = items.find((item) => item.key === selectedKey);
        setExistingItemFromEntries(item, opcuaItem, dtItem);
      } else {
        // create new row
        const entry = createNewItemFromEntries(opcuaItem, dtItem);
        items.push(entry);
      }
      setItems([...items]);

      // clear the working item state now that it has been added to the grid
      setOpcuaItem(undefined);
      setDtItem(undefined);
      if (selectedKey) {
        setDeselectGrid.setTrue();
      }
    }
  }, [opcuaItem, dtItem, selectedKey, items, setDeselectGrid]);

  const opcuaTooltipId = useId("opcuaEntry");
  const content: JSX.Element = (
    <>
      <div>Node id: {opcuaItem?.nodeId}</div>
      <div>Path: {opcuaItem?.namespace.join(".")}</div>
    </>
  );

  // TODO move input list styles to config file
  const opcuaStyles: OpcuaStyleScheme = React.useMemo(
    () => ({
      leafName: { color: "crimson" },
      path: { color: "slategray" },
      type: { fontStyle: "italic" },
    }),
    []
  );

  const dtStyles: DtStyleScheme = React.useMemo(
    () => ({
      interfaceId: { color: "steelblue" },
      propertyName: { color: "crimson" },
      propertySchema: { fontStyle: "italic" },
      twinId: { color: "crimson" },
      twinName: { color: "steelblue" },
      modelId: { color: "steelblue" },
    }),
    []
  );

  const onGenerateJQ = React.useCallback(() => {
    setShowJqModal.setTrue();
  }, [setShowJqModal]);

  const onCopyJq = React.useCallback((jqText) => {
    navigator.clipboard.writeText(jqText).then(
      function () {
        /* clipboard successfully set */
        setCopyResult("Copied!");
        setResultClass("success");
      },
      function (e) {
        /* clipboard write failed */
        setCopyResult(`Copy failed ${e}`);
        setResultClass("fail");
      }
    );
  }, []);

  const onDismissJqModal = React.useCallback(() => {
    setShowJqModal.setFalse();
    setCopyResult(undefined);
    setResultClass(undefined);
  }, [setShowJqModal]);

  const onSaveMapping = React.useCallback(() => {
    downloadFile(
      JSON.stringify(items),
      "application/json",
      "opcua2dt-mapping.json"
    );
  }, [items]);

  const onAddNewTwin = React.useCallback(
    (twin: CustomTwin) => {
      setCustomTwin({ ...twin, modelId: dtItem?.modelId });
    },
    [dtItem?.modelId]
  );

  return (
    <>
      {error && (
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={false}
          onDismiss={() => setError(undefined)}
          dismissButtonAriaLabel="Close"
          className="margin-bottom-xsmall"
        >
          {error}
        </MessageBar>
      )}
      <div className="mapping-container">
        <div className="horizontal-group input-container">
          <OpcuaInputContainer
            jsonFile={opcuaFile}
            setJsonFile={setOpcuaFile}
            jsonContent={opcuaJson}
            onSelect={onSelectOpcuaInput}
            styles={opcuaStyles}
            selectedItemKey={opcuaItem?.key}
          />
          <DtInputContainer
            twinJsonFile={dtTwinsFile}
            setTwinJsonFile={setDtTwinsFile}
            twinJsonContent={dtTwinsJson}
            modelJsonFile={dtModelsFile}
            setModelJsonFile={setDtModelsFile}
            setModelJsonContent={setDtModelsJson}
            setTwinJsonContent={setDtTwinsJson}
            modelJsonContent={dtModelsJson}
            onSelect={setDtItem}
            dtItem={dtItem}
            styles={dtStyles}
            onAddNewTwin={onAddNewTwin}
            customTwin={customTwin}
          />
        </div>
        <div className="mapping-wrapper group-wrapper">
          <div className="section-header group-header">Add/Update Mapping</div>
          <div className="horizontal-group margin-bottom-xsmall full-width justify-ends no-scroll-parent">
            <div className="horizontal-group margin-end-medium expand">
              <div className="expand">
                <TooltipHost content={content} id={opcuaTooltipId}>
                  <TextField
                    name="opcuaNode"
                    label="Opc UA Node"
                    className="margin-end-xsmall"
                    value={opcuaItem?.nodeName || ""}
                    readOnly
                  />
                </TooltipHost>
              </div>
              <span className="anchor-bottom">
                <span className="margin-bottom-xsmall arrow">{"->"}</span>
              </span>
              <TextField
                name="dtModel"
                label="Model"
                className="expand ellipsis-left-limited margin-end-xsmall"
                value={dtItem?.modelId || ""}
                title={dtItem?.modelId || ""}
                readOnly
              />
              <TextField
                name="dtTwin"
                label="Digital Twin Id"
                className="margin-start-xsmall expand"
                value={dtItem?.twinId || ""}
                title={`${dtItem?.twinId}: ${dtItem?.twinName}`}
                readOnly
              />
              <TextField
                name="dtProperty"
                label="Property"
                className="margin-start-xsmall expand"
                value={dtItem?.propertyName || ""}
                title={`${dtItem?.propertyName} (${dtItem?.propertyId})`}
                readOnly
              />
              <TextField
                name="dtParent"
                label="Digital Twin Parent Ids"
                className="margin-start-xsmall expand"
                value={
                  dtItem?.parentRels
                    ? dtItem.parentRels.map((p) => p.source).join(",")
                    : ""
                }
                readOnly
              />
              <div className="anchor-bottom expand">
                <PrimaryButton
                  text={selectedKey ? "Update" : "Add"}
                  className="margin-start-xsmall"
                  onClick={onUpdateGrid}
                  disabled={
                    !opcuaItem ||
                    !dtItem?.propertyName ||
                    !dtItem?.twinId ||
                    !dtItem?.modelId
                  }
                />
              </div>
            </div>
            <div className="separator"></div>
            <div className="horizontal-group place-end">
              <TextField
                className="full-width"
                label="Filter:"
                onChange={(_, value) => setFilter(value)}
              />
            </div>
          </div>
          <div className="grid">
            {
              <MappingGrid
                allItems={items}
                onSelectRow={onGridRowSelectionChange}
                onDismiss={onDismiss}
                deselect={deselectGrid}
                filter={filter}
              />
            }
          </div>
        </div>
        <Footer
          disabled={!items?.length}
          onGenerateJQ={onGenerateJQ}
          onSaveMapping={onSaveMapping}
        />
        <JqModal
          jq={items}
          isModalOpen={showJqModal}
          onDismiss={onDismissJqModal}
          onCopyJq={onCopyJq}
          copyResult={copyResult}
          resultClass={resultClass}
        />
      </div>
    </>
  );
});

function setExistingItemFromEntries(
  item: MappingGridItem,
  opcuaItem: OpcuaItem,
  dtItem: DtItem
) {
  if (item) {
    item.opcuaKey = opcuaItem.key;
    item.opcuaName = opcuaItem.nodeName;
    item.opcuaNodeId = opcuaItem.nodeId;
    item.opcuaPath = opcuaItem.namespace;
    item.dtKey = dtItem.key;
    item.dtPropertyName = dtItem.propertyName;
    item.dtPropertyId = dtItem.propertyId;
    item.dtId = dtItem.twinId;
    item.dtName = dtItem.twinName;
    item.dtModelId = dtItem.modelId;
    item.dtParentRelationships = dtItem.parentRels;
  }
}

function createNewItemFromEntries(
  opcuaItem: OpcuaItem,
  dtItem: DtItem
): MappingGridItem {
  return {
    key: generateId(),
    opcuaKey: opcuaItem.key,
    opcuaName: opcuaItem.nodeName,
    opcuaNodeId: opcuaItem.nodeId,
    opcuaPath: opcuaItem.namespace,
    dtKey: dtItem.key,
    dtPropertyName: dtItem.propertyName,
    dtPropertyId: dtItem.propertyId,
    dtId: dtItem.twinId,
    dtName: dtItem.twinName,
    dtModelId: dtItem.modelId,
    dtParentRelationships: dtItem.parentRels,
  };
}

function createOpcuaItemFromSelectedRow(item: MappingGridItem): OpcuaItem {
  return {
    key: item.opcuaKey,
    nodeId: item.opcuaNodeId,
    nodeName: item.opcuaName,
    namespace: item.opcuaPath,
  };
}

function createDtItemFromSelectedRow(item: MappingGridItem): DtItem {
  const hyphenIdx = item?.dtKey.indexOf("-");
  const selectedTwinKey =
    hyphenIdx > 0 ? item.dtKey.substring(0, hyphenIdx) : undefined;
  const selectedModelKey =
    hyphenIdx > 0 ? item.dtKey.substring(hyphenIdx + 1) : undefined;
  return {
    key: item.dtKey,
    twinKey: selectedTwinKey,
    twinId: item.dtId,
    twinName: item.dtName,
    modelKey: selectedModelKey,
    modelId: item.dtModelId,
    propertyName: item.dtPropertyName,
    propertyId: item.dtPropertyId,
  };
}

interface FooterProps {
  disabled: boolean;
  onGenerateJQ: React.MouseEventHandler<HTMLButtonElement>;
  onSaveMapping: React.MouseEventHandler<HTMLButtonElement>;
}

const Footer = React.memo(function Footer({
  disabled,
  onGenerateJQ,
  onSaveMapping,
}: FooterProps) {
  return (
    <div className="horizontal-group footer">
      <PrimaryButton
        text="Generate JQ"
        disabled={disabled}
        onClick={onGenerateJQ}
      />
      <DefaultButton
        text="Save Mapping"
        className="margin-start-xsmall"
        disabled={disabled}
        onClick={onSaveMapping}
      />
    </div>
  );
});
