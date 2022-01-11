import { DigitalTwinsClient } from "@azure/digital-twins-core";
import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { ClientSecretCredential, ManagedIdentityCredential } from "@azure/identity";
import { v4 as uuid4 } from 'uuid';

const ADT_INSTANCE = process.env['ADT_INSTANCE']
let client: DigitalTwinsClient | null = null;
const TENANT_ID = process.env['TENANT_ID'];
const CLIENT_ID = process.env['CLIENT_ID'];
const CLIENT_SECRET = process.env['CLIENT_SECRET'];

type Payload = {
    applicationId: string,
    component?: string,
    messageSource: string,
    model: string,
    parent?: string,
    parentChildRel: string,
    parentModel?: string,
    id: string,
    raw_id?: string,
    properties?: any,
    telemetries?: any
}


const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    const response = [];
    if (!client) {
        response.push('Client initialized');
        let credentials;
        if (TENANT_ID && CLIENT_ID && CLIENT_SECRET) {
            credentials = new ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
            client = new DigitalTwinsClient(ADT_INSTANCE, credentials);
        }
        else {
            credentials = new ManagedIdentityCredential('https://digitaltwins.azure.net');
            client = new DigitalTwinsClient(ADT_INSTANCE, credentials);
        }

    }
    const payload: Payload = req.body;

    try {
        if (payload.id) {
            // fetch digital twin instance first. 
            // That is useful to get list of current properties for the right add/replace operation

            let twin;
            Object.entries(payload.properties).forEach(prop => (prop[1] === null ? delete payload.properties[prop[0]] : 0));
            try {
                ({ body: twin } = await client.getDigitalTwin(payload.id));
            }
            catch (ex) {
                response.push(`Twin ${payload.id} does not exists. Creating...`);
                // twin not existing
                ({ body: twin } = await client.upsertDigitalTwin(payload.id, JSON.stringify({
                    $dtId: payload.id,
                    $metadata: {
                        $model: payload.model,
                        ...payload.raw_id ? { raw_id: payload.raw_id } : {}
                    },
                    ...payload.component ? {} : payload.properties // remove if properties are not known in advance

                })));
                response.push(`[INFO] - Created twin ${JSON.stringify(twin)}`);
            }

            const patch = Object.keys(payload.properties).map(capabilityId => ({
                op: twin[capabilityId] ? 'replace' : 'add',
                path: `/${capabilityId}`,
                value: payload.properties[capabilityId]
            }));
            if (payload.component) {
                await client.updateComponent(payload.id, payload.component, patch);
            }
            else {
                await client.updateDigitalTwin(payload.id, patch);
            }

        }

        if (payload.telemetries) {
            if (payload.component) {
                await client.publishComponentTelemetry(payload.id, payload.component, JSON.stringify(payload.telemetries), uuid4());
            }
            else {
                await client.publishTelemetry(payload.id, JSON.stringify(payload.telemetries), uuid4());
            }
        }



        if (payload.parent && payload.parentChildRel) {
            const relationships = client.listRelationships(payload.parent);
            let relExists = false;
            for await (const relationship of relationships) {
                if (relationship.$relationshipName === payload.parentChildRel && relationship.$targetId === payload.id) {
                    relExists = true;
                }
            }
            if (!relExists) {
                const $relationshipId = uuid4();
                await client.upsertRelationship(payload.parent, $relationshipId, {
                    $sourceId: payload.parent,
                    $targetId: payload.id,
                    $relationshipName: payload.parentChildRel,
                    $relationshipId
                });
                response.push(`[INFO] - Created relationship.`);
            }
        }
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: JSON.stringify(response),
            headers: {
                "Content-Type": 'application/json'
            }
        };
    }
    catch (ex) {
        response.push(`[ERROR] - ${ex.message} - ${getStackTrace(ex)}`);
        context.res = {
            status: 200,
            body: JSON.stringify(response),
            headers: {
                "Content-Type": 'application/json'
            }
        }
    }



};

function getStackTrace(ex: Error) {
    let stack = ex.stack || '';
    const stackLines = stack.split('\n').map(function (line) { return line.trim(); });
    return stackLines.splice(stack[0] == 'Error' ? 2 : 1);
}

export default httpTrigger;