const { purgeDbGuild } = require('../util/Util');
const { OAuth2Guild } = require('discord.js');
const schedule = require('node-schedule');

module.exports = async client => {
    console.log(`[DISCORD] Logged in as ${client.user.tag}!`);
    client.finished = false;
    console.log('[DISCORD] Syncing servers against DB...');
    const servers = await client.guilds.fetch().then(guilds => [...guilds.values()]);
    if (servers.length) {
        for (const guildData of servers) {
            const guildDb = await client.db.guilds.findOne({
                guildID: guildData.id
            });
            if (!guildDb) {
                const newGuild = new client.db.guilds({
                    guildID: guildData.id,
                });
                await newGuild.save();
            };
        };
    }
    console.log('[DISCORD] Syncing DB against servers... (interval: 10 minutes)');
    const dbServer = await client.db.guilds.find({});
    if (dbServer.length) {
        for (const guildData of dbServer) {
            try {
                let guild = await client.guilds.fetch(guildData.guildID);
                try {
                    if (guild instanceof OAuth2Guild) guild = await guild.fetch(); 
                    const invitations = await guild.invites.fetch();
                    await client.db.guilds.findOneAndUpdate({
                        guildID: guildData.guildID
                    }, {
                        lastFetch: Date.now()
                    }, {
                        upsert: true,
                        new: true,
                    });
                    invitations.each(async invite => {
                        const resolvedInvite = await client.db.invites.findOne({
                            code: invite.code
                        });
                        if (!resolvedInvite) {
                            if (!invite.inviterId) return;
                            if (!invite.inviter) return;
                            let fake = false;
                            const { createdTimestamp } = invite.inviter;
                            if ((Date.now() - createdTimestamp) < client.config.fakeTimeoutMs) fake = true;
                            const data = new client.db.invites({
                                code: invite.code,
                                authorId: invite.inviterId,
                                guildId: guild.id,
                                fake,
                                rawUses: invite.uses,
                            });
                            await data.save();
                        } else {
                            await client.db.invites.findOneAndUpdate({
                                code: invite.code
                            }, {
                                code: invite.code,
                                rawUses: invite.uses
                            });
                        }
                    })
                } catch (error) {
                    console.error(`Error while fetching invitation in guild ${guild.name} (id: ${guild.id})`, error);
                };
            } catch (err) {
                await purgeDbGuild(client, guildData.guildID);
                console.error(`Kicked from an undefined server (id: ${guildData.guildID}).`, err);
            };
        };
    };
    console.log('[DISCORD] Fetching leaving members...');
    const allJoinData = await client.db.joins.find({});
    if (allJoinData.length) {
        let unavaliableGuilds = [];
        for (const data of allJoinData) {
            if (unavaliableGuilds.includes(data.guildId)) continue;
            const guild = client.guilds.cache.get(data.guildId);
            if (!guild) {
                unavaliableGuilds.push(data.guildId);
                await client.db.joins.deleteMany({
                    guildId: data.guildId
                });
                continue;
            };
            const member = await guild.members.fetch(data.userId).catch(() => null);
            if (!member) {
                await client.db.joins.findOneAndDelete({
                    guildId: data.guildId,
                    userId: data.userId
                });
                const inviteData = await client.db.invites.findOne({
                    code: data.joinCode
                });
                if (!inviteData) return;
                inviteData.leaves += 1;
                await inviteData.save();
                continue;
            };
        }
    };
    console.log('[DISCORD] Fetching existing invites...');
    const allInvites = await client.db.invites.find({});
    if (allInvites.length) {
        for (const invite of allInvites) {
            try {
                await client.fetchInvite(invite.code);
            } catch (err) {
                console.log(`Deleted an invalid invitation (id: ${guild.guildID}).`);
                await client.db.invites.findOneAndDelete({
                    code: invite.code
                });
            }
        }
        console.log('[DISCORD] Fetching ranks against roles...');
        const roles = await client.db.roles.find({});
        if (roles.length) {
            const everyGuildIds = allInvites.map(invite => invite.guildId).filter((item, pos, self) => {
                return self.indexOf(item) == pos;
            });
            for (const guildId of everyGuildIds) {
                const guildRoles = roles.filter(role => role.guildId === guildId);
                if (!guildRoles.length) continue;
                const guildInvites = allInvites.filter(invite => invite.guildId === guildId);
                const everyUserIds = guildInvites.map(invite => invite.authorId).filter((item, pos, self) => {
                    return self.indexOf(item) == pos;
                });
                const guild = client.guilds.cache.get(guildId);
                for (const userId of everyUserIds) {
                    const userInvites = guildInvites.filter(invite => invite.authorId === userId && invite.guildId === guildId);
                    let totalUses = userInvites.map(i => i.bonus).reduce((acc, cur) => acc + cur);
                    for (const invite of userInvites) {
                        const joinsData = await client.db.joins.find({
                            joinCode: invite.code,
                        });
                        if (!joinsData.length) continue;
                        const totalJoins = joinsData.filter(join => !join.self && !join.fake).length;
                        totalUses += totalJoins;
                    }
                    let avaliableRoles = guildRoles.filter(role => role.uses <= totalUses)
                    if (!avaliableRoles.length) continue;
                    avaliableRoles = avaliableRoles.map(role => role.roleId);
                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (!member) continue;
                    avaliableRoles.forEach(async role => {
                        const roleObj = await guild.roles.fetch(role).catch(() => null);
                        if (!roleObj || !roleObj.editable) return;
                        if (member._roles.includes(role)) return;
                        member.roles.add(roleObj);
                    });
                }
                console.log(`[DISCORD] Fetching roles against ranks in guild ${guildId}`);
                const rankRoles = guildRoles.map(role => role.roleId);
                let everyMembers = await guild.members.fetch();
                everyMembers = everyMembers.filter(member => member._roles.some(role => rankRoles.includes(role)));
                const everyMembersIds = everyMembers.map(member => member.id);
                for (const userId of everyMembersIds) {
                    const member = everyMembers.get(userId);
                    if (!member) continue;
                    let totalUses = 0;
                    const userInvites = await client.db.invites.find({
                        authorId: userId,
                        guildId: guildId
                    });
                    if (userInvites.length) {
                        totalUses = userInvites.map(i => i.bonus).reduce((acc, cur) => acc + cur);
                        for (const invite of userInvites) {
                            const joinsData = await client.db.joins.find({
                                joinCode: invite.code,
                            });
                            if (!joinsData.length) continue;
                            const totalJoins = joinsData.filter(join => !join.self && !join.fake).length;
                            totalUses += totalJoins;
                        }
                    }
                    const userRoles = member._roles;
                    for (const role of userRoles) {
                        const roleObj = await guild.roles.fetch(role).catch(() => null);
                        if (!roleObj || !roleObj.editable) continue;
                        const rank = guildRoles.find(r => r.roleId === role);
                        if (!rank.uses) continue;
                        if (rank.uses > totalUses) member.roles.remove(roleObj);
                    }
                }
            }

        }
    };
    schedule.scheduleJob('*/10 * * * *', async() => {
        console.log('[DISCORD] Syncing DB against servers... (interval: 10 minutes)');
        const dbServer = await client.db.guilds.find({});
        if (dbServer.length) {
            for (const guildData of dbServer) {
                try {
                    let guild = await client.guilds.fetch(guildData.guildID);
                    try {
                        if (guild instanceof OAuth2Guild) guild = await guild.fetch(); 
                        const invitations = await guild.invites.fetch();
                        await client.db.guilds.findOneAndUpdate({
                            guildID: guildData.guildID
                        }, {
                            lastFetch: Date.now()
                        }, {
                            upsert: true,
                            new: true,
                        });
                        invitations.each(async invite => {
                            const resolvedInvite = await client.db.invites.findOne({
                                code: invite.code
                            });
                            if (!resolvedInvite) {
                                if (!invite.inviterId) return;
                                if (!invite.inviter) return;
                                let fake = false;
                                const { createdTimestamp } = invite.inviter;
                                if ((Date.now() - createdTimestamp) < client.config.fakeTimeoutMs) fake = true;
                                const data = new client.db.invites({
                                    code: invite.code,
                                    authorId: invite.inviterId,
                                    guildId: guild.id,
                                    fake,
                                    rawUses: invite.uses,
                                });
                                await data.save();
                            } else {
                                await client.db.invites.findOneAndUpdate({
                                    code: invite.code
                                }, {
                                    code: invite.code,
                                    rawUses: invite.uses
                                });
                            }
                        })
                    } catch (error) {
                        console.error(`Error while fetching invitation in guild ${guild.name} (id: ${guild.id})`, error);
                    };
                } catch (err) {
                    await purgeDbGuild(client, guildData.guildID);
                    console.error(`Kicked from an undefined server (id: ${guildData.guildID}).`, err);
                };
            };
        };
        console.log('[DISCORD] Fetching leaving members...');
        const allJoinData = await client.db.joins.find({});
        if (allJoinData.length) {
            let unavaliableGuilds = [];
            for (const data of allJoinData) {
                if (unavaliableGuilds.includes(data.guildId)) continue;
                const guild = client.guilds.cache.get(data.guildId);
                if (!guild) {
                    unavaliableGuilds.push(data.guildId);
                    await client.db.joins.deleteMany({
                        guildId: data.guildId
                    });
                    continue;
                };
                const member = await guild.members.fetch(data.userId).catch(() => null);
                if (!member) {
                    await client.db.joins.findOneAndDelete({
                        guildId: data.guildId,
                        userId: data.userId
                    });
                    const inviteData = await client.db.invites.findOne({
                        code: data.joinCode
                    });
                    if (!inviteData) return;
                    inviteData.leaves += 1;
                    await inviteData.save();
                    continue;
                };
            }
        };
        console.log('[DISCORD] Fetching existing invites...');
        const allInvites = await client.db.invites.find({});
        if (allInvites.length) {
            for (const invite of allInvites) {
                try {
                    await client.fetchInvite(invite.code);
                } catch (err) {
                    console.log(`Deleted an invalid invitation (id: ${guild.guildID}).`);
                    await client.db.invites.findOneAndDelete({
                        code: invite.code
                    });
                }
            }
            console.log('[DISCORD] Fetching ranks against roles...');
            const roles = await client.db.roles.find({});
            if (roles.length) {
                const everyGuildIds = allInvites.map(invite => invite.guildId).filter((item, pos, self) => {
                    return self.indexOf(item) == pos;
                });
                for (const guildId of everyGuildIds) {
                    const guildRoles = roles.filter(role => role.guildId === guildId);
                    if (!guildRoles.length) continue;
                    const guildInvites = allInvites.filter(invite => invite.guildId === guildId);
                    const everyUserIds = guildInvites.map(invite => invite.authorId).filter((item, pos, self) => {
                        return self.indexOf(item) == pos;
                    });
                    const guild = client.guilds.cache.get(guildId);
                    for (const userId of everyUserIds) {
                        const userInvites = guildInvites.filter(invite => invite.authorId === userId && invite.guildId === guildId);
                        let totalUses = userInvites.map(i => i.bonus).reduce((acc, cur) => acc + cur);
                        for (const invite of userInvites) {
                            const joinsData = await client.db.joins.find({
                                joinCode: invite.code,
                            });
                            if (!joinsData.length) continue;
                            const totalJoins = joinsData.filter(join => !join.self && !join.fake).length;
                            totalUses += totalJoins;
                        }
                        let avaliableRoles = guildRoles.filter(role => role.uses <= totalUses)
                        if (!avaliableRoles.length) continue;
                        avaliableRoles = avaliableRoles.map(role => role.roleId);
                        const member = await guild.members.fetch(userId).catch(() => null);
                        if (!member) continue;
                        avaliableRoles.forEach(async role => {
                            const roleObj = await guild.roles.fetch(role).catch(() => null);
                            if (!roleObj || !roleObj.editable) return;
                            if (member._roles.includes(role)) return;
                            member.roles.add(roleObj);
                        });
                    }
                    console.log(`[DISCORD] Fetching roles against ranks in guild ${guildId}`);
                    const rankRoles = guildRoles.map(role => role.roleId);
                    let everyMembers = await guild.members.fetch();
                    everyMembers = everyMembers.filter(member => member._roles.some(role => rankRoles.includes(role)));
                    const everyMembersIds = everyMembers.map(member => member.id);
                    for (const userId of everyMembersIds) {
                        const member = everyMembers.get(userId);
                        if (!member) continue;
                        let totalUses = 0;
                        const userInvites = await client.db.invites.find({
                            authorId: userId,
                            guildId: guildId
                        });
                        if (userInvites.length) {
                            totalUses = userInvites.map(i => i.bonus).reduce((acc, cur) => acc + cur);
                            for (const invite of userInvites) {
                                const joinsData = await client.db.joins.find({
                                    joinCode: invite.code,
                                });
                                if (!joinsData.length) continue;
                                const totalJoins = joinsData.filter(join => !join.self && !join.fake).length;
                                totalUses += totalJoins;
                            }
                        }
                        const userRoles = member._roles;
                        for (const role of userRoles) {
                            const roleObj = await guild.roles.fetch(role).catch(() => null);
                            if (!roleObj || !roleObj.editable) continue;
                            const rank = guildRoles.find(r => r.roleId === role);
                            if (!rank.uses) continue;
                            if (rank.uses > totalUses) member.roles.remove(roleObj);
                        }
                    }
                }
    
            }
        };
    });
    client.finished = true;
    console.log('[DISCORD] Ready!');
};