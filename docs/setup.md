# Setup

Clone this repository to get sample code for the Azure Function to be used as export destination in IoT Central.

## Environment

1. Azure Digital Twin
2. Azure Function

## Provision a function

### Setup development environment

The easiest way to deploy the function to an Azure subscription is using the **Azure Function Core Tools** available on NPM.
Extensive instructions are available on the [official repo](https://github.com/Azure/azure-functions-core-tools).

### Installation

```sh
npm i -g azure-functions-core-tools@4 --unsafe-perm true
```

Below is a required step to point the Azure Function to the Azure Digital Twins endpoint.

Edit the _local.settings.json_ file in the function root folder and replace the value for the ADT_INSTANCE with the Digital Twins endpoint URL.

_e.g._

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "ADT_INSTANCE": "https://opcuadt.api.eus2.digitaltwins.azure.net"
  }
}
```

### Deployment
Make sure Azure CLI is logged in and the right subscription has been selected.
```sh
func azure functionapp publish sample-fn --publish-local-settings
```
>The "_--publish-local-settings_" is required to publish the edited configuration as Application Settings for the function in the cloud.
### Authentication
In order to have the function authenticate against the ADT endpoint we will use a managed identity and assign it to the "Data Owner" role of the ADT instance.
Follow [instructions](https://docs.microsoft.com/en-us/azure/digital-twins/tutorial-end-to-end#prepare-your-environment-for-the-azure-cli) on how to prepare your environment for the Azure CLI if you don't have it installed yet.

1. Use the following command to show the system-managed identity for the function. Take note of the **principalId** field in the output.

> **_NOTE_**: If the result of the command above is empty, create a new identity using this command:
>```sh
>az functionapp identity assign --resource-group <FUNCTION_RESOURCE_GROUP_NAME> --name <FUNCTION_NAME>
>```
> The output will then display details of the identity, including the **principalId** value required for the next step.

2. Use the **principalId** value in the following command to assign the function app's identity to the Azure Digital Twins Data Owner role for your Azure Digital Twins instance.

```sh
az dt role-assignment create --dt-name <ADT_NAME> --assignee "<principal-ID>" --role "Azure Digital Twins Data Owner"
```




## Authorize function

## Create export in Central

##
```
