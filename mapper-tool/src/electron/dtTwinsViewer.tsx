import React from "react";
import { generateId } from "./core/generateId";
import {
  CustomTwin,
  DtStyleScheme,
  ParentRelationship,
  Relationship,
} from "./models";

import "./dtViewer.css";
import { TooltipHost } from "@fluentui/react";
import { useId } from "@fluentui/react-hooks";

export interface TwinsViewerProps {
  twins: Twin[];
  theme?: "light" | "dark";
  className?: string;
  collapsed?: boolean | number;
  noWrap?: boolean;
  styles?: DtStyleScheme;
  onSelect: (selectedNode: Node) => void;
  selectedModelId: string;
  selectedTwinKey: string;
  customTwin: CustomTwin;
  searchFilter?: string;
}

export interface Node {
  key: string;
  id: string; // model or twin id
  name: string;
  modelId: string;
  isModel: boolean;
  collapsed?: boolean;
  hide?: boolean; // for descendents, set to true if an ancestor has collapsed === true; used in render to determine whether to show the row
  isNew?: boolean;
  isSeparator?: boolean;
  parentRels?: ParentRelationship[];
}

// List Twins shapes
export interface Twin {
  $dtId: string;
  $metadata: TwinMetaData;
  name?: string;
  relationships?: Relationship[];
}

interface TwinMetaData {
  $model: string;
}

interface ProcessedInput {
  models: Set<string>;
  modelTwinsMap: Map<string, Node[]>;
}

const newTwinPrefix = "newtwins-";

export const DtTwinsViewer = React.memo(function DtTwinsViewer(
  props: TwinsViewerProps
) {
  const {
    twins: jsonContent,
    onSelect,
    selectedModelId,
    selectedTwinKey,
    styles,
    customTwin,
    searchFilter,
  } = props;

  const [nodeRows, setNodeRows] = React.useState([]);
  let processedInput: ProcessedInput | undefined;
  let error;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    processedInput = useProcessJson(jsonContent);
  } catch (e) {
    processedInput = undefined;
    error = `Invalid input file (${e?.message})`;
  }
  const inputRows = useGetRows(processedInput);

  // add any custom twins after the JSON has been processed and memoized
  const allRows = useGetCustomRows(inputRows, customTwin, processedInput);

  const filteredRows = React.useMemo(() => {
    if (selectedModelId) {
      return allRows.filter((row) => row.modelId === selectedModelId);
    }
    return allRows;
  }, [allRows, selectedModelId]);

  const searchRows = React.useMemo(
    () =>
      searchFilter
        ? filteredRows.filter(
            (row) =>
              row.id?.includes(searchFilter) ||
              row.name?.includes(searchFilter) ||
              row.modelId?.includes(searchFilter)
          )
        : filteredRows,
    [filteredRows, searchFilter]
  );

  // update the rows when a new file is selected (brings in new content)
  React.useEffect(() => {
    setNodeRows(searchRows);
  }, [searchRows]);

  const onMenuClick = React.useCallback(
    (e: MouseEvent, nodeKey: string, collapse: boolean) => {
      // create a new array object but return existing node objects
      // since their references are used in the node.children array
      const newRows = [...nodeRows];

      // update the menu setting for the clicked row
      const node = allRows.find((node) => node.key === nodeKey);
      node.collapsed = collapse;

      // if clicked menu is on a model, collapse/expand twins, separator and new twins.
      // if the clicked menu is on the separator, only collapse/expand the separator's twins.
      if (node.isModel) {
        const twins = processedInput.modelTwinsMap.get(node.modelId);
        for (const twin of twins) {
          twin.hide = collapse;
        }
      }

      const separator = node.isSeparator
        ? node
        : allRows.find(
            (row) => row.isSeparator && row.modelId === node.modelId
          );
      if (separator) {
        if (node !== separator) {
          separator.collapsed = collapse;
          separator.hide = collapse;
        }
        const twins = processedInput.modelTwinsMap.get(separator.id);
        for (const twin of twins) {
          twin.hide = collapse;
        }
      }

      setNodeRows(newRows);
    },
    [allRows, nodeRows, processedInput?.modelTwinsMap]
  );

  if (error) {
    return <div className="viewer">{error}</div>;
  }
  return (
    <TwinsList
      nodeRows={nodeRows}
      onSelect={onSelect}
      selectedTwinKey={selectedTwinKey}
      onMenuClick={onMenuClick}
      styles={styles}
      filtered={!!searchFilter}
    />
  );
});

