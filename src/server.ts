import { createApp } from './app.js';
import { config } from './config.js';
import { container } from './container.js';

createApp( container).listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
});