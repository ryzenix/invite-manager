process.on('unhandledRejection', error => {
    console.error(`unhandledRejection:`, error);
});

const config = require('./config.json');


const Heatsync = require("heatsync");
const sync = new Heatsync();

sync.events.on("error", console.error)
sync.events.on("any", (file) => console.log(`${file} was changed`));
global.sync = sync;


const mongo = require('./util/mongo');
const inviteManager = require("./handler/ClientBuilder.js");
const { Intents } = require('discord.js');

const intents = new Intents();

intents.add(
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_INVITES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_BANS
);

const client = new inviteManager({
    intents,
    allowedMentions: {
        parse: ['users', 'roles'],
        repliedUser: true
    }
});
client.on("warn", warn => console.warn(warn));
client.on("error", err => {
    console.error('error', err)
});
require("./handler/module.js")(client);
require("./handler/event.js")(client);

(async() => {
    await mongo.init();
    client.login(config.token).catch(err => console.error(err));
})();

module.exports = client;
