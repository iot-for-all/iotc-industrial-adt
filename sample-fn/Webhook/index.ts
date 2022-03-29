import { DigitalTwinsClient, IncomingRelationship, } from "@azure/digital-twins-core";
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import {
  ClientSecretCredential,
  ManagedIdentityCredential,
} from "@azure/identity";
import { v4 as uuid4 } from "uuid";

const Errors = {
  NOT_FOUND: "DigitalTwinNotFound",
  CREDENTIAL_UNAVAILABLE: "CredentialUnavailableError",
  INTERNAL_ERROR: "Internal Function Error"
};

const ADT_INSTANCE = process.env["ADT_INSTANCE"];
let client: DigitalTwinsClient | null = null;

// for local environment
const TENANT_ID = process.env["TENANT_ID"];
const CLIENT_ID = process.env["CLIENT_ID"];
const CLIENT_SECRET = process.env["CLIENT_SECRET"];

/**
 * Properties is an object containing key/value pairs where the key can be a property Id or a component Id.
 * Components use the same iothub conventions:
 * e.g. { "comp_name":{"__t":"c","prop1":"value1"}}
 */

type ParsedId = {
  twinId: string,
  componentName?: string,
  propertyName: string
}

type Payload = {
  twinRawId: string,
  modelId?: string,
  twinName?: string,
  parentRelationships?: {
    name: string;
    displayName?: string;
    source: string;
  }[],
  value: any
};

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log(`Request received: ${JSON.stringify(req.body)}`);
  context.res = {
    status: 200,
    body: [],
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (!client) {
    context.log("Client initialized");
    let credentials;
    if (TENANT_ID && CLIENT_ID && CLIENT_SECRET) {
      credentials = new ClientSecretCredential(
        TENANT_ID,
        CLIENT_ID,
        CLIENT_SECRET
      );
      client = new DigitalTwinsClient(ADT_INSTANCE, credentials);
      context.log(
        `Client connected through secret credentials. Endpoint: ${ADT_INSTANCE}`
      );
    } else {
      credentials = new ManagedIdentityCredential(
        "https://digitaltwins.azure.net"
      );
      client = new DigitalTwinsClient(ADT_INSTANCE, credentials);
      context.log("Client connected through managed identity.");
    }
  }
  const payload: Payload = req.body;

  if (!payload.twinRawId) {
    context.res = {
      body: `Wrong payload received. Missing "id" property.\n${JSON.stringify(
        payload
      )}`,
      status: 204,
    };
    return;
  }
  const parsed = parseTwinId(payload.twinRawId);
  context.log(`Parsed Id: ${JSON.stringify(parsed)}`);
  /**
   * GET TWIN
   *
   */
  let twin;
  try {
    twin = (await client.getDigitalTwin(parsed.twinId)).body;
    context.res.status = 200;
    context.res.body = [
      ...context.res.body,
      {
        operation: "GetTwin",
        status: "Success",
        data: twin,
        request: {
          id: payload.twinRawId,
        },
      },
    ];
  } catch (e) {
    if (e.statusCode === 404 && e.code === Errors.NOT_FOUND) {
      context.res.body = [
        ...context.res.body,
        {
          operation: "GetTwin",
          status: "Fail",
          data: Errors.NOT_FOUND,
          request: {
            id: payload.twinRawId,
          },
        },
      ];
      if (payload.modelId) {
        twin = await createTwin(payload, context);
        await createRelationships(payload, twin, context);
      }
    }
    else {
      context.res.status = 401;
      context.res.body = [
        ...context.res.body,
        {
          operation: "GetTwin",
          status: "Fail",
          data: Errors.CREDENTIAL_UNAVAILABLE,
          request: {
            id: payload.twinRawId,
          },
        },
      ];
      return;
    }
  }

  /**
   * UPDATE TWIN
   *
   */
  if (twin) {
    const patch = buildPatchBody(twin, parsed, payload);
    try {
      const update = await client.updateDigitalTwin(parsed.twinId, patch);
      context.res.status = 200;
      context.res.body = [
        ...context.res.body,
        {
          operation: "UpdateProperties",
          status: "Success",
          data: update,
          request: {
            patch,
          },
        },
      ];
    } catch (e) {
      context.res.status = 500;
      context.res.body = [
        ...context.res.body,
        {
          operation: "UpdateProperties",
          status: "Fail",
          data: e.message,
          request: {
            patch,
          },
        },
      ];
    }
  }
};

