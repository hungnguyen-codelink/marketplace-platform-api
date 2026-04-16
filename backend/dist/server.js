"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const env_1 = require("./config/env");
const client_1 = require("./db/client");
const client_2 = require("./redis/client");
const app = (0, app_1.createApp)();
app.listen(env_1.env.PORT, async () => {
    await client_1.db.query('SELECT 1');
    await client_2.redis.connect().catch(() => { });
    console.log(`Server running on port ${env_1.env.PORT}`);
});
