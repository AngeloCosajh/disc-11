import { DefineListener } from "../utils/decorators/DefineListener";
import { BaseListener } from "../structures/BaseListener";
import { ServerQueue } from "../structures/ServerQueue";
import { createEmbed } from "../utils/createEmbed";
import { formatMS } from "../utils/formatMS";
import { IVoiceState } from "../../typings";
import { Collection, GuildMember, Snowflake } from "discord.js";
import { satisfies } from "semver";

@DefineListener("voiceStateUpdate")
export class VoiceStateUpdateEvent extends BaseListener {
    public execute(oldState: IVoiceState, newState: IVoiceState): any {
        const queue = newState.guild.queue;

        if (!queue) return undefined;

        const newVC = newState.channel;
        const oldVC = oldState.channel;
        const oldID = oldVC?.id;
        const newID = newVC?.id;
        const queueVC = queue.voiceChannel!;
        const oldMember = oldState.member;
        const member = newState.member;
        const queueVCMembers = queueVC.members.filter(m => !m.user.bot);
        const newVCMembers = newVC?.members.filter(m => !m.user.bot);
        const botID = this.client.user?.id;

        // Handle when bot gets kicked from the voice channel
        if (oldMember?.id === botID && oldID === queueVC.id && newID === undefined) {
            try {
                if (queue.lastMusicMessageID !== null) queue.textChannel?.messages.fetch(queue.lastMusicMessageID, false).then(m => m.delete()).catch(e => this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e));
                if (queue.lastVoiceStateUpdateMessageID !== null) queue.textChannel?.messages.fetch(queue.lastVoiceStateUpdateMessageID, false).then(m => m.delete()).catch(e => this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e));
                this.client.logger.info(`${this.client.shard ? `[Shard #${this.client.shard.ids[0]}]` : ""} Scollegato dal canale vocale a ${newState.guild.name}, la coda è stata eliminata.`);
                queue.textChannel?.send(createEmbed("error", "Sono stato disconnesso dal canale vocale, la coda è stata cancellata."))
                    .catch(e => this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e));
                return newState.guild.queue = null;
            } catch (e) {
                this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e);
            }
        }

        if (newState.mute !== oldState.mute || newState.deaf !== oldState.deaf) return undefined;

        // Handle when the bot is moved to another voice channel
        if (member?.id === botID && oldID === queueVC.id && newID !== queueVC.id && newID !== undefined) {
            if (!newVCMembers) return undefined;
            if (newVCMembers.size === 0 && queue.timeout === null) this.doTimeout(newVCMembers, queue, newState);
            else if (newVCMembers.size !== 0 && queue.timeout !== null) this.resumeTimeout(newVCMembers, queue, newState);
            newState.guild.queue!.voiceChannel = newVC;
        }

        // Handle when user leaves voice channel
        if (oldID === queueVC.id && newID !== queueVC.id && !member?.user.bot && queue.timeout === null) this.doTimeout(queueVCMembers, queue, newState);

        // Handle when user joins voice channel or bot gets moved
        if (newID === queueVC.id && !member?.user.bot) this.resumeTimeout(queueVCMembers, queue, newState);
    }

    private doTimeout(vcMembers: Collection<Snowflake, GuildMember>, queue: ServerQueue, newState: IVoiceState): any {
        try {
            if (vcMembers.size !== 0) return undefined;
            clearTimeout(queue.timeout!);
            newState.guild.queue!.timeout = null;
            newState.guild.queue!.playing = false;
            queue.connection?.dispatcher.pause();
            const timeout = this.client.config.deleteQueueTimeout;
            const duration = formatMS(timeout);
            if (queue.lastVoiceStateUpdateMessageID !== null) queue.textChannel?.messages.fetch(queue.lastVoiceStateUpdateMessageID, false).then(m => m.delete()).catch(e => this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e));
            newState.guild.queue!.timeout = setTimeout(() => {
                queue.voiceChannel?.leave();
                newState.guild.queue = null;
                if (queue.lastMusicMessageID !== null) queue.textChannel?.messages.fetch(queue.lastMusicMessageID, false).then(m => m.delete()).catch(e => this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e));
                if (queue.lastVoiceStateUpdateMessageID !== null) queue.textChannel?.messages.fetch(queue.lastVoiceStateUpdateMessageID, false).then(m => m.delete()).catch(e => this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e));
                queue.textChannel?.send(
                    createEmbed("error", `⏹ **|** **\`${duration}\`** sono passati e non c'è nessuno che si è unito al canale vocale, la coda si è cancellata.`)
                        .setTitle("Coda eliminata")
                ).catch(e => this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e));
            }, timeout);
            queue.textChannel?.send(
                createEmbed("warn", "⏸ **|**Tutti sono usciti dal canale vocale. Per risparmiare risorse, la coda è stata messa in pausa. " +
                    `Se non c'è nessuno che si unisce al canale vocale nel prossimo **\`${duration}\`**, la coda verrà eliminata.`)
                    .setTitle("Music Player in pausa")
            ).then(m => queue.lastVoiceStateUpdateMessageID = m.id).catch(e => this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e));
        } catch (e) { this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e); }
    }

    private resumeTimeout(vcMembers: Collection<Snowflake, GuildMember>, queue: ServerQueue, newState: IVoiceState): any {
        if (vcMembers.size > 0) {
            if (queue.playing) return undefined;
            try {
                clearTimeout(queue.timeout!);
                newState.guild.queue!.timeout = null;
                const song = queue.songs.first();
                if (queue.lastVoiceStateUpdateMessageID !== null) queue.textChannel?.messages.fetch(queue.lastVoiceStateUpdateMessageID, false).then(m => m.delete()).catch(e => this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e));
                queue.textChannel?.send(
                    createEmbed("info", `▶ **|** Qualcuno si è unito al canale vocale.\nNow riproducendo: **[${song!.title}](${song!.url})**`)
                        .setThumbnail(song!.thumbnail)
                        .setTitle("Music Player Ripresa")
                ).then(m => queue.lastVoiceStateUpdateMessageID = m.id).catch(e => this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e));
                newState.guild.queue!.playing = true;
                newState.guild.queue?.connection?.dispatcher.resume();
                // This will be reverted
                if (satisfies(process.version, ">=14.17.0")) {
                    newState.guild.queue?.connection?.dispatcher.pause();
                    newState.guild.queue?.connection?.dispatcher.resume();
                }
            } catch (e) { this.client.logger.error("VOICE_STATE_UPDATE_EVENT_ERR:", e); }
        }
    }
}
