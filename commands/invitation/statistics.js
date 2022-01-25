const { MessageEmbed } = require('discord.js');

exports.run = async(client, message, args, prefix) => {
    const member = client.utils.parseMember(message, args[0]) || message.member;
    message.channel.sendTyping();
    const results = await client.db.invites.find({
        guildId: message.guild.id,
        authorId: member.user.id
    }).sort({
        rawUses: -1
    });
    const guildData = await client.db.guilds.findOne({
        guildID: message.guild.id
    });
    const lastFetch = guildData.lastFetch ? ` <t:${Math.floor(guildData.lastFetch / 1000)}:F>` : `Not fetch yet`;
    if (!results.length) return message.channel.send(`There is no invite statistics for ${member.user}. \nLast fetch: ${lastFetch}\nUse ${prefix}sync to sync all invite.`);
    let allTotalUses = 0;
    let allUntracked = 0;
    let allOnServer = 0;
    let allActualUses = 0;
    let allBonus = 0;
    let allFake = 0;
    let allLeave = 0;
    let allSelf = 0;
    let inviteCount = 0;
    let allAPIUses = 0;
    for (const invite of results) {
        const resolvedInvite = await message.guild.invites.fetch(invite.code);
        if (!resolvedInvite) {
            await client.db.invites.findOneAndDelete({
                code: invite.code
            });
        } else {
            inviteCount++;
            allAPIUses += resolvedInvite.uses;
            let untracked = 0;
            const onServer = await client.db.joins.find({
                joinCode: invite.code,
                guildId: message.guild.id
            });
            if (invite.uses < resolvedInvite.uses) untracked = resolvedInvite.uses - invite.uses;
            const actualUses = resolvedInvite.uses + invite.bonus - invite.leaves - invite.fakeUses - invite.self;
            allUntracked += untracked;

            allTotalUses += actualUses;
            allOnServer += onServer.length;
            allActualUses += (actualUses - invite.bonus);
            allBonus += invite.bonus;
            allFake += invite.fakeUses;
            allLeave += invite.leaves;
            allSelf += invite.self;
        }
    }
    const embed = new MessageEmbed()
    .setAuthor({ name: `${member.user.tag}'s invite statistics`, iconURL: member.user.displayAvatarURL() })
    .setDescription(`${member.user} have **${inviteCount}** invites across the server with a total of ${allAPIUses} API uses\nLast fetch: ${lastFetch}`)
    .addField('Total uses:', `**${allTotalUses}** (${Math.floor((allTotalUses / allAPIUses) * 100)}% of uses)`, true)
    .addField('Uses on server:', `**${allOnServer}** (${Math.floor((allOnServer / allAPIUses) * 100)}% of uses)`, true)
    .addField('Actual uses:', `**${allActualUses}** (${Math.floor((allActualUses / allAPIUses) * 100)}% of uses)`, true)
    .addField('Bonus uses:', `**${allBonus}** (${Math.floor((allBonus / allAPIUses) * 100)}% of uses)`, true)
    .addField('Fake uses:', `**${allFake}** (${Math.floor((allFake / allAPIUses) * 100)}% of uses)`, true)
    .addField('Leave uses:', `**${allLeave}** (${Math.floor((allLeave / allAPIUses) * 100)}% of uses)`, true)
    .addField('Self uses:', `**${allSelf}** (${Math.floor((allSelf / allAPIUses) * 100)}% of uses)`, true)
    .addField('Untracked uses:', `**${allUntracked}** (${Math.floor((allUntracked / allAPIUses) * 100)}% of uses)`, true)
    return message.channel.send({ embeds: [embed] })
};

exports.help = {
    name: "statistics",
    description: "Show yours or another person's invitation statistics",
    usage: ["statistics", "statistics `<@user>`"],
    example: ["statistics", "statistics @Wumpus"]
};

exports.conf = {
    aliases: ['stats', 'statistic', 'stat'],
    cooldown: 5,
    guildOnly: true,
    channelPerms: ["EMBED_LINKS"],
    clientPerms: ['MANAGE_GUILD']
};