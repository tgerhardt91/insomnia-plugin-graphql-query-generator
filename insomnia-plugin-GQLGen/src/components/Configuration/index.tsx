import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import Button from '../Button';
import { RequestHeader } from '../../models/RequestHeader';
import { actionsContainerStyle, dualInputStyle, flex1Style, leftInputStyle, rightInputStyle } from './styles';
import { JSONObject } from 'ts-json-object';
import { ConfigEntry } from './header';
import { v4 as uuidV4 } from 'uuid'

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


  const [schemaHeaders, setSchemaHeaders] = useState<RequestHeader[]>([]);
  const [schemaRequestHeaders, setSchemaRequestHeaders] = useState<string | null>('');
  const [defaultRequestHeaders, setDefaultRequestHeaders] = useState<string | null>('');
  const [schemaHeaderJsonIsValid, setSchemaHeaderJsonIsValid] = useState<boolean>(true);
  const [defaultHeaderJsonIsValid, setDefaultHeaderJsonIsValid] = useState<boolean>(true);
  const [disableSave, setDisableSave] = useState<boolean>(false);

useEffect(() => {
  async function load() {
    console.log('loading schema headers');
    var requestHeaders = await loadRequestHeaders(insomniaContext, 'gql-gen:schemaRequestHeaders');

    requestHeaders.forEach(header => {
      schemaHeaders.push(header);
    });

    schemaHeaders.forEach(item => {
      console.log("saved header " + item.name + " " + item.value);
    });

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

useEffect(() => {
  if(schemaHeaderJsonIsValid && defaultHeaderJsonIsValid) {
    setDisableSave(false);
  }
  else {
    setDisableSave(true);
  }
}, [schemaHeaderJsonIsValid, defaultHeaderJsonIsValid]);

const handleSchemaHeaderNameChange = (event: ChangeEvent<HTMLTextAreaElement>, id: string) => {
  let headers = schemaHeaders.map(header => { return { ...header }} );
  let indexToUpdate = headers.map(header => header.id).indexOf(id);
  headers[indexToUpdate].name = event.target.value;

  setSchemaHeaders(headers);
}

const handleSchemaHeaderValueChange = (event: ChangeEvent<HTMLTextAreaElement>, id: string) => {
  let headers = schemaHeaders.map(header => { return { ...header }} );
  let indexToUpdate = headers.map(header => header.id).indexOf(id);
  headers[indexToUpdate].value = event.target.value;

  setSchemaHeaders(headers);
}

const handleDefaultHeadersChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
  if(isJsonValid(event.target.value) === false) {
    setDefaultHeaderJsonIsValid(false);
    event.target.setCustomValidity("Invalid JSON");
    event.target.reportValidity();
  }
  else {
    setDefaultHeaderJsonIsValid(true);
    event.target.setCustomValidity("");
  }
  setDefaultRequestHeaders(event.target.value);
}

const handleAddNewSchemaHeader = () => {
  console.log("adding new header");
  var newHeader = new RequestHeader("Header Name", "Header Value");
  let updatedHeaders = schemaHeaders.map(header => { return header });
  updatedHeaders.push(newHeader);
  setSchemaHeaders(updatedHeaders);

  schemaHeaders.forEach(element => {
    console.log(element.name);
  });
}

const handleRemoveSchemaHeader = (headerId: string) => {
  console.log("Removing header with id: " + headerId);

  let headers = schemaHeaders.map(header => { return header });

  let indexToRemove = headers.map(header => header.id).indexOf(headerId);
  headers.splice(indexToRemove, 1);

  setSchemaHeaders(headers);
}

const handleSave = useCallback(() => {
  async function execute() {
    var defaultRequestHeaderObjs = buildRequestHeadersFromJson(JSON.parse(defaultRequestHeaders));

    await insomniaContext.store.setItem('gql-gen:schemaRequestHeaders', JSON.stringify(schemaHeaders));
    await insomniaContext.store.setItem('gql-gen:defaultRequestHeaders', JSON.stringify(defaultRequestHeaderObjs));
  }
  execute();
}, [schemaHeaders, defaultRequestHeaders]);

return (
  <form>
    <div className="form-control form-control--outlined">
        <div css={dualInputStyle}>
          <div css ={leftInputStyle}>
            <label>
            Header Name
            </label>
          </div>
          <div css ={rightInputStyle}>
            Header Value
          </div>
          <div css ={flex1Style}>
          </div>
        </div>
        {schemaHeaders.map(schemaHeader => {
          return (
          <div>
           <div css={dualInputStyle}>
            <div css={leftInputStyle}>
            <textarea
              id={"headername" + schemaHeader.id}
              value={schemaHeader.name}
              rows={2}
              onChange={(e) => handleSchemaHeaderNameChange(e, schemaHeader.id)}
            />
            </div>
            <div css={rightInputStyle}>
            <textarea
              id={"headervalue" + schemaHeader.id}
              value={schemaHeader.value}
              rows={2}
              onChange={(e) => handleSchemaHeaderValueChange(e, schemaHeader.id)}
            />
            </div>
        </div>
          <Button
            id={'deleteButton' + schemaHeader.id}
            label='Delete' 
            onClick={() => handleRemoveSchemaHeader(schemaHeader.id)}
            disable={false}
            />
          <br></br>
          </div>
        )})}
    </div>
    <div css={actionsContainerStyle}>
      <Button 
        label='Add New'  
        disable={false}
        onClick={handleAddNewSchemaHeader}
      />
      <Button 
        id='saveButton'
        label='Save' 
        onClick={handleSave}
        closeModal 
        disable={disableSave}
        />
    </div>
    {/* <ul>
          {renderSchemaHeaders()}
        </ul> */}
  </form>
);
};

export default Configuration;