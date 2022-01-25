exports.run = async(client, message, args, prefix) => {
    if (!args.length) return message.channel.send(`You didn't provide any arguments. The correct usage is \`${prefix}create-rank <uses> <role name or role mention>\`.`);
    if (isNaN(args[0]) || args[0] < 0) return message.channel.send(`You didn't provide a valid required uses for the rank. The number of uses must be a positive number.`);
    const uses = parseInt(args[0]);
    const roleName = args.slice(1).join(' ');
    const role = message.guild.roles.cache.find(r => (r.name === roleName.toString()) || (r.id === roleName.toString().replace(/[^\w\s]/gi, '')));
    if (!role) return message.channel.send('Invalid role! You can either provide a role name or a role mention.');

    if (!role.editable) return message.channel.send('I cannot edit this role. Please make sure I have the `MANAGE_ROLES` permission, and that the role is not higher than my highest role.');

    await client.db.roles.findOneAndUpdate({
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
    return message.channel.send(`Successfully created rank \`${role.name}\` with **${uses}** uses.`);
}


exports.help = {
    name: "create-rank",
    description: "Create a rank that is assignable to a role for inviter",
    usage: ["create-rank `<uses required> <role name or role mention>`"],
    example: ["add-invite `10 @Nice inviter`"]
};

exports.conf = {
    aliases: [],
    cooldown: 5,
    guildOnly: true,
    clientPerms: ['MANAGE_ROLES'],
    userPerms: ['MANAGE_GUILD']
};