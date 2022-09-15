import { useState } from "react";
import { RequestHeader } from "../models/RequestHeader";

export default function useGetSchemaRequestHeaders(context: IInsomniaContext) {
    const [schemaRequestHeaders, setSchemaRequestHeaders] = useState(loadHeaders());

    const insomniaContext = context;
    
    async function loadHeaders() : Promise<RequestHeader[]> {
        const storedSchemaRequestHeaderString = insomniaContext.store.getItem('storeKey');
        return JSON.parse(await storedSchemaRequestHeaderString);
    }

    async function handleSaveHeader(header: RequestHeader) {
        let currentHeaders = await schemaRequestHeaders;

        currentHeaders.push(header);
        await insomniaContext.store.setItem('gql-gen:schemaRequestHeaders', JSON.stringify(currentHeaders));
        setSchemaRequestHeaders(loadHeaders());
    }

    async function handleRemoveHeader(headerId: string) {
        let currentHeaders = await schemaRequestHeaders;
        let filteredHeaders = currentHeaders.filter(item => item.id !== headerId);

        await insomniaContext.store.setItem('gql-gen:schemaRequestHeaders', JSON.stringify(filteredHeaders));
        setSchemaRequestHeaders(loadHeaders());
    }

    async function handleUpdateHeader(header: RequestHeader) {
        let currentHeaders = await schemaRequestHeaders;

        var existingIndex = currentHeaders.findIndex(h => h.id == header.id);

        if(existingIndex !== -1) {
            currentHeaders[existingIndex] = header;
        }

        await insomniaContext.store.setItem('gql-gen:schemaRequestHeaders', JSON.stringify(currentHeaders));
        setSchemaRequestHeaders(loadHeaders());
    }

    return [schemaRequestHeaders, handleSaveHeader, handleRemoveHeader, handleUpdateHeader];
}