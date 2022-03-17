import { TooltipHost } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import React from 'react';
import { generateId } from './core/generateId';

export interface Node {
    key: string;
    id: string;
    namespace: string[];
    depth: number;
    collapsed?: boolean;  // for parents, indicates whether to collapse all ancestors
    hide?: boolean; // for descendents, set to true if an ancestor has collapsed === true; used in render to determine whether to show the row
}

export interface TagNode extends Node {
    name: string;
    type: string;
    struct?: PropertyDetail[];
}

export interface NSNode extends Node {
    children: (TagNode | NSNode)[];
}

export interface InputData {
    [namespace: string]: NSNode | TagNode;
}

interface StructProperties {
    name: string,
    type: string,
    properties?: StructProperties[];
}

interface PropertyDetail {
    depth: number;
    name: string;
    type: string;
}

interface ProcessedInput {
    nodeMap: InputData;
    rootKey: string;
}

export interface OpcuaStyleScheme {
    nodeName?: React.CSSProperties;
    leafName?: React.CSSProperties;
    path?: React.CSSProperties;
    type?: React.CSSProperties;
}

export interface ViewerProps {
    jsonContent: object | Array<object>;
    flatten?: boolean;
    theme?: 'light' | 'dark';
    className?: string;
    defaultView?: 'hierarchy' | 'flattened';
    indentWidth?: number;
    collapsed?: boolean |  number;
    noWrap?: boolean;
    styles?:  OpcuaStyleScheme;
    onSelect?: (selectedNode: TagNode) => void;
    selectedItemKey: string;
    searchFilter?: string;
}

const defaultIndent = 10;

export const OpcuaViewer = React.memo(function OpcuaViewer(props: ViewerProps) {

    const { jsonContent, flatten, indentWidth, onSelect, styles, selectedItemKey, searchFilter } = props;

    const indentPixels = indentWidth ?? defaultIndent;
    const [ nodeRows, setNodeRows ] = React.useState([]);
    let processedInput;
    let error;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        processedInput = useProcessJson(jsonContent);
    } catch (e) {
        processedInput = undefined;
        error = `Invalid input file (${e?.message})`;
    }
    const inputRows = useGetRows(processedInput);
    const searchRows = React.useMemo(() => searchFilter
        ? inputRows.filter(row => row.id?.includes(searchFilter) || row.namespace?.includes(searchFilter) || (row as TagNode).name?.includes(searchFilter))
        : inputRows,
        [inputRows, searchFilter]);

    // update the rows when a new file is selected (brings in new content)
    React.useEffect(() => {
        setNodeRows(searchRows);
    }, [searchRows]);

    const onMenuClick = React.useCallback((e: MouseEvent, nodeKey: string, collapse: boolean) => {
        // create a new array object but return existing node objects
        // since their references are used in the node.children array
        const newRows = [...nodeRows];

        // update the menu setting for the clicked row
        const node = processedInput.nodeMap[nodeKey];
        node.collapsed = collapse;

        // toggle the hide prop of the descendents until either you find a descendent menu that is 'collapsed' or reach all descendents
        const stack = [ ...(node as NSNode).children ];
        while (stack.length) {
            const currentNode = stack.pop();
            currentNode.hide = collapse;
            // add children unless current node (a parent) is collapsed, in which case
            // its descendents are already hidden so we don't want to change them
            if ((currentNode as NSNode).children?.length && !currentNode.collapsed) {
                stack.push(...(currentNode as NSNode).children);
            }
        }
        setNodeRows(newRows);
    }, [nodeRows, processedInput?.nodeMap]);

    if (error) {
        return (<div className='viewer'>
            {error}
        </div>);
    }
    return (
        <OpcuaNodeList
            nodeRows={nodeRows}
            flatten={flatten}
            onSelect={onSelect}
            indentPixels={indentPixels}
            onMenuClick={onMenuClick}
            styles={styles}
            selectedItemKey={selectedItemKey}
            filtered={!!searchFilter}
        />
    );

});

