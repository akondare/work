import * as React from 'react';

import App from './App';
import { shallow } from 'enzyme';

describe('App', () => {
    test('Successfully mounts', () => {
        const app = shallow(<App />);
        expect(app.is('.app')).toBe(true);
    });
});
