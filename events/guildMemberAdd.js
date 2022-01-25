module.exports = async(client, member) => {
    if (member.user.bot) return;
    const invites = await member.guild.invites.fetch();
    const dbInvites = await client.db.invites.find({});
    const targetInvite = invites.find(invite => {
        const targetDbInvite = dbInvites.find(dbInvite => dbInvite.code === invite.code);
        if (!targetDbInvite) return false;
        if (targetDbInvite.rawUses === invite.uses) return false;
        else return true;
    });
    if (!targetInvite) return;
    const dbInvite = dbInvites.find(dbInvite => dbInvite.code === targetInvite.code);
    let self = false;
    let fake = false;
    try {
        if (targetInvite.inviter.id === member.user.id) {
            self = true;
            await client.db.invites.findOneAndUpdate({
                code: targetInvite.code,
            }, {
                $inc: {
                    self: 1,
                    uses: 1
                },
                rawUses: targetInvite.uses,
            }, {
                upsert: true,
                new: true,
            });
        } else if (dbInvite.fake || (Date.now() - member.user.createdTimestamp) < client.config.fakeTimeoutMs) {
            fake = true;
            await client.db.invites.findOneAndUpdate({
                code: targetInvite.code
            }, {
                $inc: {
                    fakeUses: 1,
                    uses: 1
                },
                fake: true,
                rawUses: targetInvite.uses,
            }, {
                upsert: true,
                new: true,
            });
        } else {
            await client.db.invites.findOneAndUpdate({
                code: targetInvite.code
            }, {
                $inc: {
                    uses: 1
                },
                rawUses: targetInvite.uses,
            }, {
                upsert: true,
                new: true,
            });
        }
    } catch (error) {
        console.error(`Error while fetching invitation in guild ${member.guild.name} (id: ${member.guild.id})`, error);
    } finally {
        const joinData = new client.db.joins({
            userId: member.user.id,
            guildId: member.guild.id,
            joinCode: targetInvite.code,
            inviterId: targetInvite.inviter.id,
            fake,
            self
        });
        await joinData.save();
    };
    const roles = await client.db.roles.find({
        guildId: member.guild.id,
    }).sort({
        uses: -1
    });
    if (!roles.length) return;

    const userInvites = dbInvites.filter(invite => invite.authorId === targetInvite.inviter.id && invite.guildId === member.guild.id);
    let totalUses = 0;
    if (userInvites.length) {
        totalUses = userInvites.map(i => i.bonus).reduce((acc, cur) => acc + cur);
        for (const invite of userInvites) {
            const joinsData = await client.db.joins.find({
                joinCode: invite.code,
            });
            if (!joinsData.length) continue;
            const totalJoins = joinsData.filter(join => !join.self && !join.fake).length;
            totalUses += totalJoins;
        };
    }
    let avaliableRoles = roles.filter(role => role.uses <= totalUses)
    if (!avaliableRoles.length) return;
    avaliableRoles = avaliableRoles.map(role => role.roleId);
    const guild = client.guilds.cache.get(member.guild.id);
    const inviterMember = await guild.members.fetch(targetInvite.inviter.id).catch(() => null);
    if (!inviterMember) return;
    avaliableRoles.forEach(async role => {
        const roleObj = await guild.roles.fetch(role).catch(() => null)
        if (!roleObj || !roleObj.editable) return;
        if (inviterMember._roles.includes(role)) return;
        inviterMember.roles.add(role);
    });
    const alreadyHavedRoles = inviterMember._roles.filter(role => avaliableRoles.includes(role));
    if (!alreadyHavedRoles.length) return;
    alreadyHavedRoles.forEach(async role => {
        const roleObj = await guild.roles.fetch(role).catch(() => null)
        if (!roleObj || !roleObj.editable) return;
        if (!inviterMember._roles.includes(role)) return;
        const requiredUses = roles.find(r => r.roleId === role).uses;
        if (requiredUses > totalUses) inviterMember.roles.remove(role);
    })
};