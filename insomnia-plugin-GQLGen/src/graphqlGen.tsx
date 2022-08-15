import { buildOperationNodeForField } from "@graphql-tools/utils";
import { GQLGenConfig } from "./models/GQLGenConfig";
import { RequestHeader } from "./models/RequestHeader";
import {
  buildClientSchema,
  getIntrospectionQuery,
  print,
  GraphQLSchema,
  OperationDefinitionNode,
  IntrospectionQuery,
  OperationTypeNode,
  VariableDefinitionNode,
  NamedTypeNode,
  TypeNode,
  Kind
} from "graphql";

import {
  WorkspaceActionModels,
  Context,
  Request,
  RequestGroup} from "insomnia-plugin";

import https from "https";
import http from "http";

import {
  JSONObject
} from "ts-json-object";

let pluginName = `GraphQL Query Generator`;

function chunk<T>(arr: T[], size: number) {
  let chunks: T[][] = [];
  let i = 0;
  while (i < arr.length) {
    chunks.push(arr.slice(i, (i += size)));
  }
  return chunks;
}

//*******
//******* Drivers
//*******
export class GraphQlGenDrivers {
 public async generateGraphQlFromSchema(context, models, folderName: string, baseUrl: string, importSchema: string) {
    try { 
        if (importSchema) {
          let schema = await buildGraphQLSchema(importSchema);
          let operations = await generateOperations(schema);
  
          await importToCurrentWorkspace(models, operations, baseUrl, folderName, context);
  
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
  }

public async generateGraphQlFromUrl(context, models, folderName: string, baseUrl: string, importUrl: URL) {
    try { 
        if (importUrl) {
          let schema = await fetchGraphQLSchema(importUrl, context);
          let operations = await generateOperations(schema);
  
          await importToCurrentWorkspace(models, operations, baseUrl, folderName, context);
  
          context.app.alert(
            `${pluginName}: Import from URL`,
            "Successfully imported GraphQL operations from URL"
          );
        }
      } catch (error) {
        if (error instanceof Error) {
          console.log(`[ERROR] [${pluginName}: From URL] [${error}]`);
          context.app.alert(
            "Error while importing GraphQL operations",
            error.message
          );
        }
      }
  }
}

//*******
//******* Building or querying for GraphQL schema
//*******

async function buildGraphQLSchema(schemaString: string): Promise<GraphQLSchema> {
    return new Promise((resolve) => {
      let schemaParseResult: IntrospectionQuery =
        JSON.parse(schemaString)?.data;
      let schema = buildClientSchema(schemaParseResult);
      resolve(schema);
    });
  }

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

  //*******
  //******* Generating GraphQL operations from schema
  //*******

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

  let generateInsomniaId = insomniaIdGenerator();

  function getCurrentWorkspace(models: WorkspaceActionModels) {
    let workspace = models.workspace;
  
    return workspace;
  }

  function mapVariablesToJson(variableNodes: readonly VariableDefinitionNode[]) {
    let variablesJson = new JSONObject();
  
    variableNodes.forEach(element => {
      variablesJson[element.variable.name.value] = getVariableDefaultValue(element.type)
    });
  
    return JSON.stringify(variablesJson);
  }

  function getVariableDefaultValue(variableNode: TypeNode) {
    var typeName = "";

    if(variableNode.kind === Kind.NON_NULL_TYPE && variableNode.type.kind === Kind.NAMED_TYPE) {
        var innerTypeNode = variableNode.type as NamedTypeNode;
        typeName = innerTypeNode.name.value;
    }
    else if(variableNode.kind === Kind.NAMED_TYPE) {
      typeName = variableNode.name.value;
    }

    switch(typeName) {
      case 'Int':
        return 0;
      case 'Float':
        return 0;
      case 'Boolean':
        return false;
      default:
        return "";
    }
  }

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
        url: name,
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

  //*******
  //******* Import GraphQL operations into current workspace
  //*******
    
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
    baseUrl,
    folderName: string,
    context: Context
  ) {
    let workspace = getCurrentWorkspace(models);
  
    var defaultHeaders = await getDefaultRequestHeaders(context);
    var defaultHeaderObjects = defaultHeaders.map(mapHeaderToObject);
  
    let subscriptionsRequestGroup = getInsomniaResourcesFromOperations(
      operations.subscriptions,
      defaultHeaderObjects,
      workspace._id,
      baseUrl,
      folderName + "_Subscriptions"
    );
  
    let queriesRequestGroup = getInsomniaResourcesFromOperations(
      operations.queries,
      defaultHeaderObjects,
      workspace._id,
      baseUrl,
      folderName + "_Queries"
    );
  
    let mutationsRequestGroup = getInsomniaResourcesFromOperations(
      operations.mutations,
      defaultHeaderObjects,
      workspace._id,
      baseUrl,
      folderName + "_Mutations"
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