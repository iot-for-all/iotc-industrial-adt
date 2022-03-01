import { TooltipHost } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import React from 'react';
import { generateId } from './core/generateId';
import { DtStyleScheme } from './dtModels';

import './dtViewer.css';

export interface DtModelViewerProps {
    jsonContent: object | Array<object>;
    theme?: 'light' | 'dark';
    className?: string;
    indentWidth?: number;
    collapsed?: boolean |  number;
    noWrap?: boolean;
    styles?:  DtStyleScheme;
    onSelect?: (selectedNode: Node) => void;
}

export interface Node {
    key: string;
    id: string;
    type: 'Property' | 'Interface' | 'Relationship' | 'Component';
    name: string;
    displayName?: string;
    modelId: string;

    // for complex schemas, use of the following
    //  - 'array' + complexValues: [arrayType]
    //  - 'enum' + complexValues: [enum name/value, ...]
    //  - 'map' + complexValues: [key name/schema, key value/schema]
    //  - 'object' + object containing keys (and nested complex objects)
    schema: string;
    complexValues?: string[];
    object?: ComplexProperties[];
    target?: string;
    children?: Node[];
    namespace: string[];
    depth: number;
    collapsed?: boolean;  // for parents, indicates whether to collapse all ancestors
    hide?: boolean; // for descendents, set to true if an ancestor has collapsed === true; used in render to determine whether to show the row
}

export interface InputData {
    [namespace: string]: Node;
}

// for nested object types
interface ComplexProperties {
    name: string,
    schema: string,
    depth: number;
    properties?: ComplexProperties[];
    complexValues?: string[];
}

// DT Model input shapes
interface Model {
    model: Interface;
}

interface Interface {
    '@type': 'Interface',
    '@id': string,
    displayName?: string,
    contents: HasType[];
}

interface HasType {
    '@type': 'Property' | 'Interface' | 'Relationship' | 'Component';
}

// an interface Property has both a @type and a schema.
// a property of a complex object only has an @type (and fields)
interface PropertySchema {
    schema: string | ComplexObjectSchema;
    '@type'?: string;
}

interface ComplexObjectSchema {
    '@type': string;
    fields: object[]
}

// end DT Input shapes

interface ProcessedInput {
    nodeMap: InputData;
    rootNodes: string[];
    idToKeyMap: IdToKeyMap;
}

interface IdToKeyMap {
    [id: string]: string;
}

const defaultIndent = 10;

export const DtModelViewer = React.memo(function DtModelViewer({ jsonContent, indentWidth, onSelect, styles }: DtModelViewerProps) {

    const indentPixels = indentWidth ?? defaultIndent;
    const [ nodeRows, setNodeRows ] = React.useState([]);
    const processedInput = useProcessJson(jsonContent);
    const inputRows = useGetRows(processedInput);
    
    // update the rows when a new file is selected (brings in new content)
    React.useEffect(() => {
        setNodeRows(inputRows);
    }, [inputRows]);

    const onMenuClick = React.useCallback((e: MouseEvent, nodeKey: string, collapse: boolean) => {
        // create a new array object but return existing node objects
        // since their references are used in the node.children array
        const newRows = [...nodeRows]; 
        
        // update the menu setting for the clicked row
        const node = processedInput.nodeMap[nodeKey];
        node.collapsed = collapse;

        // toggle the hide prop of the descendents until either you find a descendent menu that is 'collapsed' or reach all descendents
        const stack = [ ...node.children ];
        while (stack.length) {
            const currentNode = stack.pop();
            currentNode.hide = collapse;
            // add children unless current node (a parent) is collapsed, in which case
            // its descendents are already hidden so we don't want to change them
            if (currentNode.children?.length && !currentNode.collapsed) {
                stack.push(...currentNode.children);
            }
        }
        setNodeRows(newRows);
    }, [nodeRows, processedInput?.nodeMap]);

    return <NodeList nodeRows={nodeRows} onSelect={onSelect} indentPixels={indentPixels} onMenuClick={onMenuClick} styles={styles}/>;

});

