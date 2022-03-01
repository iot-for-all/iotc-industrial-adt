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

export interface DtNode {
    twinKey: string;
    twinId: string;
    twinName: string;
    modelId: string;
    modelKey: string;
    propertyName: string;
    propertyId: string;
}