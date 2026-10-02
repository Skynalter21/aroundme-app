import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { triggerImpact } from "../services/hapticsService";
import { RoomData } from "../types/room";

interface RoomPasswordModalProps {
  visible: boolean;
  room: RoomData | null;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}

export default function RoomPasswordModal({
  visible,
  room,
  onClose,
  onSubmit,
}: RoomPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!room) return null;

  async function handleConfirm() {
    if (!password.trim()) {
      setErrorMessage("Digite a senha para entrar.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await onSubmit(password.trim());
      triggerImpact("medium");
      setPassword("");
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || "Senha incorreta ou acesso negado."
      );
      triggerImpact("heavy");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modal}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.scrollContent}
                >
                  <View style={styles.iconCircle}>
                    <Text style={styles.lockIcon}>🔒</Text>
                  </View>

                  <Text style={styles.title}>Sala Protegida</Text>
                  <Text style={styles.roomName}>{room.name}</Text>
                  <Text style={styles.subtitle}>
                    Esta sala requer uma senha definida pelo criador para liberar seu
                    acesso.
                  </Text>

                  <TextInput
                    style={[styles.input, Boolean(errorMessage) && styles.inputError]}
                    placeholder="Digite a senha da sala"
                    placeholderTextColor="#6b7280"
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    secureTextEntry
                    autoFocus
                  />

                  {Boolean(errorMessage) && (
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  )}

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setPassword("");
                        setErrorMessage(null);
                        onClose();
                      }}
                      disabled={loading}
                    >
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.confirmButton, loading && styles.disabledButton]}
                      onPress={handleConfirm}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.confirmText}>Entrar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#161b22",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#30363d",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  scrollContent: {
    alignItems: "center",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#3b82f644",
  },
  lockIcon: {
    fontSize: 26,
  },
  title: {
    color: "#f0f6fc",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  roomName: {
    color: "#38bdf8",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#8b949e",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#0d1117",
    color: "#f0f6fc",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#30363d",
    fontSize: 15,
    width: "100%",
    textAlign: "center",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#21262d",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  cancelText: {
    color: "#c9d1d9",
    fontWeight: "600",
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  confirmText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
});
