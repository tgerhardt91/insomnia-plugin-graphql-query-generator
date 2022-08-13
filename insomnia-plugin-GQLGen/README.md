# insomnia-plugin-graphql-query-generator

## Installation

- Open [Insomnia](https://insomnia.rest/) > Preferences > Plugins
- Type `insomnia-plugin-graphql-query-generator` and install the plugin.

## How To Use

- Open a workspace and click the workflow actions dropdown
- Select **GraphQL-Gen: Settings** to manage headers for the schema query and default headers for GraphQL operations
    > Headers are entered in JSON format eg. {"headerName": "headerValue", "anotherHeaderName": "anotherHeaderValue"}
    > Insomnia environment variables can be used in the default headers, e.g. {"headerName": **"{{_.envVarName}}"**}
- Select **GraphQL-Gen: From URL** to import GraphQL operations via URL
    - In the **Import URL** field, you must supply the full URL of the GraphQL you are trying to import from e.g. http://mygraphqlserver.net/graphql
    - In the **Folder Name** field, supply the base folder name that will be used (will be appended with '_queries', '_mutations' etc.)
    - In the **Generated Request Base URL** field, supply the base URL for generated operations (will be appended with /graphql)
        > Environment variables can be used here, e.g. **{{_.myBaseUrl}}**

## Credits

GraphQL generation largely borrowed and modified from James Gatz's  graphql codegen plugin [github](https://github.com/gatzjames/insomnia-plugin-graphql-codegen-import)

TODO:
- [x] Remove '/graphql' from base url generation
- [] Make base URL auto populate from import URL if empty
- [] Input validation on import form
- [] Look into variable data types
- [] Schema import
- [] Look into env var support for input
- [] Loading symbol while importing