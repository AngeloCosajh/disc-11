import { ICommandComponent, IMessage } from "../../typings";
import { createEmbed } from "./createEmbed";
import { Disc } from "../structures/Disc";
import { Snowflake, Collection } from "discord.js";
import { parse, resolve } from "path";
import { promises as fs } from "fs";

export class CommandManager extends Collection<string, ICommandComponent> {
    public readonly aliases: Collection<string, string> = new Collection();
    public readonly cooldowns: Collection<string, Collection<Snowflake, number>> = new Collection();
    public constructor(public client: Disc, public readonly path: string) { super(); }
    public load(): void {
        fs.readdir(resolve(this.path))
            .then(async files => {
                let disabledCount = 0;
                for (const file of files) {
                    const path = resolve(this.path, file);
                    const command = await this.import(path, this.client, { path });
                    if (command === undefined) throw new Error(`File ${file} is not a valid command file`);
                    command.meta = Object.assign(command.meta, { path });
                    if (Number(command.meta.aliases?.length) > 0) {
                        command.meta.aliases?.forEach(alias => {
                            this.aliases.set(alias, command.meta.name);
                        });
                    }
                    this.set(command.meta.name, command);
                    if (command.meta.disable === true) disabledCount++;
                }
                this.client.logger.info(`${this.client.shard ? `[Shard #${this.client.shard.ids[0]}]` : ""} Un totale di ${files.length} i comandi sono stati caricati`);
                if (disabledCount !== 0) this.client.logger.info(`${this.client.shard ? `[Shard #${this.client.shard.ids[0]}]` : ""} ${disabledCount} out of ${files.length} commands is disabled`);
            })
            .catch(err => this.client.logger.error("CMD_LOADER_ERR:", err));
        return undefined;
    }

    public handle(message: IMessage): any {
        const args = message.content.substring(this.client.config.prefix.length).trim().split(/ +/);
        const cmd = args.shift()?.toLowerCase();
        const command = this.get(cmd!) ?? this.get(this.aliases.get(cmd!)!);
        if (!command || command.meta.disable) return undefined;
        if (!this.cooldowns.has(command.meta.name)) this.cooldowns.set(command.meta.name, new Collection());
        const now = Date.now();
        const timestamps = this.cooldowns.get(command.meta.name);
        const cooldownAmount = (command.meta.cooldown ?? 3) * 1000;
        if (timestamps?.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id)! + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                message.channel.send(createEmbed("warn", `<@${message.author.id}>, attendere prego **\`${timeLeft.toFixed(1)}\`** del tempo di raffreddamento`)).then(msg => {
                    msg.delete({ timeout: 3500 }).catch(e => this.client.logger.error("CMD_HANDLER_ERR:", e));
                }).catch(e => this.client.logger.error("CMD_HANDLER_ERR:", e));
                return undefined;
            }

            timestamps.set(message.author.id, now);
            setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        } else {
            timestamps?.set(message.author.id, now);
            if (this.client.config.owners.includes(message.author.id)) timestamps?.delete(message.author.id);
        }
        try {
            return command.execute(message, args);
        } catch (e) {
            this.client.logger.error("CMD_HANDLER_ERR:", e);
        } finally {
            this.client.logger.info(`${this.client.shard ? `[Shard #${this.client.shard.ids[0]}]` : ""} ${message.author.tag} sta usando ${command.meta.name} comando su ${message.guild ? message.guild.name : "DM Channel"}`);
        }
    }

    private async import(path: string, ...args: any[]): Promise<ICommandComponent | undefined> {
        const file = (await import(resolve(path)).then(m => m[parse(path).name]));
        return file ? new file(...args) : undefined;
    }
}
