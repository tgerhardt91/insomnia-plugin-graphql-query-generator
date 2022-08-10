import { RequestHeader } from "./RequestHeader";

export class GQLGenConfig {
    schemaRequestHeaders: RequestHeader[];
    defaultRequestHeaders: RequestHeader[];

    constructor(_schemaRequestHeaders: RequestHeader[], _defaultRequestHeaders: RequestHeader[]) {
        this.schemaRequestHeaders = _schemaRequestHeaders;
        this.defaultRequestHeaders = _defaultRequestHeaders;
    }
}