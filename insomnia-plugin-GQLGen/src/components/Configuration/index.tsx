import React, { useState, useEffect, useCallback, ChangeEvent, SetStateAction } from 'react';
import Button from '../Button';
import { RequestHeader } from '../../models/RequestHeader';
import { actionsContainerStyle } from './styles';
import { JSONObject } from 'ts-json-object';
import { EvalSourceMapDevToolPlugin } from 'webpack';

interface IConfigurationProps {
    insomniaContext: IInsomniaContext
  }

function buildRequestHeadersFromJson(jsonObj: object) {
  var headerArray = [];
  for(var entry in jsonObj) {
    var reqHeader = new RequestHeader(entry, jsonObj[entry]);
    headerArray.push(reqHeader);
  }

  return headerArray;
}

function isJsonValid(jsonString: string) {
  try {
    JSON.parse(jsonString);
  }
  catch(e) { 
    console.error(e);
    return false;
  }

  return true;
}

async function loadRequestHeaders(context: IInsomniaContext, storeKey: string): Promise<RequestHeader[]> {
  const storedSchemaRequestHeaderString = await context.store.getItem(storeKey);
  return JSON.parse(storedSchemaRequestHeaderString);
} 

const Configuration: React.FC<IConfigurationProps> = ({ insomniaContext }) => {
  const [schemaRequestHeaders, setSchemaRequestHeaders] = useState<string | null>('');
  const [defaultRequestHeaders, setDefaultRequestHeaders] = useState<string | null>('');

useEffect(() => {
  async function load() {
    let schemaHeadersJson = new JSONObject();
    (await loadRequestHeaders(insomniaContext, 'gql-gen:schemaRequestHeaders')).forEach(header => {
      schemaHeadersJson[header.name] = header.value;
    });

    let defaultHeadersJson = new JSONObject();
    (await loadRequestHeaders(insomniaContext, 'gql-gen:defaultRequestHeaders')).forEach(header => {
      defaultHeadersJson[header.name] = header.value;
    });

    setSchemaRequestHeaders(JSON.stringify(schemaHeadersJson));
    setDefaultRequestHeaders(JSON.stringify(defaultHeadersJson));
  }
  load();
}, []);

const handleSchemaHeadersChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
  if(isJsonValid(event.target.value) === false) {
    event.target.setCustomValidity("Invalid JSON");
    event.target.reportValidity();
  }
  else {
    event.target.setCustomValidity("");
  }
  setSchemaRequestHeaders(event.target.value);
}

const handleDefaultHeadersChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
  if(isJsonValid(event.target.value) === false) {
    event.target.setCustomValidity("Invalid JSON");
    event.target.reportValidity();
  }
  else {
    event.target.setCustomValidity("");
  }
  setDefaultRequestHeaders(event.target.value);
}

const handleSave = useCallback(() => {
  async function execute() {
    var schemaRequestHeaderObjs = buildRequestHeadersFromJson(JSON.parse(schemaRequestHeaders));
    var defaultRequestHeaderObjs = buildRequestHeadersFromJson(JSON.parse(defaultRequestHeaders));

    await insomniaContext.store.setItem('gql-gen:schemaRequestHeaders', JSON.stringify(schemaRequestHeaderObjs));
    await insomniaContext.store.setItem('gql-gen:defaultRequestHeaders', JSON.stringify(defaultRequestHeaderObjs));
  }
  execute();
}, [schemaRequestHeaders, defaultRequestHeaders]);

return (
  <form>
    <div className="form-control form-control--outlined">
      <label>
        Schema Query Request Headers
      <textarea
        value={schemaRequestHeaders}
        rows={10}
        placeholder="{}"
        onChange={event => handleSchemaHeadersChange(event)}
      />
      </label>
      <label>
        Default Query Request Headers
      <textarea
        value={defaultRequestHeaders}
        rows={10}
        placeholder="{}"
        onChange={event => handleDefaultHeadersChange(event)}
      />
      </label>
    </div>
    <div css={actionsContainerStyle}>
      <Button label='Cancel' closeModal />
      <Button label='Save' onClick={handleSave} closeModal />
    </div>
  </form>
);
};

export default Configuration;