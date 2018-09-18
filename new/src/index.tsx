import './style.scss';
import '../assets/fonts/style.scss';

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import App from './App';
import { ThemeProvider } from 'react-themable-hoc';
import { initStyles } from '@cgsweb/theme';

// setup and render App with dark theme
initStyles();
ReactDOM.render(
    <ThemeProvider theme="darkTheme">
        <App />
    </ThemeProvider>,
    document.getElementById('root')
);