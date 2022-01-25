exports.run = async(client, message, args, prefix) => {
    if (!args.length) return message.channel.send(`You didn't provide any arguments. The correct usage is \`${prefix}remove-invite <invite code> <bonus>\`.`);
    if (isNaN(args[1]) || args[1] < 0) return message.channel.send(`You didn't provide a valid amount. Abstract amount must be a positive number.`);
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
    if (results.bonus < parseInt(args[1])) return message.channel.send(`You can't remove more bonus than the current bonus.`); 
    results.bonus = results.bonus - parseInt(args[1]);
    await results.save();
    return message.channel.send(`Successfully removed **${args[1]}** bonus from invite \`${args[0]}\` in ${message.guild.name} ✅`); 
}


exports.help = {
    name: "remove-invite",
    description: "Remove bonus invites from an existing invite",
    usage: ["remove-invite `<invite code> <bonus>`"],
    example: ["remove-invite `sGgFEFmY 10`"]
};

exports.conf = {
    aliases: [],
    cooldown: 5,
    guildOnly: true,
    userPerms: ['MANAGE_GUILD']
};