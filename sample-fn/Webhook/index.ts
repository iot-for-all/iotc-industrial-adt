import { DigitalTwinsClient } from "@azure/digital-twins-core";
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
  model?: string,
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
      // if (payload.model) {
      //   await createTwin(payload, context);
      // }
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
    const patch = buildPatchBody(twin, parsed, payload.value);
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
  value: any
) {

  return [{
    op: twin[parsed.propertyName] ? "replace" : "add",
    path: `/${parsed.componentName ? `${parsed.componentName}/` : ""}${parsed.propertyName}`,
    value: value,
  }];
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

export default httpTrigger;
