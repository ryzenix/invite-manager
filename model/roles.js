const mongoose = require('mongoose');

const reqString = {
    type: String,
    required: true,
};

const rolesSchema = mongoose.Schema({
    roleId: reqString,
    guildId: reqString,
    uses: {
        type: Number,
    }
});

module.exports = mongoose.model('Roles', rolesSchema, 'roles');