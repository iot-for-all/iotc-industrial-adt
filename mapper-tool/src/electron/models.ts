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
    parentRels?: ParentRelationship[]
}

export interface ParentRelationship { name: string; displayName?: string; source: string }

export interface CustomTwin {
    twinId: string;
    modelId: string;
    parentRels?: ParentRelationship[]
}

export interface Relationship {
    $sourceId: string,
    $relationshipId: string,
    $relationshipName: string,
    $relationshipLink: string,
}