import axios from "axios";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Recording } from "expo-av/build/Audio";
import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";

export default function Index() {
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingInterval, setRecordingInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);

  useEffect(() => {
    setTranscribedText("");
  }, [selectedFile]);

  useEffect(() => {
    if (sound) {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        setPosition(status.positionMillis);
        setDuration(status.durationMillis || 1);
        if (status.didJustFinish) {
          setIsAudioPlaying(false);
          sound.unloadAsync();
          setSound(null);
          setPosition(0);
          setDuration(1);
        }
      });
    }
  }, [sound]);

  const pickAudioFile = async () => {
    try {
      const results = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        multiple: false,
      });

      if (!results.canceled) {
        const file = results.assets[0];
        setSelectedFile({
          uri: file.uri,
          type: file.mimeType || "audio/*",
          name: file.name || "",
        });
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message !== "User canceled document picker"
      ) {
        console.error("Error picking document:", err);
      }
    }
  };

  const transcribeAudio = async () => {
    if (!selectedFile) {
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("audio", {
      uri: selectedFile.uri,
      type: selectedFile.type,
      name: selectedFile.name,
    } as any);

    try {
      const response = await axios.post(
        "http://192.168.50.96:5000/transcribe",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000,
        }
      );
      setTranscribedText(response.data.transcription);
    } catch (error) {
      console.error("Error transcribing audio:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const prepare = await Audio.requestPermissionsAsync();

      if (!prepare.granted) {
        alert("Permission to record audio denied");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingOptions = {
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          extension: ".wav",
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          extension: ".wav",
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: "audio/wav",
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);

      setRecordingDuration(0);
      const interval = setInterval(() => {
        setRecordingDuration((prevDuration) => prevDuration + 1);
      }, 1000);
      setRecordingInterval(interval);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI() || "";

      setSelectedFile({ uri, type: "audio/wav", name: "recording.wav" });
      setRecording(null);

      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
    }
  };

  const playRecording = async () => {
    if (!selectedFile) {
      return;
    }

    if (sound) {
      await sound.unloadAsync();
    }
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: selectedFile?.uri as string },
      { shouldPlay: true }
    );
    setSound(newSound);

    setIsAudioPlaying(true);

    newSound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;

      if (status.didJustFinish) {
        setIsAudioPlaying(false);
        setSound(null);
      }
    });
  };

  const touchPlayPause = async () => {
    if (!sound) {
      await playRecording();
    } else {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await sound.pauseAsync();
        setIsAudioPlaying(false);
      } else {
        await sound.playAsync();
        setIsAudioPlaying(true);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Audio File</Text>
            <TouchableOpacity
              style={[styles.button, !!recording && styles.disabledButton]}
              onPress={pickAudioFile}
              disabled={!!recording}
            >
              <Text style={styles.buttonText}>Choose File</Text>
            </TouchableOpacity>
            {selectedFile && (
              <Text style={styles.selectedFile}>
                Selected File: {selectedFile.name}
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Record Audio</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={recording ? stopRecording : startRecording}
            >
              <Text style={styles.buttonText}>
                {recording ? "Stop Recording" : "Start Recording"}
              </Text>
            </TouchableOpacity>

            {recording && (
              <Text style={styles.recordingDuration}>
                Recording Duration: {recordingDuration} seconds
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Play Recording</Text>
            <TouchableOpacity
              style={[
                styles.button,
                (!selectedFile || !!recording) && styles.disabledButton,
                { backgroundColor: "#FF9500" },
              ]}
              onPress={touchPlayPause}
              disabled={!selectedFile || !!recording}
            >
              <Text style={styles.buttonText}>
                {isAudioPlaying ? "Stop" : "Play Recording"}
              </Text>
            </TouchableOpacity>

            {selectedFile && (
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration}
                value={position}
                onSlidingComplete={async (value) => {
                  if (sound) {
                    await sound.setPositionAsync(value);
                  }
                }}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transcribe Audio</Text>
            <TouchableOpacity
              style={[
                styles.button,
                styles.transcribeButton,
                (!selectedFile || isLoading || !!recording) &&
                  styles.disabledButton,
              ]}
              onPress={transcribeAudio}
              disabled={isLoading || !selectedFile || !!recording}
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Transcribing..." : "Transcribe Audio"}
              </Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <ActivityIndicator
              size="large"
              color={"#0000ff"}
              style={styles.loader}
            />
          )}

          {transcribedText && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transcribed Text</Text>
              <View style={styles.transcribedTextContainer}>
                <Text style={styles.transcribedText}>{transcribedText}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 5,
  },
  transcribeButton: {
    backgroundColor: "#34C759",
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  selectedFile: {
    marginTop: 10,
    color: "#666",
  },
  loader: {
    marginVertical: 20,
  },
  transcribedTextContainer: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  transcribedText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  recordingDuration: {
    marginTop: 10,
    color: "#666",
  },
  slider: {
    width: "100%",
    height: 40,
    marginTop: 10,
  },
});
