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

export default function Index() {
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [recording, setRecording] = useState<Recording | null>(null);

  useEffect(() => {
    setTranscribedText("");
  }, [selectedFile]);

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
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI() || "";
      console.log("Recording stopped:", uri);
      setSelectedFile({ uri, type: "audio/wav", name: "recording.wav" });
      setRecording(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Audio File</Text>
            <TouchableOpacity style={styles.button} onPress={pickAudioFile}>
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
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              styles.transcribeButton,
              (!selectedFile || isLoading) && styles.disabledButton,
            ]}
            onPress={transcribeAudio}
            disabled={isLoading || !selectedFile}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Transcribing..." : "Transcribe Audio"}
            </Text>
          </TouchableOpacity>

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
});
