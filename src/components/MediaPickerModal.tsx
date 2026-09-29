import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface MediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCameraPhoto: () => void;
  onSelectCameraVideo: () => void;
  onSelectGallery: () => void;
}

export default function MediaPickerModal({
  visible,
  onClose,
  onSelectCameraPhoto,
  onSelectCameraVideo,
  onSelectGallery,
}: MediaPickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.indicator} />
              <Text style={styles.title}>Compartilhar Mídia no Raio</Text>
              <Text style={styles.subtitle}>
                Fotos e vídeos ficarão visíveis apenas para quem estiver por perto.
              </Text>

              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    onClose();
                    onSelectCameraPhoto();
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: "#1e3a8a" }]}>
                    <Text style={styles.optionIcon}>📷</Text>
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Tirar Foto</Text>
                    <Text style={styles.optionDesc}>Abra a câmera e capture agora</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    onClose();
                    onSelectCameraVideo();
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: "#831843" }]}>
                    <Text style={styles.optionIcon}>🎥</Text>
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Gravar Vídeo</Text>
                    <Text style={styles.optionDesc}>Grave um vídeo curto de até 60s</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    onClose();
                    onSelectGallery();
                  }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: "#14532d" }]}>
                    <Text style={styles.optionIcon}>🖼️</Text>
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Galeria</Text>
                    <Text style={styles.optionDesc}>Escolha fotos ou vídeos salvos</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#161b22",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#30363d",
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: "#484f58",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    color: "#f0f6fc",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#8b949e",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#21262d",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  optionIcon: {
    fontSize: 20,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    color: "#f0f6fc",
    fontSize: 15,
    fontWeight: "600",
  },
  optionDesc: {
    color: "#8b949e",
    fontSize: 12,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#30363d",
    alignItems: "center",
  },
  cancelText: {
    color: "#e6edf3",
    fontSize: 15,
    fontWeight: "600",
  },
});
