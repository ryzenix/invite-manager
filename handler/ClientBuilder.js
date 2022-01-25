const { Client, Collection } = require("discord.js");
const { parseMember } = require("../util/mentionParsing");
module.exports = class kiri extends Client {
    constructor(options) {
        super(options);
        this.utils = {
            parseMember,
        };
        this.deletedChannels = new WeakSet();
        this.commands = new Collection();
        this.helps = new Map();
        this.aliases = new Map();
        this.config = require("../config.json");
        this.recent = new Set();
        this.db = {
            guilds: require('../model/guilds'),
            roles: require('../model/roles'),
            invites: require('../model/invites'),
            joins: require('../model/joins'),
        }
    }
};
