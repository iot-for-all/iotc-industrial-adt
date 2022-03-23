# ADT Bridge Sample

## Environment setup

The following instructions assume Azure Functions Core tools are installed on the machine. If not, follow istructions on ["Install the Azure Fuctions Core Tools"](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=v4%2Cwindows%2Ccsharp%2Cportal%2Cbash#install-the-azure-functions-core-tools) page.

In order to run the function locally with Azure Functions tools, you need to provide authentication details for the Azure Digital Twins instance.

1. Create an Active Directory app registration to interact with ADT. You can learn how to create a compatible app on the official Azure documentation for both [Portal](https://docs.microsoft.com/en-us/azure/digital-twins/how-to-create-app-registration-portal) or [CLI](https://docs.microsoft.com/en-us/azure/digital-twins/how-to-create-app-registration-cli).
2. Create a file named _"serviceConfig.json"_ in function root folder with the following content and replace values with what obtained on previous step:

```json
{
  "tenantId": "<TENANT_ID>",
  "clientId": "<CLIENT_ID>",
  "clientSecret": "<CLIENT_SECRET>",
  "instanceUrl": "https://<ADT_NAME>.api.<REGION>.digitaltwins.azure.net"
}
```

## Test run

1. Install dependencies

```sh
npm install
```

2. Run the function

```sh
npm start
```

3. Test call

`POST: http://localhost:7071/api/Webhook`

```json
{
  "twinRawId": "<twin_id>/<property_name>",
  "value": "<property_value>"
}
```
