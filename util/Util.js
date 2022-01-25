const { MessageActionRow, MessageButton } = require('discord.js')

module.exports = class Util {
    static async askString(channel, filter, { time = 20000 } = {}) {
        const verify = await channel.awaitMessages({
            filter: filter,
            max: 1,
            time
        });
        if (!verify.size) return 0;
        const choice = verify.first().content.toLowerCase();
        if (choice === 'cancel') return false;
        return verify.first();
    };
	static async buttonVerify(channel, user, content, { time = 30000 } = {}) {
		const row = new MessageActionRow()
		.addComponents(
			new MessageButton()
			.setCustomId('yes')
			.setLabel('Confirm')
			.setStyle('PRIMARY'),
			new MessageButton()
			.setCustomId('no')
			.setLabel('Cancel')
			.setStyle('SECONDARY')
		);
		const msg = await channel.send({
			content,
			components: [row]
		})
		const filter = async res => {
            if (res.user.id !== user.id) {
                await res.reply({
					content: `Those buttons are only for ${user.toString()}!`,
                    ephemeral: true
                });
                return false;
            };
			await res.deferUpdate();
            row.components.forEach(button => button.setDisabled(true));
            await res.editReply({
				content,
                components: [row]
            });
            return true;
        };
		try {
			const res = await msg.awaitMessageComponent({
				filter,
				componentType: 'BUTTON',
				time
			});
			row.components.forEach(button => button.setDisabled(true));
			await msg.edit({
				components: [row]
			});
			return res.customId === 'yes';
		} catch {
			row.components.forEach(button => button.setDisabled(true));
			await msg.edit({
				components: [row]
			});
			return false;
		};
	};
    static async deleteIfAble(message) {
        if (message.deletable) {
            await message.delete();
        } else return null;
    };
    static async purgeDbGuild(client, id) {
        await client.db.guilds.findOneAndDelete({
            guildID: id
        });
		await client.db.joins.deleteMany({
			guildId: id
		});
		await client.db.invites.deleteMany({
			guildId: id
		});
		await client.db.roles.deleteMany({
			guildId: id
		});
        return true;
    };
    static sec(string) {
		const parts = string.split(':');
		let seconds = 0;
		let minutes = 1;
	
		while (parts.length > 0) {
			seconds += minutes * Number.parseInt(parts.pop(), 10);
			minutes *= 60;
		};
		return seconds;
	};
    static shortenText(text, maxLength) {
        let shorten = false;
        while (text.length > maxLength) {
            if (!shorten) shorten = true;
            text = text.substr(0, text.length - 1);
        }
        return shorten ? `${text}...` : text;
    };
    static async reactIfAble(message, user, emoji, fallbackEmoji) {
        const dm = !message.guild;
        if (fallbackEmoji && (!dm && !message.channel.permissionsFor(user).has('USE_EXTERNAL_EMOJIS'))) {
            emoji = fallbackEmoji;
        }
        if (dm || message.channel.permissionsFor(user).has(['ADD_REACTIONS', 'READ_MESSAGE_HISTORY'])) {
            try {
                await message.react(emoji);
            } catch {
                return null;
            }
        }
        return null;
    };
    static async paginateEmbed(array, msg, row, filter, initialMsg, { time = 60000 } = {}) {
		let currentPage = 0;
		const collector = msg.createMessageComponentCollector({
			componentType: 'BUTTON',
			filter,
			time
		});
		collector.on('end', async() => {
			row.components.forEach(button => button.setDisabled(true));
			if (msg.editable) return msg.edit({
				components: [row],
				embeds: [array[currentPage]]
			});
		})
		collector.on('collect', async(res) => {
			switch (res.customId) {
				case 'previousbtn':
					if (currentPage !== 0) {
						--currentPage;
						await res.editReply({
							embeds: [array[currentPage]]
						});
					};
					break;
				case 'nextbtn':
					if (currentPage < array.length - 1) {
						currentPage++;
						await res.editReply({
							embeds: [array[currentPage]]
						})
					};
					break;
				case 'jumpbtn':
					const prompt = await res.followUp({
						content: `To what page would you like to jump? (1 - ${array.length}) You can use \`0\` or \`cancel\` to cancel.`,
						fetchReply: true
					});
					const filter = async res => {
						if (res.author.id === initialMsg.author.id) {
							const number = res.content;
							await Util.deleteIfAble(res);
							if (isNaN(number) || number > array.length || number < 1) {
								return false;
							}
							else return true;
						} else return false;
					};
					const number = await Util.askString(initialMsg.channel, filter, { time: 15000 });
					if (number === 0 || !number) return prompt.delete();
					else {
                        await prompt.delete();
						currentPage = parseInt(number) - 1;
						await res.editReply({
							embeds: [array[currentPage]]
						});
				    };

					break;
				case 'clearbtn':
					collector.stop();
					break;
			};
		});
	};
};