exports.run = async (client, message, args, prefix) => {
    if (args.length < 1) {
        return message.channel.send(
            `The current current guild prefix here is \`${prefix}\` and you could use \`${prefix}set-prefix <prefix>\` to change the prefix`
        );
    }
    await client.dbguilds.findOneAndUpdate(
        {
            guildID: message.guild.id,
        },
        {
            prefix: args[0],
        }
    );
    return message.channel.send(`The current guild prefix has been updated to \`${args[0]}\``);
};

exports.help = {
    name: "set-prefix",
    description: "Change the server prefix",
    usage: ["set-prefix `<prefix>`"],
    example: ["set-prefix `!`"],
};

exports.conf = {
    aliases: ["change-prefix", "setprefix", "prefix"],
    cooldown: 3,
    guildOnly: true,
    userPerms: ["MANAGE_GUILD"],
    channelPerms: ["EMBED_LINKS"],
};