export function normalizeTwinInput(twins: Twin[] | object) {
  // we expect the input to be an object with 'value' property that holds an array of interface objects
  return !Array.isArray(twins)
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (twins as { value: Twin[] }).value ??
        ((twins as Twin)["@$dtId"] && [twins as Twin]) ??
        null
    : (twins as Twin[]);
}

function useProcessJson(jsonContent: Twin[]): ProcessedInput {
  return React.useMemo(() => {
    if (!jsonContent) {
      return undefined;
    }

    // we expect the input to be an object with 'value' property that holds an array of interface objects
    const rawArray = normalizeTwinInput(jsonContent);

    if (!rawArray || !Array.isArray(rawArray)) {
      return undefined;
    }
    // create a rootArray containing only Interface objects
    const rawTwinArray: Twin[] = rawArray.filter((rawObj) => rawObj["$dtId"]);

    const models = new Set<string>();
    const modelTwinsMap = new Map<string, Node[]>();

    // we'll assume there's a depth limit built into DTDL so we won't go
    // to deep and blow the stack. All top-level models should be interfaces.
    for (const rawNode of rawTwinArray) {
      const modelId = rawNode.$metadata.$model;
      if (!models.has(modelId)) {
        models.add(modelId);
      }
      if (!modelTwinsMap.has(modelId)) {
        modelTwinsMap.set(modelId, []);
      }
      const key = generateId();
      modelTwinsMap.get(modelId).push({
        key,
        id: rawNode.$dtId,
        modelId: rawNode.$metadata.$model,
        name: rawNode.name ?? rawNode.$dtId,
        isModel: false,
        hide: true,
        parentRels: rawNode.relationships?.map((r) => ({
          name: r.$relationshipName,
          source: r.$sourceId,
        })),
      });
    }

    if (models.size === 1) {
      // expand the twins
      models.forEach((modelId) => {
        for (const twin of modelTwinsMap.get(modelId)) {
          twin.hide = false;
        }
      });
    }

    return { models, modelTwinsMap };
  }, [jsonContent]);
}

function useGetRows(processedInput: ProcessedInput): Node[] {
  return React.useMemo(() => {
    const rows: Node[] = [];
    if (!processedInput) {
      return rows;
    }
    const { models, modelTwinsMap } = processedInput;
    const collapsed = models.size > 1;

    // create a model row followed by rows for each existing twin of that model
    models.forEach((model) => {
      rows.push({
        key: generateId(),
        id: model,
        modelId: model,
        name: model,
        isModel: true,
        collapsed: collapsed,
      });
      const twins = modelTwinsMap.get(model);
      rows.push(...twins);
    });
    return rows;
  }, [processedInput]);
}

function useGetCustomRows(
  inputRows: Node[],
  customTwin: CustomTwin,
  processedInput: ProcessedInput
): Node[] {
  return React.useMemo(() => {
    const allRows: Node[] = [...inputRows];

    if (customTwin?.modelId && customTwin.twinId) {
      const { modelId, twinId, parentRels } = customTwin;

      // modelTwinsMap has a key that is a modelId and a value that is an array of existing twins for that modelId.
      // new twins should not be in this array. they will be stored in the array for the map key that is equal to
      // the key that is the model id prefixed with 'newtwins-'.
      const { models, modelTwinsMap } = processedInput;

      // if the model already exists, we'll add the twin immediately after it; otherwise, we'll
      // add a new model row followed by the twin
      let modelRowIdx = allRows.findIndex(
        (node) => node.isModel && node.modelId === modelId
      );
      if (modelRowIdx < 0) {
        allRows.push({
          key: generateId(),
          id: modelId,
          modelId: modelId,
          name: modelId,
          isModel: true,
          collapsed: false,
        });
        modelRowIdx = allRows.length - 1;
      }

      // update the model-twin map for collapse/expand menu clicks
      if (!models.has(modelId)) {
        models.add(modelId);
      }
      if (!modelTwinsMap.has(modelId)) {
        modelTwinsMap.set(modelId, []);
      }

      // find last twin under the current model
      let separatorNode: Node;
      while (allRows[++modelRowIdx]?.modelId === modelId) {
        if (allRows[modelRowIdx].isSeparator) {
          separatorNode = allRows[modelRowIdx];
        }
      }

      // if there aren't any new twins yet, add a separator between existing twins
      // for the model and the new twin
      if (!separatorNode) {
        separatorNode = {
          key: generateId(),
          id: `${newTwinPrefix}${modelId}`,
          modelId: modelId,
          name: "separator",
          isModel: false,
          collapsed: false,
          isNew: true,
          isSeparator: true,
        };
        allRows.splice(modelRowIdx, 0, separatorNode);
        modelRowIdx++;
      }

      // add a group for collapse/expand menu clicks on separator
      if (!models.has(separatorNode.id)) {
        models.add(separatorNode.id);
      }
      if (!modelTwinsMap.has(separatorNode.id)) {
        modelTwinsMap.set(separatorNode.id, []);
      }

      // create the row for the twin
      const newTwins: Node[] = modelTwinsMap.get(separatorNode.id);
      newTwins.push({
        key: generateId(),
        id: twinId,
        modelId: modelId,
        name: twinId,
        isModel: false,
        collapsed: separatorNode.collapsed,
        isNew: true,
        parentRels,
      });
      // Add in all twins to rows
      allRows.splice(modelRowIdx, 0, ...newTwins);
    }
    return allRows;
  }, [inputRows, customTwin, processedInput]);
}

