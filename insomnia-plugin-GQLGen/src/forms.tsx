import * as React from 'react';
import { JSONObject } from 'ts-json-object';
import { GQLGenConfig } from './interfaces/GQLGenConfig';
import { RequestHeader } from './interfaces/RequestHeader';

async function loadConfig(context): Promise<GQLGenConfig | null> {
    const storedConfig = await context.store.getItem('gql-gen:config');
    try {
        return JSON.parse(storedConfig);
    } catch(e) {
        console.error("Loading config failed: ", e);
        return null;
    }
}

async function storeConfig(context, userConfig: GQLGenConfig) {
    await context.store.setItem('gql-gen:config', JSON.stringify(userConfig));
    console.debug("Item stored: " + context.store.getItem('gql-gen:config'));
}

export class GQLGenConfigForm extends React.Component<any, any> {
    constructor(props) {
        super(props);
        this.state = {
            'schemaRequestHeaders': "",
            'defaultRequestHeaders': ""
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    async componentDidMount() {
        const config = await loadConfig(this.props.context);

        let schemaHeadersJson = new JSONObject();
        config.schemaRequestHeaders.forEach(header => {
            schemaHeadersJson[header.name] = header.value;
        });

        let defaultHeadersJson = new JSONObject();
        config.defaultRequestHeaders.forEach(header => {
            defaultHeadersJson[header.name] = header.value;
        });

        this.setState({['schemaRequestHeaders']: JSON.stringify(schemaHeadersJson)});
        this.setState({['defaultRequestHeaders']: JSON.stringify(defaultHeadersJson)});
    }

    private handleChange(event) {
        const { target: { name, value } } = event;

        if(this.validateJson(value) === false) {
            event.target.setCustomValidity("Invalid JSON");
            event.target.reportValidity();
        }
        else {
            event.target.setCustomValidity("");
        }

        console.debug("Update state property: ", name, value);
        this.setState({[name]: value});
    }
    
    private async handleSubmit(event) {
        try {
            var schemaRequestHeaders = (document.getElementById('schemaRequestHeaders') as HTMLInputElement).value;
            this.setState({'schemaRequestHeaders': schemaRequestHeaders});

            var defaultRequestHeaders = (document.getElementById('defaultRequestHeaders') as HTMLInputElement).value;
            this.setState({'defaultRequestHeaders': defaultRequestHeaders});

            let config = new GQLGenConfig(this.buildRequestHeadersFromJson(JSON.parse(schemaRequestHeaders)), this.buildRequestHeadersFromJson(JSON.parse(defaultRequestHeaders)));

            storeConfig(this.props.context, config);
            await this.props.context.app.alert('Success!', 'Settings saved');
        } catch(e) {
            console.error(e);
            await this.props.context.app.alert('Error!', 'Something went wrong.');
        }
        event.preventDefault();
    }

    private buildRequestHeadersFromJson(jsonObj: object) {
        var headerArray = [];

        for(var entry in jsonObj) {
            var requestHeader = new RequestHeader(entry, jsonObj[entry]);
            headerArray.push(requestHeader);
        }

        return headerArray;
    }

    private validateJson(jsonString) {
        try {
            var jsonObj = JSON.parse(jsonString);
        } catch(e) {
            console.error(e);
            return false;
        }

        return true;
    }

    private flexContainerStyle = {
        'display': 'flex'
    }

    private submitButtonStyle = {
        'display': 'flex',
        'flex-direction': 'row-reverse',
        'flex-basis': '50%'
    }

    render() {
        return (
            <form onSubmit={this.handleSubmit} className="pad">
                <div className="form-control form-control--outlined">
                    <label>
                        Schema Query Request Headers:
                        <input id="schemaRequestHeaders" name="schemaRequestHeaders" type="text" placeholder="[{'name': 'exampleName', 'value': 'exampleValue'}]" value={this.state.schemaRequestHeaders} onChange={this.handleChange} />
                    </label>
                    <label>
                        Default Request Headers:
                        <input id="defaultRequestHeaders" name="defaultRequestHeaders" type="text" placeholder="{}" value={this.state.defaultRequestHeaders} onChange={this.handleChange} />
                    </label>
                </div>

                <div style={this.flexContainerStyle}>
                    <div className="margin-top" style={this.submitButtonStyle}>
                        <button type="submit">Save</button>
                    </div>
                </div>
            </form>
        );
      }
}