import React from 'react';
import ReactDOM from 'react-dom';

import Import from './components/Import/index.js';
import Configuration from './components/Configuration/index.js';

let pluginName = `GraphQL Query Generator`;

const workspaceActions: IInsomniaWorkspaceAction[] = [
  {
    label: `${pluginName}: From URL`,
    icon: 'fa-solid fa-download',
    action: (context, models): void => {
      const root = document.createElement('div');
      ReactDOM.render(
        React.createElement(Import, { models: models, context: context}),
        root,
      );
      context.app.dialog('Import GraphQL From URL', root);
    },
},
{
  label: `${pluginName}: Settings`,
  icon: 'fa-solid fa-gears',
  action: (context, _): void => {
    const root = document.createElement('div');
    ReactDOM.render(
      React.createElement(Configuration, { insomniaContext: context }),
      root,
    );
    context.app.dialog('Settings', root);
  },
},
];

export { workspaceActions }