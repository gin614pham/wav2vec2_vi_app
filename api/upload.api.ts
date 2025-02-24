import * as FileSystem from "expo-file-system";
import { FFmpegKit } from "ffmpeg-kit-react-native";

const convertTo16kHzWav = async (inputUri: string): Promise<string> => {
  const outputUri = FileSystem.cacheDirectory + "converted_audio.wav";

  const command = `-i ${inputUri} -ar 16000 -ac 1 -c:a pcm_s16le ${outputUri}`;
  await FFmpegKit.execute(command);

  return outputUri;
};

export default convertTo16kHzWav;
