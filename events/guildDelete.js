const { purgeDbGuild } = require('../util/Util');

module.exports = async(client, guild) => {
    if (!client.isReady() && !guild.avaliable) return;
    return purgeDbGuild(client, guild.id);
};
