import { Image } from "expo-image";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface SelectedMedia {
  uri: string;
  type: "image" | "video";
  fileName?: string;
  mimeType?: string;
}

interface SendMessageBoxProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onOpenMediaPicker: () => void;
  selectedMedia: SelectedMedia | null;
  onRemoveMedia: () => void;
  loading?: boolean;
}

export default function SendMessageBox({
  value,
  onChangeText,
  onSend,
  onOpenMediaPicker,
  selectedMedia,
  onRemoveMedia,
  loading = false,
}: SendMessageBoxProps) {
  const canSend = Boolean(value.trim() || selectedMedia) && !loading;

  return (
    <View style={styles.container}>
      {/* Banner de pré-visualização da mídia selecionada */}
      {selectedMedia && (
        <View style={styles.previewContainer}>
          <View style={styles.previewContent}>
            {selectedMedia.type === "image" ? (
              <Image
                source={{ uri: selectedMedia.uri }}
                style={styles.previewThumbnail}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.previewThumbnail, styles.videoPlaceholder]}>
                <Text style={styles.videoIcon}>🎥</Text>
              </View>
            )}

            <View style={styles.previewInfo}>
              <Text style={styles.previewType}>
                {selectedMedia.type === "image" ? "📷 Foto Pronta" : "🎥 Vídeo Pronto"}
              </Text>
              <Text style={styles.previewHint}>
                Digite uma legenda opcional abaixo e envie.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.removeMediaButton}
            onPress={onRemoveMedia}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.removeMediaText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Barra de input principal */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.mediaButton}
          onPress={onOpenMediaPicker}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.mediaButtonIcon}>📎</Text>
        </TouchableOpacity>

        <TextInput
          placeholder={
            selectedMedia ? "Adicionar uma legenda..." : "Digite uma mensagem..."
          }
          placeholderTextColor="#6b7280"
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          multiline
          maxLength={1000}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={onSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#161b22",
    borderRadius: 24,
    padding: 6,
    borderWidth: 1,
    borderColor: "#30363d",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0d1117",
    borderRadius: 16,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#21262d",
  },
  previewContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  previewThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#21262d",
  },
  videoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#831843",
  },
  videoIcon: {
    fontSize: 22,
  },
  previewInfo: {
    marginLeft: 12,
    flex: 1,
  },
  previewType: {
    color: "#60a5fa",
    fontSize: 13,
    fontWeight: "700",
  },
  previewHint: {
    color: "#8b949e",
    fontSize: 11,
    marginTop: 2,
  },
  removeMediaButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  removeMediaText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "bold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  mediaButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#21262d",
  },
  mediaButtonIcon: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    color: "#f0f6fc",
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 6,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: "#2563eb",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#21262d",
    opacity: 0.6,
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 18,
    marginLeft: 2,
  },
});
