const mongoose = require('mongoose');
const config = require('../config.json');

const reqString = {
    type: String,
    required: true,
};

const guildSchema = mongoose.Schema({
    guildID: reqString,
    prefix: {
        type: String,
        default: config.prefix
    },
    logChannelId: String,
    lastFetch: Date
});

module.exports = mongoose.model('Guild', guildSchema, 'guilds');