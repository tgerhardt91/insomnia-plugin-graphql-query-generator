// For help writing plugins, visit the documentation to get started:
//   https://support.insomnia.rest/article/173-plugins
import { buildOperationNodeForField } from "@graphql-tools/utils";
import { GQLGenConfigForm } from "./forms"
import { GQLGenConfig } from "./interfaces/GQLGenConfig";
import { RequestHeader } from "./interfaces/RequestHeader";
import * as ReactDom from 'react-dom';
import * as React from 'react';
import {
  buildClientSchema,
  getIntrospectionQuery,
  print,
  GraphQLSchema,
  OperationDefinitionNode,
  IntrospectionQuery,
  buildSchema,
  OperationTypeNode,
  VariableDefinitionNode,
} from "graphql";

import {
  WorkspaceActionModels,
  Context,
  Request,
  RequestGroup,
  WorkspaceAction
} from "insomnia-plugin";

import https from "https";
import http from "http";

import {
  JSONObject
} from "ts-json-object";

let pluginName = `GraphQL Codegen`;

function chunk<T>(arr: T[], size: number) {
  let chunks: T[][] = [];
  let i = 0;
  while (i < arr.length) {
    chunks.push(arr.slice(i, (i += size)));
  }
  return chunks;
}

/**
 * NOTE:
 * Insomnia will generate new ids for any resource with an id that matches this regex: /__\w+_\d+__/g;
 * https://github.com/Kong/insomnia/blob/develop/packages/insomnia-app/app/common/import.ts#L110
 */
function insomniaIdGenerator() {
  let index = 0;

  return function generateInsomniaId() {
    index += 1;
    return `__INSOMNIA_${index}__`;
  };
}

function getCurrentWorkspace(models: WorkspaceActionModels) {
  let workspace = models.workspace;

  return workspace;
}

async function buildGraphQLSchema(schemaString: string): Promise<GraphQLSchema> {
  return new Promise((resolve) => {
    let schemaParseResult: IntrospectionQuery =
      JSON.parse(schemaString)?.data;
    let schema = buildClientSchema(schemaParseResult);
    resolve(schema);
  });
}

function mapFieldsToOperations(
  schema: GraphQLSchema,
  fields: string[],
  kind: OperationTypeNode
) {
  return fields.map((field) =>
    buildOperationNodeForField({
      schema,
      kind,
      field: field,
      depthLimit: 3,
      circularReferenceDepth: 2
    })
  );
}

async function generateOperations(schema: GraphQLSchema) {
  let mutations = schema.getMutationType()?.getFields() || [];

  let queries = schema.getQueryType()?.getFields() || [];
  let subscriptions = schema.getSubscriptionType()?.getFields() || [];

  return {
    mutations: mapFieldsToOperations(
      schema,
      Object.keys(mutations),
      OperationTypeNode.MUTATION
    ),
    queries: mapFieldsToOperations(
      schema,
      Object.keys(queries),
      OperationTypeNode.QUERY
    ),
    subscriptions: mapFieldsToOperations(
      schema,
      Object.keys(subscriptions),
      OperationTypeNode.SUBSCRIPTION
    )
  };
}

async function promptUserForSchema(context: Context) {
  let schema: string;

  try {
    schema = await context.app.prompt(`${pluginName}: Import from schema`, {
      cancelable: true,
      defaultValue: "",
      label: "Please provide the schema of your GraphQL API"
    });
  } catch (e) {
    console.log(e);
    return;
  }

  return schema;
}

async function promptUserForSchemaUrl(context: Context) {
  let schemaUrl: string;
  let url: URL;

  try {
    schemaUrl = await context.app.prompt(`${pluginName}: Import schema from URL`, {
      cancelable: true,
      defaultValue: "",
      label: "Please provide the URL of your GraphQL API"
    });
  } catch (e) {
    console.log(e);
    return;
  }

  try {
    if (!schemaUrl.startsWith("http") || !schemaUrl.startsWith("https")) {
      schemaUrl = `http://${schemaUrl}`;
    }

    url = new URL(schemaUrl);
    return url;
  } catch (e) {
    if (e instanceof Error) {
      await context.app.alert(
        `${pluginName}: Import from Url`,
        "The Url is not valid"
      );
    }
  }
}

