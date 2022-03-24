import React from "react";

/**
 * GENERAL
 */
export type DataContent<T> = T | Array<T>;

export type AccountInfo = {
  homeAccountId: string;
  environment: string;
  tenantId: string;
  username: string;
  localAccountId: string;
  name?: string;
  idTokenClaims?: object;
};

/**
 * APIs
 */

export type TwinBasic = {
  $dtId: string;
  $metadata: {
    $model: string;
  };
};

export type ModelBasic = {
  // Indicates if the model is decommissioned. Decommissioned models cannot be referenced by newly created digital twins.
  decommissioned: boolean;
  // A language map that contains the localized descriptions as specified in the model definition.
  description: object;
  // A language map that contains the localized display names as specified in the model definition.
  displayName: object;
  // The id of the model as specified in the model definition.
  id: string;
  // The model definition.
  model: object;
  // The time the model was uploaded to the service.
  uploadTime: string;
};

export type RelationshipBasic = {
  $sourceId: string;
  $relationshipId: string;
  $relationshipName: string;
  $relationshipLink: string;
};

export interface ElectronBridge {
  loadFile: (filePath: string) => Promise<string>;
  signIn: () => Promise<AccountInfo>;
  signInSilent: () => Promise<AccountInfo>;
  signOut: () => Promise<AccountInfo | null>;
  getToken: (resource: string) => Promise<string>;
  getModels: (hostname: string) => Promise<(ModelBasic | object)[]>;
  getTwins: (hostname: string, filter?: string) => Promise<TwinBasic[]>;
  getTwinIncomingRelationships: (
    hostname: string,
    twinId: string
  ) => Promise<RelationshipBasic[]>;
}

// export type DTDLContent = { "@type": 'Interface' | 'Telemetry' | 'Property' | 'Command' } | {
//     "@type": 'Relationship',
//     name: string,
//     displayName: string | { [language: string]: string },
//     minMultiplicity: number,
//     maxMultiplicity: number,
//     target: string
// }

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
  parentRels?: ParentRelationship[];
}

export interface ParentRelationship {
  name: string;
  displayName?: string;
  source: string;
}

export interface CustomTwin {
  twinId: string;
  modelId: string;
  parentRels?: ParentRelationship[];
}

export interface Relationship {
  $sourceId: string;
  $relationshipId: string;
  $relationshipName: string;
  $relationshipLink: string;
}