function useProcessJson(jsonContent: object | Array<object>): ProcessedInput {
    return React.useMemo(() => {
        if (!jsonContent) {
            return undefined;
        }
        const rootObject: object = Array.isArray(jsonContent)
            ? jsonContent[0] ? jsonContent[0] : null
            : jsonContent;

        // we should have a single key in the root object
        if (!rootObject || Object.keys(rootObject).length !== 1) {
            return undefined;
        }

        const rootKey = Object.keys(rootObject)[0];
        const nodeMap: InputData = {};
        const node: NSNode = {
            key: generateId(),
            id: rootKey,
            namespace: [],
            children: [],
            depth: 0
        };
        nodeMap[node.key] = node;
        processObject(rootObject[rootKey], nodeMap, node, false);

        // uncollapse the first collapsed parent
        let currNode = node;
        while (currNode.children?.length < 2) {
            currNode = (currNode.children[0]) as NSNode;
        }
        if (currNode.children) {
            currNode.children.forEach(child => child.hide = false);
            currNode.collapsed = false;
        }

        return { nodeMap, rootKey: node.key };
    }, [jsonContent]);
}

function processObject(rawObj: object, nodeMap: InputData, node: NSNode, collapsed: boolean) {

    const namespace = [...node.namespace, node.id ];

    // as soon as there's a parent with more than one child, collapse the children
    const childCount = Object.keys(rawObj).length;
    node.hide = collapsed;
    collapsed = collapsed || childCount > 1;
    node.collapsed = collapsed;


    // process the keys in this object
    [...Object.keys(rawObj)].forEach(rawChildKey => {

        // base case: if key is 'tags', the value is an array of leaves so add them to the
        // incoming node's children
        if (rawChildKey.toLowerCase() === 'tags') {
            node.children.push(
                ...rawObj['tags'].map(tag => {

                    // if tag is complex type, store its complex format to show on dropdown
                    const list: PropertyDetail[] = [];
                    if (tag.type === 'complex') {
                        getStruct(tag.properties, 0, list);
                    }

                    const tagNode: TagNode = {
                        key: generateId(),
                        id: tag.nodeId,
                        name: tag.name,
                        type: tag.type,
                        namespace,
                        depth: node.depth + 1,
                        struct: list.length ? list : undefined,
                        hide: collapsed
                    };
                    nodeMap[tagNode.key] = tagNode;
                    return tagNode;
                })
            );

        } else {
            // otherwise, process the next level namespace object
            const nsnode: NSNode = {
                key: generateId(),
                id: rawChildKey,
                namespace,
                children: [],
                depth: node.depth + 1,
                hide: collapsed
            };
            nodeMap[nsnode.key] = nsnode;
            node.children.push(nsnode);
            processObject(rawObj[rawChildKey], nodeMap, nsnode, collapsed);
        }
    });
}

function getStruct(properties: StructProperties[], depth: number, list: PropertyDetail[]) {
    for (const property of properties) {
        list.push({
            depth,
            name: property.name,
            type: property.type
        });
        if (property.type === 'complex') {
            // using recursion on assumption depth of node hierarchy will be limited
            getStruct(property.properties, depth + 1, list);
        }
    }
}

function useGetRows(processedInput: ProcessedInput): (NSNode | TagNode)[] {
    return React.useMemo(() => {
        const rows: (NSNode | TagNode)[] = [];
        if (!processedInput) {
            return rows;
        }
        const { nodeMap, rootKey } = processedInput;

        const stack: (NSNode | TagNode)[] = [ nodeMap[rootKey] ];
        while (stack.length) {
            const node = stack.pop();
            rows.push(node);
            if ((node as NSNode).children?.[0]) {
                const children = [...(node as NSNode).children];
                children.sort((a,b) => {
                    if (a.id > b.id) return -1;
                    if (a.id < b.id) return 1;
                    return 0;
                });
                stack.push(...children);
            }
        }
        return rows;
    }, [processedInput]);
}

