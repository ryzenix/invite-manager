exports.run = async(client, message, args, prefix) => {
    if (!args.length) return message.channel.send(`You didn't provide any arguments. The correct usage is \`${prefix}delete-rank <role ID>\`.`);

    const roleData = await client.db.roles.findOne({
        roleId: args[0],
        guildId: message.guild.id
    });
    if (!roleData) return message.channel.send(`There is no rank with the role ID \`${args[0]}\` in ${message.guild.name}.`);

    await client.db.roles.findOneAndDelete({
        roleId: role.id,
        guildId: message.guild.id
    }, {
        roleId: role.id,
        guildId: message.guild.id,
        uses: uses,
    }, {
        upsert: true,
        new: true,
    });
    return message.channel.send(`Successfully deleted rank with the role ID \`${args[0]}\` with **${roleData.uses}** uses.`);
}


exports.help = {
    name: "delete-rank",
    description: "Delete an inviter rank",
    usage: ["delete-rank `<role ID>`"],
    example: ["delete-rank `<role ID>`"]
};

exports.conf = {
    aliases: [],
    cooldown: 5,
    guildOnly: true,
    clientPerms: ['MANAGE_ROLES'],
    userPerms: ['MANAGE_GUILD']
};