const mongoose = require('mongoose');

const reqString = {
    type: String,
    required: true,
};

const joinsSchema = mongoose.Schema({
    joinCode: reqString,
    userId: reqString,
    guildId: reqString,
    inviterId: reqString,
    fake: Boolean,
    self: Boolean
});

module.exports = mongoose.model('Joins', joinsSchema, 'joins');