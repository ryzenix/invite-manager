const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js');
const { paginateEmbed } = require('../../util/Util');

exports.run = async(client, message, args, prefix) => {
    message.channel.sendTyping();
    const member = client.utils.parseMember(message, args[0]);
    if (!args[0]) {
        const results = await client.db.invites.find({
            guildId: message.guild.id,
            authorId: message.author.id
        }).sort({
            rawUses: -1
        });
        const guildData = await client.db.guilds.findOne({
            guildID: message.guild.id
        });
        const lastFetch = guildData.lastFetch ? ` <t:${Math.floor(guildData.lastFetch / 1000)}:F>` : `Not fetch yet`;
        if (!results.length) return message.channel.send(`You don't have any invites on the server. Want to see all invitation of a person or all server's created invites? Use \`${prefix}invitation @user\` or \`${prefix}invitation all\`\nLast fetch: ${lastFetch}\nUse ${prefix}sync to sync all invite.`);
        let arr = [];
        for (const invite of results) {
            const resolvedInvite = await message.guild.invites.fetch(invite.code);
            if (!resolvedInvite) {
                await client.db.invites.findOneAndDelete({
                    code: invite.code
                });
            } else {
                let untracked = 0;
                const onServer = await client.db.joins.find({
                    joinCode: invite.code,
                    guildId: message.guild.id
                });
                if (invite.uses < resolvedInvite.uses) untracked = resolvedInvite.uses - invite.uses;
                const actualUses = resolvedInvite.uses + invite.bonus - invite.leaves - invite.fakeUses - invite.self;
                let description = `**${invite.code}** | API: ${resolvedInvite.uses} uses${invite.fake ? ' (LIKELY FAKE)' : ''}`;
                if (resolvedInvite.createdTimestamp) description += `\nCreated at: <t:${Math.floor(resolvedInvite.createdTimestamp / 1000)}:F>`;
                description += `\n**${actualUses}** total uses | **${onServer.length}** on server | **${actualUses - invite.bonus}** actual uses | **${invite.bonus}** reserved | **${invite.leaves}** leaves | **${invite.fakeUses}** fake | **${invite.self}** self uses | **${untracked}** untracked`;
                if (resolvedInvite.expiresTimestamp) description += `\nWill be expired at: <t:${Math.floor(resolvedInvite.expiresTimestamp / 1000)}:R>`;
                arr.push(description)
            }
        }
        const arrSplitted = [];
        while (arr.length) {
            const toAdd = arr.splice(0, arr.length >= 3 ? 3 : arr.length);
            arrSplitted.push(toAdd);
        };
        const arrEmbeds = [];
        arrSplitted.forEach((item, index) => {
            const embed = new MessageEmbed()
                .setAuthor({ name: `${message.author.tag}'s all avaliable invitation`, iconURL: message.author.displayAvatarURL({ dynamic: true, size: 1024 }) })
                .setDescription(`Last fetch: ${lastFetch}\n\n${item.join('\n')}`)
                .setFooter({ text: `Page ${index + 1}/${arrSplitted.length} | Update every 10 minutes` });
            arrEmbeds.push(embed);
        });
        const components = [];
        if (arrEmbeds.length > 1) {
            components.push(
                new MessageButton()
                .setCustomId("previousbtn")
                .setEmoji('⬅️')
                .setStyle("SECONDARY"),
                new MessageButton()
                .setCustomId('jumpbtn')
                .setEmoji('↗️')
                .setStyle('SECONDARY'),
                new MessageButton()
                .setCustomId("nextbtn")
                .setEmoji('➡️')
                .setStyle("SECONDARY")
            )
        };
        components.push(new MessageButton()
            .setCustomId('clearbtn')
            .setEmoji('🗑️')
            .setStyle('DANGER'));
        const row = new MessageActionRow()
            .addComponents(components);
        const msg = await message.channel.send({
            embeds: [arrEmbeds[0]],
            components: [row]
        });
        const filter = async res => {
            if (res.user.id !== message.author.id) {
                await res.reply({
                    content: `Those buttons are for ${message.author.toString()}`,
                    ephemeral: true
                });
                return false;
            } else {
                await res.deferUpdate();
                return true;
            }
        };
        return paginateEmbed(arrEmbeds, msg, row, filter, message);
    } else if (args[0].toLowerCase() === 'all') {
        const results = await client.db.invites.find({
            guildId: message.guild.id
        }).sort({
            rawUses: -1
        });
        const guildData = await client.db.guilds.findOne({
            guildID: message.guild.id
        });
        const lastFetch = guildData.lastFetch ? ` <t:${Math.floor(guildData.lastFetch / 1000)}:F>` : `Not fetch yet`;
        if (!results.length) {
            return message.channel.send(`There isn't any invites on the server. Last fetch: ${lastFetch}\nUse ${prefix}sync to sync all invite.`);
        }
        let arr = [];
        for (const invite of results) {
            const resolvedInvite = await message.guild.invites.fetch(invite.code);
            if (!resolvedInvite) {
                await client.db.invites.findOneAndDelete({
                    code: invite.code
                });
            } else {
                let untracked = 0;
                const onServer = await client.db.joins.find({
                    joinCode: invite.code,
                    guildId: message.guild.id
                });
                if (invite.uses < resolvedInvite.uses) untracked = resolvedInvite.uses - invite.uses;
                const actualUses = resolvedInvite.uses + invite.bonus - invite.leaves - invite.fakeUses - invite.self;
                let description = `**${invite.code}** | API: ${resolvedInvite.uses} uses | <@${invite.authorId}>${invite.fake ? ' (LIKELY FAKE)' : ''}`;
                if (resolvedInvite.createdTimestamp) description += `\nCreated at: <t:${Math.floor(resolvedInvite.createdTimestamp / 1000)}:F>`;
                description += `\n**${actualUses}** total uses | **${onServer.length}** on server | **${actualUses - invite.bonus}** actual uses | **${invite.bonus}** reserved | **${invite.leaves}** leaves | **${invite.fakeUses}** fake | **${invite.self}** self uses | **${untracked}** untracked`;
                if (resolvedInvite.expiresTimestamp) description += `\nWill be expired at: <t:${Math.floor(resolvedInvite.expiresTimestamp / 1000)}:R>`;
                arr.push(description)
            }
        }
        const arrSplitted = [];
        while (arr.length) {
            const toAdd = arr.splice(0, arr.length >= 3 ? 3 : arr.length);
            arrSplitted.push(toAdd);
        };
        const arrEmbeds = [];
        arrSplitted.forEach((item, index) => {
            const embed = new MessageEmbed()
            .setAuthor({ name: `All avaliable invitation on ${message.guild.name}`, iconURL: message.guild.iconURL({ dynamic: true, size: 1024 }) })
            .setDescription(`Last fetch: ${lastFetch}\n\n${item.join('\n')}`)
            .setFooter({ text: `Page ${index + 1}/${arrSplitted.length} | Update every 10 minutes` });
            arrEmbeds.push(embed);
        });
        const components = [];
        if (arrEmbeds.length > 1) {
            components.push(
                new MessageButton()
                .setCustomId("previousbtn")
                .setEmoji('⬅️')
                .setStyle("SECONDARY"),
                new MessageButton()
                .setCustomId('jumpbtn')
                .setEmoji('↗️')
                .setStyle('SECONDARY'),
                new MessageButton()
                .setCustomId("nextbtn")
                .setEmoji('➡️')
                .setStyle("SECONDARY")
            )
        };
        components.push(new MessageButton()
            .setCustomId('clearbtn')
            .setEmoji('🗑️')
            .setStyle('DANGER'));
        const row = new MessageActionRow()
            .addComponents(components);
        const msg = await message.channel.send({
            embeds: [arrEmbeds[0]],
            components: [row]
        });
        const filter = async res => {
            if (res.user.id !== message.author.id) {
                await res.reply({
                    content: `Those buttons are for ${message.author.toString()}`,
                    ephemeral: true
                });
                return false;
            } else {
                await res.deferUpdate();
                return true;
            }
        };
        return paginateEmbed(arrEmbeds, msg, row, filter, message);
    } else if (member) {
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
        if (!results.length) return message.channel.send(`You don't have any invites on the server. Want to see all invitation of a person or all server's created invites? Use \`${prefix}invitation @user\` or \`${prefix}invitation all\`\nLast fetch: ${lastFetch}\nUse ${prefix}sync to sync all invite.`);
        let arr = [];
        for (const invite of results) {
            const resolvedInvite = await message.guild.invites.fetch(invite.code);
            if (!resolvedInvite) {
                await client.db.invites.findOneAndDelete({
                    code: invite.code
                });
            } else {
                let untracked = 0;
                const onServer = await client.db.joins.find({
                    joinCode: invite.code,
                    guildId: message.guild.id
                });
                if (invite.uses < resolvedInvite.uses) untracked = resolvedInvite.uses - invite.uses;
                const actualUses = resolvedInvite.uses + invite.bonus - invite.leaves - invite.fakeUses - invite.self;
                let description = `**${invite.code}** | API: ${resolvedInvite.uses} uses${invite.fake ? ' (LIKELY FAKE)' : ''}`;
                if (resolvedInvite.createdTimestamp) description += `\nCreated at: <t:${Math.floor(resolvedInvite.createdTimestamp / 1000)}:F>`;
                description += `\n**${actualUses}** total uses | **${onServer.length}** on server | **${actualUses - invite.bonus}** actual uses | **${invite.bonus}** reserved | **${invite.leaves}** leaves | **${invite.fakeUses}** fake | **${invite.self}** self uses | **${untracked}** untracked`;
                if (resolvedInvite.expiresTimestamp) description += `\nWill be expired at: <t:${Math.floor(resolvedInvite.expiresTimestamp / 1000)}:R>`;
                arr.push(description)
            }
        }
        const arrSplitted = [];
        while (arr.length) {
            const toAdd = arr.splice(0, arr.length >= 3 ? 3 : arr.length);
            arrSplitted.push(toAdd);
        };
        const arrEmbeds = [];
        arrSplitted.forEach((item, index) => {
            const embed = new MessageEmbed()
                .setAuthor({ name: `${member.user.tag}'s all avaliable invitation`, iconURL: member.user.displayAvatarURL({ dynamic: true, size: 1024 }) })
                .setDescription(`Last fetch: ${lastFetch}\n\n${item.join('\n')}`)
                .setFooter({ text: `Page ${index + 1}/${arrSplitted.length} | Update every 10 minutes` });
            arrEmbeds.push(embed);
        });
        const components = [];
        if (arrEmbeds.length > 1) {
            components.push(
                new MessageButton()
                .setCustomId("previousbtn")
                .setEmoji('⬅️')
                .setStyle("SECONDARY"),
                new MessageButton()
                .setCustomId('jumpbtn')
                .setEmoji('↗️')
                .setStyle('SECONDARY'),
                new MessageButton()
                .setCustomId("nextbtn")
                .setEmoji('➡️')
                .setStyle("SECONDARY")
            )
        };
        components.push(new MessageButton()
            .setCustomId('clearbtn')
            .setEmoji('🗑️')
            .setStyle('DANGER'));
        const row = new MessageActionRow()
            .addComponents(components);
        const msg = await message.channel.send({
            embeds: [arrEmbeds[0]],
            components: [row]
        });
        const filter = async res => {
            if (res.user.id !== member.user.id) {
                await res.reply({
                    content: `Those buttons are for ${member.user.toString()}`,
                    ephemeral: true
                });
                return false;
            } else {
                await res.deferUpdate();
                return true;
            }
        };
        return paginateEmbed(arrEmbeds, msg, row, filter, message);
    }
}

exports.help = {
    name: "invitation",
    description: "Show all invites of the server or a user",
    usage: ["invitation", "invitation `<@user>`", "invitation `all`"],
    example: ["invitation", "invitation @Wumpus", "invitation `all`"]
};

exports.conf = {
    aliases: ['invitations', 'invites', 'invite-list'],
    cooldown: 5,
    guildOnly: true,
    channelPerms: ["EMBED_LINKS"],
    clientPerms: ['MANAGE_GUILD']
};