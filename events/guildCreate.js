module.exports = async(client, guild) => {
    if (!client.isReady() && !guild.avaliable) return;
    const guildexist = await client.db.guilds.findOne({
        guildID: guild.id
    });

    if (guildexist) return;
    const Guild = client.db.guilds;
    const newGuild = new Guild({
        guildID: guild.id
    });

    return newGuild.save();
};