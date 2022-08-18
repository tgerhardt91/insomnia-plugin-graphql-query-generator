import React, { useState, useEffect, useCallback } from 'react';

import { GraphQlGenDrivers } from "../../graphqlGen"

import Button from '../Button';

import { actionsContainerStyle } from './styles';

interface IImportProps {
    models,
    context,
}

function buildUrlFromString(urlString: string) {
if (!urlString.startsWith("http") || !urlString.startsWith("https")) {
    urlString = `http://${urlString}`;
}

var url = new URL(urlString);
return url;
}

const ImportInput: React.FC<IImportProps> = ({ models, context }) => {
    const [importUrl, setImportUrl] = useState<string | null>('https://graphqlpokemon.favware.tech/');
    const [folderName, setFolderName] = useState<string | null>('catch_em_all');
    const [baseUrl, setBaseUrl] = useState<string | null>('https://graphqlpokemon.favware.tech/');
    const [baseUrlTouched, setBaseUrlTouched] = useState<boolean>(false);

    let driver = new GraphQlGenDrivers();
  
    useEffect(() => {
        async function load() {
        load();
    }}, []);

    const handleBaseUrlChange = (newValue) => {
        setBaseUrlTouched(true);
        setBaseUrl(newValue);
    }

    const handleImportUrlChange = (newValue) => {
        if(baseUrlTouched === false) {
            setBaseUrl(newValue);
        }
        setImportUrl(newValue);
    }
  
    const handleSave = useCallback(() => {
      async function execute() {
        var url : URL;

        try {
            url = buildUrlFromString(importUrl)
        }
        catch {
            url = null
        }

        try {
            driver.generateGraphQlFromUrl(context, models, folderName, baseUrl, url);
        }
        catch(e) {
            console.error(e);
            await this.props.context.app.alert('Error!', 'Something went wrong.');
        }
      }
      execute();
    }, [importUrl, folderName, baseUrl]);
    return (
      <form>
        <div className="form-control form-control--outlined">
          <label>
            Import URL:
          <input
            value={importUrl}
            placeholder="{}"
            onChange={event => handleImportUrlChange(event.target.value)}
          />
          </label>
          <label>
            Folder Name:
          <input
            value={folderName}
            placeholder="{}"
            onChange={event => setFolderName(event.target.value)}
          />
          </label>
          <label>
            Generated Request Base URL:
          <input
            value={baseUrl}
            placeholder="{}"
            onChange={event => handleBaseUrlChange(event.target.value)}
          />
          </label>
        </div>
        <div css={actionsContainerStyle}>
          <Button label='Cancel' closeModal />
          <Button label='Submit' onClick={handleSave} closeModal />
        </div>
      </form>
    );
  };

export default ImportInput;