module.exports = async(client, role) => {
    await client.db.roles.findOneAndDelete({
        guildId: role.guild.id,
        roleId: role.id
    });
};