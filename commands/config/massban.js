const { buttonVerify } = require('../../util/Util')

exports.run = async(client, message, args, prefix) => {
    if (!args.length) return message.channel.send(`You didn't provide any arguments. The correct usage is \`${prefix}massban <invite code>\``);
    const code = args[0];
    const results = await client.db.invites.findOne({
        guildId: message.guild.id,
        code: code
    });
    const guildData = await client.db.guilds.findOne({
        guildID: message.guild.id
    });
    const lastFetch = guildData.lastFetch ? ` <t:${Math.floor(guildData.lastFetch / 1000)}:F>` : `Not fetch yet`;
    if (!results) return message.channel.send(`There is no invite with the code \`${args[0]}\` in ${message.guild.name}.\nLast fetch: ${lastFetch}\nUse ${prefix}sync to sync all invite (untracked uses might not be banned).`);

    const banList = [];
    const inviter = await message.guild.members.fetch(results.authorId).catch(() => null)
    if (inviter) banList.push(inviter);
    const joinData = await client.db.joins.find({
        joinCode: code,
        guildId: message.guild.id,
    });
    if (joinData.length) {
        for (const join of joinData) {
            const member = await message.guild.members.fetch(join.userId).catch(() => null);
            if (member) banList.push(member);
        }
    };
    if (!banList.length) return message.channel.send(`There is no existing member that used the invite code \`${code}\` in ${message.guild.name}.\nLast fetch: ${lastFetch}\nUse ${prefix}sync to sync all invite (untracked uses might not be banned).`);

    const bannableMember = banList.filter(member => member.bannable);
    const cantBan = banList.filter(member => !member.bannable);
    const banString = `**${bannableMember.length}** members will be banned:\n\`${bannableMember.map(m => m.user.tag).join(', ')}\`\n**${cantBan.length}** members can't be banned:\n${cantBan.length ? cantBan.map(m => m.user.tag).join(', ') : 'None'}\n\n Do you want to continue?`;

    const verification = await buttonVerify(message.channel, message.author, banString);
    if (!verification) return message.channel.send(`Cancelled.`);

    const banMessage = await message.channel.send('Banning...');
    let index = 0;
    for (const member of bannableMember) {
        index++;
        try {
            await member.ban({
                reason: `Massban of invite: ${code}`,
            })
        } catch {
            banMessage.edit(`Failed to ban ${member.user.tag} (${index} of ${bannableMember.length}). Skipping...`);
            continue;
        };
        banMessage.edit(`Banned ${member.user.tag} (${index} of ${bannableMember.length})`);
    }
    message.guild.invites.delete(code)
    return message.channel.send(`Successfully banned **${bannableMember.length}** members. Invite was deleted.`);
}

exports.help = {
    name: "massban",
    description: "Ban multiple people using an invite along with the inviter",
    usage: ["massban `<invite code>`"],
    example: ["massban `sGgFEFmY`"]
};

exports.conf = {
    aliases: [],
    cooldown: 5,
    guildOnly: true,
    userPerms: ['MANAGE_GUILD']
};