import { DigitalTwinsClient } from "@azure/digital-twins-core";
import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { ClientSecretCredential, ManagedIdentityCredential } from "@azure/identity";
import { v4 as uuid4 } from 'uuid';


const Errors = {
    NOT_FOUND: 'DigitalTwinNotFound'
}

const ADT_INSTANCE = process.env['ADT_INSTANCE']
let client: DigitalTwinsClient | null = null;
const TENANT_ID = process.env['TENANT_ID'];
const CLIENT_ID = process.env['CLIENT_ID'];
const CLIENT_SECRET = process.env['CLIENT_SECRET'];

/**
 * Properties is an object containing key/value pairs where the key can be a property Id or a component Id.
 * Components use the same iothub conventions:
 * e.g. { "comp_name":{"__t":"c","prop1":"value1"}}
 */

type Payload = {
    applicationId?: string,
    deviceId?: string,
    parentChildRel?: string,
    parentId?: string,
    id: string,
    model?: string,
    properties?: {
        [propertyId: string]: any
    }
}


const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    context.res = {
        status: 200,
        body: [],
        headers: {
            "Content-Type": 'application/json'
        }
    }
    if (!client) {
        context.log('Client initialized');
        let credentials;
        if (TENANT_ID && CLIENT_ID && CLIENT_SECRET) {
            credentials = new ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
            client = new DigitalTwinsClient(ADT_INSTANCE, credentials);
            context.log(`Client connected through secret credentials. Endpoint: ${ADT_INSTANCE}`);
        }
        else {
            credentials = new ManagedIdentityCredential('https://digitaltwins.azure.net');
            client = new DigitalTwinsClient(ADT_INSTANCE, credentials);
            context.log('Client connected through managed identity.')
        }

    }
    const payload: Payload = req.body;

    if (!payload.id) {
        context.res = { body: `Wrong payload received. Missing "id" property.\n${JSON.stringify(payload)}`, status: 400 }
        return;
    }


    /**
     * GET TWIN
     *
     */
    let twin;
    try {
        twin = (await client.getDigitalTwin(payload.id)).body;
        context.res.status = 200;
        context.res.body = [...context.res.body, {
            operation: 'GetTwin',
            status: 'Success',
            data: twin,
            request: {
                id: payload.id
            }
        }];
    }
    catch (e) {
        if (e.statusCode === 404 && e.code === Errors.NOT_FOUND) {
            context.res.body = [...context.res.body, {
                operation: 'GetTwin',
                status: 'Fail',
                data: Errors.NOT_FOUND,
                request: {
                    id: payload.id
                }
            }];
            await createTwin(payload, context);
        }
    }

    /**
     * UPDATE TWIN
     *
     */
    if (twin && payload.properties) {
        const patch = buildPatchBody(twin, payload.properties);
        try {
            const update = await client.updateDigitalTwin(payload.id, patch);
            context.res.status = 200;
            context.res.body = [...context.res.body, {
                operation: 'UpdateProperties',
                status: 'Success',
                data: update,
                request: {
                    patch
                }
            }];
        }
        catch (e) {
            context.res.status = 500;
            context.res.body = [...context.res.body, {
                operation: 'UpdateProperties',
                status: 'Fail',
                data: e.message,
                request: {
                    patch
                }
            }];
        }
    }

    /**
     * CREATE RELATIONSHIP
     */
    if (payload.parentId && payload.parentChildRel) {
        // fetch existing relationships
        let relationship;
        if (twin) {
            const rels = client.listIncomingRelationships(twin.$dtId);
            for await (const rel of rels) {
                if (rel.sourceId === payload.parentId && rel.relationshipName === payload.parentChildRel) {
                    relationship = rel;
                    context.res.body = [...context.res.body, {
                        operation: 'GetRelationship',
                        status: 'Success',
                        data: rel,
                        request: {
                            parent: payload.parentId,
                            relationshipName: payload.parentChildRel
                        }
                    }];
                }
            }
        }

        if (!relationship) {
            try {
                const $relationshipId = uuid4();
                const relResponse = await client.upsertRelationship(payload.parentId, $relationshipId, {
                    $sourceId: payload.parentId,
                    $targetId: twin.$dtId,
                    $relationshipName: payload.parentChildRel,
                    $relationshipId
                });
                context.res.status = 201;
                context.res.body = [...context.res.body, {
                    operation: 'CreateRelationship',
                    status: 'Success',
                    data: relResponse.body,
                    request: {
                        parent: payload.parentId,
                        relationshipName: payload.parentChildRel
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
                        parent: payload.parentId,
                        relationshipName: payload.parentChildRel
                    }
                }];
            }
        }
    }
};



function buildPatchBody(twin: object, properties: object, componentName?: string) {
    return Object.entries(properties).reduce((obj, prop) => {
        const [propKey, propValue] = prop;
        const { '__t': comp, ...otherProps } = propValue
        if (comp && comp === 'c') {
            return [...obj, ...buildPatchBody(twin, otherProps, propKey)];
        }
        return [
            ...obj,
            {
                op: twin[propKey] ? 'replace' : 'add',
                path: `/${componentName ? `${componentName}/` : ''}${propKey}`,
                value: propValue
            }
        ]
    }, [])
}

async function createTwin(payload: Payload, context: Context) {
    /**
     * CREATE
     * Support twin creation when model is passed
     */
    if (payload.id && payload.model) {
        context.log(`Model has been passed. Creating the twin if does not exists.`);

        // fetch model to init right values
        const modelDef = await client.getModel(payload.model, true);
        const modelComponents = modelDef.model.contents?.filter((content) => content['@type'] === 'Component');
        const modelProperties = modelDef.model.contents?.filter((content) => content['@type'] === 'Property');

        let createOpts = {
            $dtId: payload.id,
            $metadata: {
                $model: payload.model
            }
        };

        // init components
        modelComponents.forEach(component => {
            let comp: string;
            let compValue: any;
            if (payload.properties[component.name]) {
                ({ '__t': comp, ...compValue } = payload.properties[component.name]);
            }
            createOpts[component.name] = {
                $metadata: {},
                ...(comp ? compValue : {})
            }
        });

        //init properties
        modelProperties.forEach(property => {
            if (payload.properties[property.name]) {
                createOpts[property.name] = payload.properties[property.name]
            }
        });

        try {
            const twinResponse = await client.upsertDigitalTwin(payload.id, JSON.stringify(createOpts));
            context.res.status = 201;
            context.res.body = [...context.res.body, {
                operation: 'CreateTwin',
                status: 'Success',
                data: twinResponse,
                request: {
                    id: payload.id,
                    options: createOpts
                }
            }]
        }
        catch (e) {
            context.log(`Error creating digital twin with id '${payload.id}'.`);
            context.res.status = 400;
            context.res.body = [...context.res.body, {
                operation: 'CreateTwin',
                status: 'Fail',
                data: e.message,
                request: {
                    id: payload.id,
                    options: createOpts
                }
            }]
            return;
        }
    }
}

function getStackTrace(ex: Error) {
    let stack = ex.stack || '';
    const stackLines = stack.split('\n').map(function (line) { return line.trim(); });
    return stackLines.splice(stack[0] == 'Error' ? 2 : 1);
}

export default httpTrigger;