import { isUserInTheVoiceChannel, isMusicPlaying, isSameVoiceChannel } from "../utils/decorators/MusicHelper";
import { DefineCommand } from "../utils/decorators/DefineCommand";
import { BaseCommand } from "../structures/BaseCommand";
import { createEmbed } from "../utils/createEmbed";
import { IMessage } from "../../typings";

@DefineCommand({
    aliases: ["s"],
    description: "Skip the current music",
    name: "skip",
    usage: "{prefix}skip"
})
export class SkipCommand extends BaseCommand {
    @isUserInTheVoiceChannel()
    @isMusicPlaying()
    @isSameVoiceChannel()
    public execute(message: IMessage): any {
        message.guild!.queue!.playing = true;
        message.guild?.queue?.connection?.dispatcher.once("speaking", () => message.guild?.queue?.connection?.dispatcher.end());
        message.guild!.queue?.connection?.dispatcher.resume();

        const song = message.guild?.queue?.songs.first();

        message.channel.send(
            createEmbed("info", `⏭ **|** Skippato **[${song!.title}](${song!.url}})**`)
                .setThumbnail(song?.thumbnail as string)
        ).catch(e => this.client.logger.error("SKIP_CMD_ERR:", e));
    }
}