function buildPatchBody(
  twin: any,
  parsed: ParsedId,
  payload: Payload
) {

  return [{
    op: twin[parsed.propertyName] ? "replace" : "add",
    path: `/${parsed.componentName ? `${parsed.componentName}/` : ""}${parsed.propertyName}`,
    value: payload.value,
  }, ...(payload.twinName ? [{
    op: twin['name'] ? "replace" : "add",
    path: '/name',
    value: payload.twinName,
  }] : [])];
}

function parseTwinId(rawId: string): ParsedId | null {
  const segments = rawId.split('/');
  if (segments.length < 1) {
    return null;
  }
  let res = { twinId: segments[0] };
  if (segments.length === 3) {
    res['componentName'] = segments[1];
    res['propertyName'] = segments[2];
  }
  else {
    res['propertyName'] = segments[1];
  }
  return res as ParsedId;

}

async function createRelationships(payload: Payload, twin: any, context: Context) {
  /**
     * CREATE RELATIONSHIP
     */
  if (payload.parentRelationships && payload.parentRelationships.length > 0) {
    // fetch existing relationships
    const existingRelationships: { [sourceId: string]: IncomingRelationship } = {};
    if (twin) {
      const rels = client.listIncomingRelationships(twin.$dtId);
      for await (const rel of rels) {
        existingRelationships[rel.sourceId] = rel;
      }
      return await Promise.all(payload.parentRelationships.map(async newRel => {
        const existingRel = existingRelationships[newRel.source];
        if (existingRel && existingRel.relationshipName === newRel.name) {
          // relationship already exists. skip
          return existingRel;
        }
        else {
          try {
            const $relationshipId = uuid4();
            const relResponse = await client.upsertRelationship(newRel.source, $relationshipId, {
              $sourceId: newRel.source,
              $targetId: twin.$dtId,
              $relationshipName: newRel.name,
              $relationshipId
            });
            context.res.status = 201;
            context.res.body = [...context.res.body, {
              operation: 'CreateRelationship',
              status: 'Success',
              data: relResponse.body,
              request: {
                parent: newRel.source,
                relationshipName: newRel.displayName ?? newRel.name
              }
            }];
          }
          catch (e) {
            context.res.status = 400;
            context.res.body = [...context.res.body, {
              operation: 'CreateRelationship',
              status: 'Fail',
              data: e.message,
              request: {
                parent: newRel.source,
                relationshipName: newRel.displayName ?? newRel.name
              }
            }];
          }
        }
      }));
    }
  }
}

async function createTwin(payload: Payload, context: Context) {
  /**
   * CREATE
   * Support twin creation when model is passed
   */
  if (payload.twinRawId && payload.modelId) {
    context.log(`Model has been passed. Creating the twin if does not exists.`);

    // fetch model to init right values
    const modelDef = await client.getModel(payload.modelId, true);
    const modelComponents = modelDef.model.contents?.filter((content) => content['@type'] === 'Component');
    const modelProperties = modelDef.model.contents?.filter((content) => content['@type'] === 'Property');
    const parsedPath = parseTwinId(payload.twinRawId);

    let createOpts = {
      $dtId: parsedPath.twinId,
      $metadata: {
        $model: payload.modelId
      }
    };

    // init components
    modelComponents.forEach(component => {
      let compValue: any;
      // property in component. need to initialize every component
      if (parsedPath.componentName && parsedPath.componentName === component.name) {
        compValue = { [parsedPath.propertyName]: payload.value }
      }
      createOpts[component.name] = {
        $metadata: {},
        ...(payload.twinName ? { name: payload.twinName } : {}),
        ...(compValue ?? {})
      }
    });

    //init properties
    modelProperties.forEach(property => {
      // property not in component
      if (!parsedPath.componentName && parsedPath.propertyName === property.name) {
        createOpts[property.name] = payload.value
      }
    });

    try {
      const twinResponse = await client.upsertDigitalTwin(parsedPath.twinId, JSON.stringify(createOpts));
      context.res.status = 201;
      context.res.body = [...context.res.body, {
        operation: 'CreateTwin',
        status: 'Success',
        data: twinResponse,
        request: {
          id: parsedPath.twinId,
          options: createOpts
        }
      }];
      return twinResponse.body;
    }
    catch (e) {
      context.log(`Error creating digital twin with id '${parsedPath.twinId}'.`);
      context.res.status = 500;
      context.res.body = [...context.res.body, {
        operation: 'CreateTwin',
        status: 'Fail',
        data: e.message,
        request: {
          id: parsedPath.twinId,
          options: createOpts
        }
      }]
      return;
    }
  }
}

export default httpTrigger;
