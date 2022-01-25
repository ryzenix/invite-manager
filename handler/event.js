const { readdirSync } = require("fs");
module.exports = client => {
    const events = readdirSync("./events/");
    for (let event of events) {
        const func = require(`../events/${event}`);
        client.on(event.split(".")[0], (...args) => {
            func(client, ...args);
        });
    };
}