interface OpcuaNodeListProps {
    nodeRows: (NSNode | TagNode)[];
    flatten?: boolean;
    onSelect?: (selectedNode: TagNode) => void;
    indentPixels: number;
    onMenuClick: (e: MouseEvent, nodeKey: string, collapse: boolean) => void;
    styles?: OpcuaStyleScheme;
    selectedItemKey: string;
    filtered: boolean;
}

function OpcuaNodeList(props: OpcuaNodeListProps) {
    const { nodeRows, flatten, onSelect, indentPixels, onMenuClick, styles, selectedItemKey, filtered } = props;
    const content = nodeRows.map(node => {
        // let match = false;
        const fullName = [...node.namespace, (node as TagNode).name ?? node.id].join('.');
        const tagNode: TagNode = (node as TagNode).type ? node as TagNode : undefined;

        const type = tagNode?.type
            ? tagNode.type === 'complex'
                ? <Details type={tagNode.type} struct={tagNode.struct} styles={styles}/>
                : <span>(<span  style={styles?.type}>{tagNode.type}</span>)</span>
            : '';
        const icon = node.collapsed ? '+' : '-';
        const onClick = (event) => onMenuClick(event, node.key, !node.collapsed);
        const MenuIcon = React.memo(() => <div className='menu-icon icon-button margin-end-xsmall clickable' onClick={onClick}>{icon}</div>);
        const select = tagNode
            ? () => onSelect(selectedItemKey === tagNode.key ? undefined : tagNode)
            : undefined;
        if (flatten && type) {
            return (
                <div key={fullName} title={fullName} className='row vertical-group clickable viewer-card margin-bottom-xsmall font-small' onClick={select}>
                    <div className='horizontal-group justify-ends'>
                        <div className={`font-small selectable ${selectedItemKey === tagNode.key ? 'selected' : ''}`} style={styles?.leafName}>{(node as TagNode).name ?? node.id}</div>
                        <div>{type}</div>
                    </div>
                    <div style={styles?.path}>path: {node.namespace.join('.')}</div>
                </div>
            );
        }
        if (!flatten && (!node.hide || filtered)) {
            const style: React.CSSProperties = { paddingInlineStart: `${indentPixels * node.depth}px` };
            return (
                <div key={fullName} title={fullName} className={`row font-small margin-bottom-xsmall ${selectedItemKey === node.key ? 'selected' : ''}`} style={style}>
                    {!tagNode && <MenuIcon />}
                    <div
                        className={`${select ? ' clickable selectable' : ''}`}
                        onClick={select}
                        style={tagNode?.type ? styles?.leafName || styles?.nodeName : styles?.nodeName}>
                            {(node as TagNode).name ?? node.id}
                    </div>
                    <div className='margin-start-xsmall viewer-row-label'>{type}</div>
                    {!!(node as TagNode).name && <div className='margin-start-xsmall'>{node.id}</div>}
                </div>
            );
        }
    });

    return (<div className='viewer'>
        {content}
    </div>);
}

interface DetailsProps {
    type: string;
    struct: PropertyDetail[];
    styles?: OpcuaStyleScheme;
}

export const Details = React.memo(function Details({ type, struct, styles }: DetailsProps) {
    // Use useId() to ensure that the ID is unique on the page.
    // (It's also okay to use a plain string and manually ensure uniqueness.
    const tooltipId = useId('details');
    const content: JSX.Element = (<>
        {struct.map((detail, idx) => {
            const style: React.CSSProperties = { paddingInlineStart: `${defaultIndent * detail.depth}px` };
            return <div style={style} key={idx}>{detail.name} <span>(<span  style={styles?.type}>{type}</span>)</span></div>
        })}
    </>);

    return (
        <TooltipHost
          content={content}
          // This id is used on the tooltip itself, not the host
          // (so an element with this id only exists when the tooltip is shown)
          id={tooltipId}
        >
            <span className='struct-type'>{`(${type})`}</span>
        </TooltipHost>
    );
});