async function promptUserForName(context: Context) {
  let nameInput: string;

  try {
    nameInput = await context.app.prompt(`${pluginName}: provide name`, {
      cancelable: true,
      defaultValue: "",
      label: "Please provide the name for the resource folder and url environment variable"
    });
  } catch (e) {
    console.log(e);
    return;
  }

  return nameInput;
}

async function promptUserForBaseUrl(context: Context) {
  let urlInput: string;

  try {
    urlInput = await context.app.prompt(`${pluginName}: provide base url`, {
      cancelable: true,
      defaultValue: "",
      label: "Please provide the base url of your GraphQL API ({{_.env_var_name}} if stored in env. variable)"
    });
  } catch (e) {
    console.log(e);
    return;
  }

  return urlInput;
}

let generateInsomniaId = insomniaIdGenerator();

function getInsomniaResourcesFromOperations(
  operations: OperationDefinitionNode[],
  defaultHeaders: {name: string, value: string}[],
  workspaceId: string,
  name: string,
  operationGroupName: string
) {
  if (operations.length === 0) return [];

  let requestGroup: Partial<RequestGroup & { _type: "request_group" }> = {
    parentId: workspaceId,
    name: operationGroupName,
    _type: "request_group",
    _id: generateInsomniaId()
  };

  function mapOperationToRequest(
    operation: OperationDefinitionNode
  ): Partial<Request & { _type: "request" }> {
    return {
      _id: generateInsomniaId(),
      _type: "request",
      body: {
        mimeType: "application/graphql",
        text: JSON.stringify({
          query: print(operation),
          variables: mapVariablesToJson(operation.variableDefinitions)
        }),
      },
      headers: [
        {
          name: "Content-Type",
          value: "application/json"
        }
      ],
      name: operation.name?.value,
      method: "POST",
      url: "{{_." + name + "}}/graphql",
      parentId: requestGroup._id
    };
  }

  console.debug("Generating requests");

  let requests: Partial<Request>[] = operations.map(mapOperationToRequest);

  requests.forEach(request => {
    request.headers = request.headers.concat(defaultHeaders);
  });

  return [requestGroup, ...requests];
}

function mapVariablesToJson(variableNodes: readonly VariableDefinitionNode[]) {
  let variablesJson = new JSONObject();

  variableNodes.forEach(element => {
    variablesJson[element.variable.name.value] = ""
  });

  return JSON.stringify(variablesJson);
}

/**
 * Transforms the operations to requests and imports them to the current workspace.
 */
async function importToCurrentWorkspace(
  models: WorkspaceActionModels,
  operations: {
    mutations: OperationDefinitionNode[];
    queries: OperationDefinitionNode[];
    subscriptions: OperationDefinitionNode[];
  },
  name: string,
  context: Context
) {
  let workspace = getCurrentWorkspace(models);

  var defaultHeaders = await getDefaultRequestHeaders(context);
  var defaultHeaderObjects = defaultHeaders.map(mapHeaderToObject);

  let subscriptionsRequestGroup = getInsomniaResourcesFromOperations(
    operations.subscriptions,
    defaultHeaderObjects,
    workspace._id,
    name,
    name + "_Subscriptions"
  );

  let queriesRequestGroup = getInsomniaResourcesFromOperations(
    operations.queries,
    defaultHeaderObjects,
    workspace._id,
    name,
    name + "_Queries"
  );

  let mutationsRequestGroup = getInsomniaResourcesFromOperations(
    operations.mutations,
    defaultHeaderObjects,
    workspace._id,
    name,
    name + "_Mutations"
  );

  function mapHeaderToObject(header: RequestHeader) {
    return {
      name: header.name,
      value: header.value
    };
  }

  async function importResources(resources: any[]) {
    let insomniaExportLike = {
      resources,
      _type: "export",
      __export_format: 4
    };

    await context.data.import.raw(JSON.stringify(insomniaExportLike), {
      workspaceId: workspace._id
    });
  }

  let resources = [
    ...subscriptionsRequestGroup,
    ...queriesRequestGroup,
    ...mutationsRequestGroup,
    workspace
  ];

  let resourcesChunks = chunk(resources, 30);

  for (let resourcesChunk of resourcesChunks) {
    await importResources(resourcesChunk);
  }
}

