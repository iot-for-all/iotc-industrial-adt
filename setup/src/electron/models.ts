import React from 'react';

export interface DtStyleScheme {
    // model rows
    propertyName?: React.CSSProperties;
    propertySchema?: React.CSSProperties;
    interfaceId?: React.CSSProperties;
    componentName?: React.CSSProperties;
    relationshipName?: React.CSSProperties;
    // twin rows
    modelId?: React.CSSProperties;
    twinId?: React.CSSProperties;
    twinName?: React.CSSProperties;
}

export interface OpcuaItem {
    key: string;
    nodeId: string;
    nodeName: string;
    namespace: string[];
}

export interface DtItem {
    key: string;
    twinKey: string;
    twinId: string;
    twinName: string;
    modelKey: string;
    modelId: string;
    propertyName: string;
    propertyId?: string;
}

export interface InputData {
    [namespace: string]: Node;
}
export interface Interface {
    '@type': 'Interface',
    '@id': string,
    displayName?: string,
    contents: HasType[];
}

export interface HasType {
    '@type': 'Property' | 'Interface' | 'Relationship' | 'Component';
}

// an interface Property has both a @type and a schema.
// a property of a complex object only has an @type (and fields)
export interface PropertySchema {
    schema: string | ComplexObjectSchema;
    '@type'?: string;
}

export interface ComplexObjectSchema {
    '@type': string;
    fields: object[]
}

// end DT Input shapes

export interface ProcessedInput {
    nodeMap: InputData;
    rootNodes: string[];
    idToKeyMap: IdToKeyMap;
}

export interface IdToKeyMap {
    [id: string]: string;
}

// for nested object types
export interface ComplexProperties {
    name: string,
    schema: string,
    depth: number;
    properties?: ComplexProperties[];
    complexValues?: string[];
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

// List Twins shapes
export interface Twin {
    '$dtId': string;
    '$metadata': TwinMetaData;
    'name': string;
}

export interface TwinMetaData {
    '$model': string;
}