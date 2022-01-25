const mongoose = require('mongoose');

const reqString = {
    type: String,
    required: true,
};

const invitesSchema = mongoose.Schema({
    code: reqString,
    authorId: reqString,
    guildId: reqString,
    bonus: {
        type: Number,
        default: 0
    },
    self: {
        type: Number,
        default: 0
    },
    uses: {
        type: Number,
        default: 0
    },
    rawUses: {
        type: Number,
        default: 0
    },
    leaves: {
        type: Number,
        default: 0
    },
    fake: Boolean,
    fakeUses: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Invites', invitesSchema, 'invites');