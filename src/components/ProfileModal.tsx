import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  triggerImpact,
  triggerNotificationSuccess,
} from "../services/hapticsService";

interface ProfileModalProps {
  visible: boolean;
  user: { id: string; nickname: string } | null;
  district: string;
  city?: string;
  onClose: () => void;
  onUpdateNickname: (newNickname: string) => Promise<void>;
  onLogout: () => void;
}

export default function ProfileModal({
  visible,
  user,
  district,
  city,
  onClose,
  onUpdateNickname,
  onLogout,
}: ProfileModalProps) {
  const [editingNickname, setEditingNickname] = useState(user?.nickname || "");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const initialLetter = (user.nickname || "A").charAt(0).toUpperCase();

  async function handleSave() {
    if (!editingNickname.trim()) {
      Alert.alert("Atenção", "O apelido não pode ficar vazio.");
      return;
    }

    if (editingNickname.trim() === user?.nickname) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await onUpdateNickname(editingNickname.trim());
      triggerNotificationSuccess();
      Alert.alert("Sucesso", "Apelido atualizado!");
      onClose();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar o novo apelido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>Perfil do Usuário</Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Avatar com Inicial */}
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initialLetter}</Text>
                </View>
                <Text style={styles.userNicknameText}>{user.nickname}</Text>
                <Text style={styles.userIdText}>ID: {user.id.slice(0, 13)}...</Text>
              </View>

              {/* Informações de Localização */}
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>📍</Text>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Localização Atual</Text>
                    <Text style={styles.infoValue}>
                      {district || "Local próximo"} {city ? `· ${city}` : ""}
                    </Text>
                  </View>
                </View>

                <View style={[styles.infoRow, { marginTop: 10 }]}>
                  <Text style={styles.infoIcon}>🛰️</Text>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Modo de Privacidade</Text>
                    <Text style={styles.infoValue}>
                      Anonimato Ativo (Google S2 Geometry)
                    </Text>
                  </View>
                </View>
              </View>

              {/* Editar Apelido */}
              <View style={styles.editSection}>
                <Text style={styles.inputLabel}>Alterar Apelido</Text>
                <TextInput
                  style={styles.input}
                  value={editingNickname}
                  onChangeText={setEditingNickname}
                  placeholder="Novo apelido..."
                  placeholderTextColor="#6b7280"
                  maxLength={25}
                />

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Trocar de Conta / Sair */}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  onClose();
                  onLogout();
                }}
              >
                <Text style={styles.logoutText}>🚪 Sair ou Trocar de Conta</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#161b22",
    borderRadius: 24,
    padding: 22,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "#30363d",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "#f0f6fc",
    fontSize: 18,
    fontWeight: "bold",
  },
  closeIcon: {
    color: "#8b949e",
    fontSize: 16,
    fontWeight: "bold",
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 18,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 8,
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
  },
  userNicknameText: {
    color: "#f0f6fc",
    fontSize: 20,
    fontWeight: "bold",
  },
  userIdText: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: "#0d1117",
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#21262d",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: "#8b949e",
    fontSize: 11,
  },
  infoValue: {
    color: "#e6edf3",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 1,
  },
  editSection: {
    marginBottom: 16,
  },
  inputLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#21262d",
    color: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#30363d",
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  logoutButton: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "600",
  },
});
