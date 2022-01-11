# Azure Digital Twins Uploader

This repo provides a containerized version of the official "UploadModels" tool ([https://github.com/Azure/opendigitaltwins-tools](https://github.com/Azure/opendigitaltwins-tools)) that is used to upload an ontology into an Azure Digital Twins service instance.

The container can run on all x64 platforms.

## Usage
`docker run -v <ontology_path>:/app/ontology -e ADT_INSTANCE="<adt-host>" lukdj/adt-uploader`

With no authentication parameters, the tool will use "DefaultAzureCredentials".

### Ontology
The folder containing the ontology models must be mounted into specific location in the container ("/app/ontology").
The tools will only parse _*.json_ valid files and will take care of ordering models based on dependencies before upload.

The "_DELETE_MODELS_FIRST_" environment variable, when set, recursively deletes aLL Models from ADT Instance before uploading the new ontology.


### Manual authentication
When operating on behalf of the user, authentication parameters must be specified either through environment variables or with a configuration file.

#### Environment
- `ADT_INSTANCE`: The host name of your Azure Digital Twins service instance (with https prefix).
- `TENANT_ID`: The id (GUID) of your tenant or directory in Azure.
- `CLIENT_ID`: The id (GUID) of an Azure Active Directory app registration. See [Create an app registration to use with Azure  Digital Twins](https://docs.microsoft.com/en-us/azure/digital-twins/how-to-create-app-registration) for more information.
- `CLIENT_SECRET`: The Azure Active Directory app secret. When not provided, the tool fall backs to interactive authentication on the browser.

#### Configuration file
It is possible to provide authentication details also by mounting a configuration file to the _/app/serviceConfig.json_ path in the container.

`docker run -v <path_to_local_serviceconfig>:/app/serviceConfig.json -v <ontology_path>:/app/ontology adt-uploader`

The format of the configuration file is the following:
```json
{
  "tenantId": "<GUID>",
  "clientId": "<GUID>",
  "clientSecret": "<SECRET_VALUE>", // if omitted, fallback to interactive auth
  "instanceUrl": "<ADT_INSTANCE_HOST>"
}
```