function useProcessJson(jsonContent: object | Array<object>): ProcessedInput {
    return React.useMemo(() => {
        if (!jsonContent) { 
            return undefined; 
        }

        // we expect the input to be an object with 'value' property that holds an array of interface objects
        const rawArray: (Model | Interface)[] = !Array.isArray(jsonContent) 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? (jsonContent as { value: Model[]}).value  
                ?? ((jsonContent as Interface)['@type'] === 'Interface' && [ (jsonContent as Interface) ])
                ?? null
            : jsonContent as (Model | Interface)[];
        
        if (!rawArray || !Array.isArray(rawArray)) {
            return undefined;
        }
        
        const nodeMap: InputData = {};
        const rootNodes: string[] = [];
        const idToKeyMap: IdToKeyMap = {};  // for linking related and component interfaces

        // create a rootArray containing only Interface objects
        const rootArray: Interface[] = rawArray.map(rawObj => ((rawObj as Model).model) ? (rawObj as Model).model : (rawObj as Interface))
            .filter(rawObj => rawObj['@type'] === 'Interface');

        // we'll assume there's a depth limit built into DTDL so we won't go
        // to deep and blow the stack. All top-level models should be interfaces.
        const collapsed = rootArray.length > 1;
        for (const rawNode of rootArray) {
            const key = generateId();
            rootNodes.push(key);
            const node: Node = {
                key,
                type: 'Interface',
                id: rawNode['@id'],
                modelId: rawNode['@id'],
                name: rawNode.displayName || rawNode['@id'],
                schema: undefined,  // interface has no schema
                namespace: [],
                children: [],
                depth: 0,
                collapsed
            };
            nodeMap[node.key] = node;
            if (node.id) {
                idToKeyMap[node.id] = node.key;
            }
            if (rawNode.contents) {
                rawNode.contents.forEach(childNode => processObject(childNode, nodeMap, idToKeyMap, node, collapsed));
            }
        }
        
        return { nodeMap, rootNodes, idToKeyMap };
    }, [jsonContent]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processObject(rawNode: any, nodeMap: InputData, idToKeyMap: IdToKeyMap, parentNode: Node, collapsed: boolean) {
    const namespace = [...parentNode.namespace, parentNode.name ?? parentNode.displayName ?? parentNode.id];

    const type = rawNode['@type'];
    const node: Node = {
        key: generateId(),
        type,
        id: rawNode['@id'],
        modelId: parentNode.modelId,
        name: rawNode.name,
        displayName: rawNode.displayName,
        schema: rawNode.schema,  // only Property type and complex schemas have a 'schema' value
        namespace,
        children: [],
        depth: parentNode.depth + 1,
        hide: collapsed
    };
    switch (type?.toLowerCase()) {
        case 'property':
            // eslint-disable-next-line no-case-declarations
            const schema = getSchemaName(rawNode.schema);
            switch (schema.toLowerCase()) {
                case 'object':
                    node.object = getObjectFields(rawNode.schema, node.depth + 1);
                    break;
                case 'array':
                case 'enum':
                case 'map':
                    node.complexValues = getComplexValues(rawNode.schema, schema.toLowerCase());
                    break;
            }
            node.schema = schema;
            parentNode.children.push(node);
            break;
        case 'component':
            node.target = rawNode.schema;
            parentNode.children.push(node);
            break;
        case 'relationship':
            node.target = rawNode.target;
            parentNode.children.push(node);
            break;
    }
    if (node) {
        nodeMap[node.key] = node;
        if (node.id) {
            idToKeyMap[node.id] = node.key;
        }
    }
}

// if this function is only called from a Property object (arg is property's .schema, which is an object w/ a type) or from a complex object within a Property or complex object property
function getSchemaName(schema: string | PropertySchema | ComplexObjectSchema): string {
    // order of checking matters since Property has both @type and schema but @type has different meaning
    // so don't check @type property first if schema is not a string
    if (typeof schema === 'string') { return schema; }
    if ((schema as ComplexObjectSchema).fields ) {
        return schema['@type'];
    }
    return getSchemaName((schema as PropertySchema).schema);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getObjectFields(schema: any, depth: number): ComplexProperties[] {
    return schema.fields.map(field => {
        const fieldSchema = getSchemaName(field);
        const properties = fieldSchema.toLowerCase() === 'object' ? getObjectFields(field.schema, depth + 1) : [];
        const complexValues = fieldSchema.toLowerCase() === 'object' ? [] : getComplexValues(field.schema, fieldSchema);
        return {
            name: field.name,
            schema: fieldSchema,
            properties,
            complexValues,
            depth
        };
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getComplexValues(schema: any, schemaName: string): string[] {
    switch (schemaName) {
        case 'array':
            return [getSchemaName(schema.elementSchema)];
        case 'enum':
            return schema.enumValues.map((val) => `${val.name}: ${val.enumValue}`);
        case 'map':
            return [
                `${schema.mapKey.name} (${getSchemaName(schema.mapKey.schema)})`, 
                `${schema.mapValue.name} (${getSchemaName(schema.mapValue.schema)})`
            ];
    }
}

function useGetRows(processedInput: ProcessedInput): Node[] {
    return React.useMemo(() => {
        const rows: Node[] = [];
        if (!processedInput) {
            return rows;
        }
        const { nodeMap, rootNodes, idToKeyMap } = processedInput;  

        // replace component and relationship nodes with their interfaces
        const nestedInterfaces = [];
        let stack = rootNodes.map(nodeKey => nodeMap[nodeKey]);
        while (stack.length) {
            const node = stack.pop();

            // if any children are components or relationships, replace the child node w/ the top-level interface for that component/interface
            node.children.map(childNode => {
                const type = childNode.type?.toLowerCase();
                if (type === 'component' || type === 'relationship') {
                    // find top-level interface for this component
                    const compInterfaceKey = idToKeyMap[type === 'component' ? childNode.schema : childNode.target];
                    const compInterfaceNode = nodeMap[compInterfaceKey];
                    nestedInterfaces.push(compInterfaceNode.key);

                    // replace the node contents w/ the top-level interface node
                    // Note: these properties of the component node are retained:  
                    //       type, name, displayName, namespace, depth, hide, modelId
                    childNode.id = compInterfaceNode.id;
                    childNode.schema = undefined;
                    childNode.children = compInterfaceNode.children;
                    childNode.collapsed = childNode.hide;
                    childNode.displayName = (typeof childNode.displayName === 'string') 
                        ? childNode.displayName 
                        : (childNode.displayName as { en: string })?.en
                            ? (childNode.displayName as { en: string }).en
                            : (typeof compInterfaceNode.displayName === 'string') 
                                ? compInterfaceNode.displayName 
                                : (compInterfaceNode.displayName as { 'en': string })?.en;

                    // update the depth, namespace and hide props of any children of the component
                    for (const descendent of childNode.children) {
                        updateChild(descendent, childNode);
                    }
                }
            });
            if (node.children.length) {
                stack.push(...node.children);
            }
        }

        // create rows starting only with the top-level interfaces
        const topLevelInterfaces = rootNodes.filter(nodeId => !nestedInterfaces.includes(nodeId));
        const updateCollapsed = rootNodes.length > 1 && topLevelInterfaces.length === 1;
        stack = topLevelInterfaces.map(nodeKey => nodeMap[nodeKey]);
        while (stack.length) {
            const node = stack.pop();
            if (updateCollapsed) {
                node.collapsed = false;
                node.hide = false;
            }
            rows.push(node);
            if (node.children.length) {
                stack.push(...node.children);
            }
        }

        return rows;
    }, [processedInput]);
}

function updateChild(childNode: Node, parentNode: Node) {
    childNode.namespace = [...parentNode.namespace, parentNode.name ?? parentNode.displayName ?? parentNode.id];
    childNode.depth = parentNode.depth + 1;
    childNode.hide = parentNode.collapsed;
    for (const descendent of childNode.children) {
        updateChild(descendent, childNode);
    }
}

interface NodeListProps {
    nodeRows: Node[];
    onSelect?: (selectedNode: Node) => void;
    indentPixels: number;
    onMenuClick: (e: MouseEvent, nodeKey: string, collapse: boolean) => void;
    styles?: DtStyleScheme;
}

function NodeList({ nodeRows, onSelect, indentPixels, onMenuClick, styles }: NodeListProps) {
    const [ selectedNode, setSelectedNode ] = React.useState<string>();
    const content = nodeRows.map(node => {
        const fullName = [...node.namespace, node.name ?? node.displayName ?? node.id].join('.');
        const icon = node.collapsed ? '+' : '-';
        const onClick = (event) => onMenuClick(event, node.key, !node.collapsed);
        const MenuIcon = React.memo(() => <div className='menu-icon icon-button margin-end-xsmall clickable' onClick={onClick}>{icon}</div>);
        const select = node.type.toLowerCase() === 'property'
            ? () => {
                setSelectedNode(selectedNode === node.key ? undefined : node.key);
                onSelect(selectedNode === node.key ? undefined : node);
            }
            : undefined;
        if (!node.hide) {
            const style: React.CSSProperties = { paddingInlineStart: `${indentPixels * node.depth}px` };
            return (
                <div key={fullName} title={fullName} className={'row font-small margin-bottom-xsmall'} style={style}>
                    {!!node.children.length && <MenuIcon />}
                    <div 
                        className={`${select ? ' clickable selectable' : ''} ${selectedNode === node.key ? 'selected' : 'unselected'}`} 
                        onClick={select}>
                            {node.type.toLowerCase() === 'interface' && <div className='interface'>{node.type}: <span style={styles?.interfaceId}>{node.name ?? node.id}</span></div>}
                            {node.type.toLowerCase() === 'property' && <div>
                                <div>{node.type}: <span style={styles?.propertyName}>{node.name ?? node.id}</span></div>
                                {['object', 'map', 'enum'].includes(node.schema.toLowerCase()) 
                                    ? <Details node={node} styles={styles}/>
                                    : <span>(<span  style={styles?.propertySchema}>
                                        {node.schema.toLowerCase() === 'array' ? `${node.complexValues[0]} ` : ''}{node.schema}</span>)
                                    </span>
                                }
                            </div>}
                            {node.type.toLowerCase() === 'component' && <div>
                                <div>{node.type}: <span style={styles?.componentName}>{node.name}</span></div>
                                <div style={styles?.interfaceId}>{node.schema}</div>
                            </div>}
                            {node.type.toLowerCase() === 'relationship' && <div>
                                <div>{node.type}: <span style={styles?.relationshipName}>{node.name} {node.displayName ? `(${node.displayName})` : ''}</span></div>
                                <div style={styles?.interfaceId}>{node.target}</div>
                            </div>}
                    </div>
                </div>
            );
        }
    });
    return (<div className='inner-viewer'>
        {content}
    </div>);
}

interface DetailsProps {
    node: Node;
    styles?: DtStyleScheme;
}

export const Details = React.memo(function Details({ node, styles }: DetailsProps) {
    // Use useId() to ensure that the ID is unique on the page.
    // (It's also okay to use a plain string and manually ensure uniqueness.
    const tooltipId = useId('details');
    let content: JSX.Element;
    const schema = node.schema.toLowerCase();
    switch (schema) {
        case 'object':
            content = (<>
                {node.object.map((detail, idx) => {
                    const style: React.CSSProperties = { paddingInlineStart: `${defaultIndent * detail.depth}px` };
                    const schema = detail.schema.toLowerCase() === 'array' ? `${detail.complexValues[0]} Array` : detail.schema;
                    
                    return (<>
                        <div style={style} key={`${generateId()}-${idx}`}>{detail.name} <span>({schema})</span></div>
                        {(schema.toLowerCase() === 'object') && getObjectSchemaJSX(detail)}
                        {['enum', 'map'].includes(schema.toLowerCase()) && getComplexSchemaJSX(detail.complexValues, schema)}
                    </>);
                })}
            </>);
            break;
        case 'map':
        case 'enum':
            content = getComplexSchemaJSX(node.complexValues, schema);
            break;
    }
  
    return (
        <TooltipHost
          content={content}
          // This id is used on the tooltip itself, not the host
          // (so an element with this id only exists when the tooltip is shown)
          id={tooltipId}
        >
            <span className='details' key={node.key}>(<span style={styles?.propertySchema}>{node.schema}</span>)</span>
        </TooltipHost>
    );
});

function getObjectSchemaJSX(object: ComplexProperties): JSX.Element {
    return (<>
        {object.properties.map((detail, idx) => {
            const style: React.CSSProperties = { paddingInlineStart: `${defaultIndent * detail.depth}px` };
            const schema = detail.schema.toLowerCase() === 'array' ? `${detail.complexValues[0]} Array` : detail.schema;
            
            return (<>
                <div style={style} key={idx}>{detail.name} <span>({schema})</span></div>
                {(schema.toLowerCase() === 'object') && getObjectSchemaJSX(detail)}
                {['enum', 'map'].includes(schema.toLowerCase()) && getComplexSchemaJSX(detail.complexValues, schema)}
            </>);
        })}
    </>);
}

function getComplexSchemaJSX(complexValues: string[], schema: string): JSX.Element {
    switch (schema.toLowerCase()) {
        case 'array':
            return <div>{complexValues[0]} Array</div>;
        case 'enum':
            return (<>
                {complexValues.map((value, idx) => <div key={idx}>{value}</div>)}
            </>);
        case 'map':
            return (<>
                <div>{complexValues[0]}</div>
                <div>{complexValues[1]}</div>
            </>);
        default:
            return null;
    }
}
