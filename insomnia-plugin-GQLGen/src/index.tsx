import { GQLGenConfigForm } from "./forms/configForm"
import * as ReactDom from 'react-dom';
import * as React from 'react';

import { ImportFromUrlForm } from "./forms/importForm";

let pluginName = `GraphQL Query Generator`;

const workspaceActions = [
  {
    label: `${pluginName}: From URL`,
    action(context, models) {
      const root = document.createElement('div');
      ReactDom.render(<ImportFromUrlForm context={context} models={models}/>, root);
      context.app.dialog('Import GraphQL From URL', root, {
          skinny: true,
          onHide() {
              ReactDom.unmountComponentAtNode(root);
          },
      });
    }
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