let importToCurrentWorkspaceFromSchema: WorkspaceAction["action"] =
  async function importToCurrentWorkspaceFromSchema(context, models) {
    try {
      let schemaString = await promptUserForSchema(context);
      if (schemaString) {
        let schema = await buildGraphQLSchema(schemaString);
        let operations = await generateOperations(schema);

        let name = await promptUserForName(context);

        await importToCurrentWorkspace(models, operations, name, context);

        context.app.alert(
          `${pluginName}: Import from schema`,
          "Successfully imported GraphQL operations from schema"
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log(`[ERROR] [${pluginName}: From schema] [${error}]`);
        context.app.alert(
          "Error while importing GraphQL operations",
          error.message
        );
      }
    }
  };

  async function fetchGraphQLSchema(url: URL, context: Context): Promise<GraphQLSchema> {
    let introspectionQuery = getIntrospectionQuery();
  
    return new Promise(async (resolve, reject) => {
      let { request: httpRequest, Agent } =
        url.protocol === "https:" ? https : http;
  
      let request = httpRequest(
        {
          method: "POST",
          protocol: url.protocol,
          host: url.host,
          path: url.pathname,
          pathname: url.pathname,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          agent: new Agent({
            rejectUnauthorized: false
          })
        },
        (response) => {
          if (
            response.statusMessage === "OK" ||
            response.statusCode?.toString().startsWith("2")
          ) {
            let data = "";
            response.on("data", (chunk) => {
              data += chunk;
            });
            response.on("end", () => {
              let introspectionResult: IntrospectionQuery =
                JSON.parse(data)?.data;
              let schema = buildClientSchema(introspectionResult);
              resolve(schema);
            });
          }

          response.on("error", reject);
        }
      );

      var headers = await getSchemaRequestHeaders(context);
      headers.forEach(function (header) {
        request.setHeader(header.name, header.value);
      }); 
  
      request.on("error", reject);
      request.write(JSON.stringify({ query: introspectionQuery }));
      request.end();
    });
  }

  async function getSchemaRequestHeaders(context: Context): Promise <RequestHeader[]> {
    var configJson: GQLGenConfig;

    const storedConfig = await context.store.getItem('gql-gen:config');
    try {
        configJson = JSON.parse(storedConfig);
        return configJson.schemaRequestHeaders;
    } catch(e) {
        console.error("Loading config failed: ", e);
        return [];
    }
  }

  async function getDefaultRequestHeaders(context: Context): Promise <RequestHeader[]> {
    var configJson: GQLGenConfig;

    const storedConfig = await context.store.getItem('gql-gen:config');
    try {
        configJson = JSON.parse(storedConfig);
        return configJson.defaultRequestHeaders;
    } catch(e) {
        console.error("Loading config failed: ", e);
        return [];
    }
  }

  let importToCurrentWorkspaceFromUrl: WorkspaceAction["action"] =
  async function importToCurrentWorkspaceFromUrl(context, models) {
    try {
      let schemaUrl = await promptUserForSchemaUrl(context);
      if (schemaUrl) {
        let schema = await fetchGraphQLSchema(schemaUrl, context);
        let operations = await generateOperations(schema);

        await importToCurrentWorkspace(models, operations, schemaUrl.toString(), context);

        context.app.alert(
          `${pluginName}: Import from Url`,
          "Successfully imported GraphQL operations from Url"
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log(`[ERROR] [${pluginName}: From Url] [${error}]`);
        context.app.alert(
          "Error while importing GraphQL operations",
          error.message
        );
      }
    }
  };

/**
 * Insomnia uses this exported key to add workspace actions from plugins
 */
const workspaceActions = [
  {
    label: `${pluginName}: From Schema`,
    action: importToCurrentWorkspaceFromSchema
  },
  {
    label: `${pluginName}: From URL`,
    action: importToCurrentWorkspaceFromUrl
  },
  {
    label: `${pluginName}: Settings`,
    action(context, models) {
      const root = document.createElement('div');
      ReactDom.render(<GQLGenConfigForm context={context}/>, root);

      context.app.dialog('GQLGen - Settings', root, {
          skinny: true,
          onHide() {
              ReactDom.unmountComponentAtNode(root);
          },
      });
  }
  }
];

export { workspaceActions }