interface TwinsListProps {
  nodeRows: Node[];
  onSelect?: (selectedNode: Node) => void;
  selectedTwinKey: string;
  onMenuClick: (e: MouseEvent, nodeKey: string, collapse: boolean) => void;
  styles?: DtStyleScheme;
  filtered: boolean;
}

function TwinsList({
  nodeRows,
  onSelect,
  selectedTwinKey,
  onMenuClick,
  styles,
  filtered,
}: TwinsListProps) {
  const tooltipId = useId("newTwin");
  const baseClass = "row font-small margin-bottom-xsmall";
  const content = nodeRows.map((node) => {
    const icon = node.collapsed ? "+" : "-";
    const onClick = (event) => onMenuClick(event, node.key, !node.collapsed);
    const MenuIcon = React.memo(() => (
      <div
        className="menu-icon icon-button margin-end-xsmall clickable"
        onClick={onClick}
      >
        {icon}
      </div>
    ));
    const select = !(node.isModel || node.isSeparator)
      ? () => onSelect(selectedTwinKey === node.key ? undefined : node)
      : undefined;
    const content: JSX.Element = (
      <div key={`${generateId()}`}>
        The twin ids under this menu do NOT exist and will be created when
        mapped OPC-UA telemetry is sent.
      </div>
    );
    const modelClass = node.isModel || node.isSeparator ? "model" : "";
    const separatorClass = node.isSeparator ? "new-twin-separator" : "";
    const selectedClass =
      selectedTwinKey === node.key ? "selected" : "unselected";
    if (!node.hide || filtered) {
      return (
        <div
          key={node.key}
          className={`${baseClass} ${modelClass} ${separatorClass} ${selectedClass}`}
        >
          {(node.isModel || node.isSeparator) && <MenuIcon />}
          <div
            className={`viewer-row-label ${
              select ? " clickable selectable" : ""
            }`}
            onClick={select}
          >
            {node.isModel && (
              <div>
                Model: <span style={styles?.modelId}>{node.id}</span>
              </div>
            )}
            {!(node.isModel || node.isSeparator) && (
              <div>
                <div>
                  {node.isNew ? "Future " : ""}Twin:{" "}
                  <span style={styles?.twinId}>{node.id}</span>
                </div>
                <div style={styles?.twinName}>{node.name}</div>
                <div>
                  Parent:
                  <br />
                  {node.parentRels?.map((relationship, idx) => (
                    <span key={`parentrel-${idx}`} className="indent1">
                      - {relationship.source} (
                      {relationship.displayName ?? relationship.name})
                    </span>
                  ))}
                </div>
              </div>
            )}
            {node.isSeparator && (
              <TooltipHost
                content={content}
                // This id is used on the tooltip itself, not the host
                // (so an element with this id only exists when the tooltip is shown)
                id={tooltipId}
              >
                <div>
                  Future Twins for{" "}
                  <span style={styles?.modelId}>{node.modelId}</span>
                </div>
              </TooltipHost>
            )}
          </div>
        </div>
      );
    }
  });
  return <div className="inner-viewer">{content}</div>;
}
