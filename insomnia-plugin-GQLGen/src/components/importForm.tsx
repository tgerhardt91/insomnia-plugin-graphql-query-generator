import * as React from "react";
import { GraphQlGenDrivers } from "../graphqlGen"

function buildUrlFromString(urlString: string) {
    if (!urlString.startsWith("http") || !urlString.startsWith("https")) {
        urlString = `http://${urlString}`;
    }

    var url = new URL(urlString);
    return url;
}

export class ImportFromUrlForm extends React.Component<any, any> {
    constructor(props) {
        super(props);

        this.state = {
            'importUrl': "https://graphqlpokemon.favware.tech/",
            'folderName': "catch_em_all",
            'baseUrl': "https://graphqlpokemon.favware.tech/",
            'baseUrlTouched': false
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    driver = new GraphQlGenDrivers();

    async componentDidMount() {
        this.setState({'importURL': ""});
    }

    private async handleSubmit(event) {
        try {
            var importUrlString = (document.getElementById('importUrl') as HTMLInputElement).value;
            try {
                var url = buildUrlFromString(importUrlString);
                this.setState({'importUrl': url});
            } catch {
                this.setState({'importUrl': ""});
            }

            var folderName = (document.getElementById('folderName') as HTMLInputElement).value;
            this.setState({'folderName': folderName});

            var baseUrl = (document.getElementById('baseUrl') as HTMLInputElement).value;
            this.setState({'baseUrl': baseUrl});

            console.debug("Generating by URL: " + this.state);

            await this.driver.generateGraphQlFromUrl(this.props.context, this.props.models, folderName, baseUrl, await url);
        } catch(e) {
            console.error(e);
            await this.props.context.app.alert('Error!', 'Something went wrong.');
        }
        event.preventDefault();
    }

    private handleChange(event) {
        const { target: { name, value } } = event;
        if(name === 'importUrl') {
            if(this.state.baseUrlTouched === false) {
                this.setState({'baseUrl': value});
            }

            try {
                buildUrlFromString(value);
                event.target.setCustomValidity("");
            } catch {
                event.target.setCustomValidity("Invalid URL");
                event.target.reportValidity();
            }
        }
        else if(name === 'baseUrl') {
            this.setState({'baseUrlTouched': true});
        }

        this.setState({[name]: value});
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
                        Import URL:
                        <input id="importUrl" name="importUrl" type="text" placeholder="" value={this.state.importUrl} onChange={this.handleChange} />
                    </label>
                    <label>
                        Folder Name:
                        <input id="folderName" name="folderName" type="text" placeholder="" value={this.state.folderName} onChange={this.handleChange} />
                    </label>
                    <label>
                        Generated Request Base URL:
                        <input id="baseUrl" name="baseUrl" type="text" placeholder="" value={this.state.baseUrl} onChange={this.handleChange} />
                    </label>
                </div>

                <div style={this.flexContainerStyle}>
                    <div className="margin-top" style={this.submitButtonStyle}>
                        <button type="submit">Import</button>
                    </div>
                </div>
            </form>
        );
      }
}