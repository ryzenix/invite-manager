exports.run = async(client, message, args, prefix) => {
    if (!args.length) return message.channel.send(`You didn't provide any arguments. The correct usage is \`${prefix}add-invite <invite code> <bonus>\`.`);
    if (isNaN(args[1]) || args[1] < 0) return message.channel.send(`You didn't provide a valid bonus. Bonus amount must be a positive number.`);
    message.channel.sendTyping();
    const results = await client.db.invites.findOne({
        guildId: message.guild.id,
        code: args[0]
    });
    const guildData = await client.db.guilds.findOne({
        guildID: message.guild.id
    });
    const lastFetch = guildData.lastFetch ? ` <t:${Math.floor(guildData.lastFetch / 1000)}:F>` : `Not fetch yet`;
    if (!results) return message.channel.send(`There is no invite with the code \`${args[0]}\` in ${message.guild.name}.\nLast fetch: ${lastFetch}\nUse ${prefix}sync to sync all invite.`);
    results.bonus += parseInt(args[1]);
    await results.save();
    return message.channel.send(`Successfully added **${args[1]}** bonus to invite \`${args[0]}\` in ${message.guild.name} ✅`); 
}


exports.help = {
    name: "add-invite",
    description: "Add bonus invites to an existing invite",
    usage: ["add-invite `<invite code> <bonus>`"],
    example: ["add-invite `sGgFEFmY 10`"]
};

exports.conf = {
    aliases: [],
    cooldown: 5,
    guildOnly: true,
    userPerms: ['MANAGE_GUILD']
};