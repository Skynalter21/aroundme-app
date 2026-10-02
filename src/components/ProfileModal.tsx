import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import api from "../services/api";
import { resolveMediaUrl } from "../services/config";
import {
  triggerImpact,
  triggerNotificationSuccess,
} from "../services/hapticsService";

export interface ProfileUser {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
}

interface ProfileModalProps {
  visible: boolean;
  user: ProfileUser | null;
  district: string;
  city?: string;
  onClose: () => void;
  onUpdateUser: (data: { nickname: string; avatarUrl?: string | null }) => Promise<void>;
  onLogout: () => void;
}

export default function ProfileModal({
  visible,
  user,
  district,
  city,
  onClose,
  onUpdateUser,
  onLogout,
}: ProfileModalProps) {
  const [editingNickname, setEditingNickname] = useState(user?.nickname || "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Sincroniza o apelido quando o modal abrir ou o usuário mudar
  React.useEffect(() => {
    if (user?.nickname) {
      setEditingNickname(user.nickname);
    }
  }, [user?.nickname, visible]);

  if (!user) return null;

  const initialLetter = (user.nickname || "A").charAt(0).toUpperCase();
  const currentAvatarUrl = resolveMediaUrl(user.avatarUrl);

  // Ações de Foto de Perfil (Câmera, Galeria ou Remover)
  function handleAvatarPress() {
    triggerImpact("light");

    const options: { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void }[] = [
      {
        text: "📸 Tirar Foto",
        onPress: handleCameraPhoto,
      },
      {
        text: "🖼️ Escolher da Galeria",
        onPress: handleGalleryPhoto,
      },
    ];

    if (user?.avatarUrl) {
      options.push({
        text: "🗑️ Remover Foto",
        style: "destructive",
        onPress: handleRemovePhoto,
      });
    }

    options.push({
      text: "Cancelar",
      style: "cancel",
    });

    Alert.alert("Foto de Perfil", "Escolha como deseja atualizar sua foto:", options);
  }

  // Tirar foto com a câmera
  async function handleCameraPhoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "O AroundMe precisa de permissão da câmera para tirar sua foto de perfil."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (err) {
      console.log("Erro ao abrir câmera:", err);
      Alert.alert("Erro", "Não foi possível abrir a câmera.");
    }
  }

  // Escolher da galeria
  async function handleGalleryPhoto() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "O AroundMe precisa de permissão da galeria para selecionar sua foto de perfil."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (err) {
      console.log("Erro ao abrir galeria:", err);
      Alert.alert("Erro", "Não foi possível abrir a galeria.");
    }
  }

  // Envia a foto para a API
  async function uploadAvatar(uri: string) {
    if (!user) return;
    setUploadingAvatar(true);
    triggerImpact("medium");

    try {
      const formData = new FormData();
      const filename = `avatar_${user.id}_${Date.now()}.jpg`;

      // @ts-ignore
      formData.append("avatar", {
        uri,
        name: filename,
        type: "image/jpeg",
      });

      const response = await api.post(`/users/${user.id}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newAvatarUrl = response.data.avatarUrl;
      await onUpdateUser({
        nickname: editingNickname.trim() || user.nickname,
        avatarUrl: newAvatarUrl,
      });

      triggerNotificationSuccess();
      Alert.alert("Sucesso", "Foto de perfil atualizada!");
    } catch (error: any) {
      console.log("Erro ao atualizar foto de perfil:", error?.response?.data || error?.message || error);
      Alert.alert(
        "Erro ao enviar foto",
        error?.response?.data?.error || "Não foi possível atualizar sua foto de perfil agora."
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Remover foto de perfil
  async function handleRemovePhoto() {
    if (!user) return;
    setUploadingAvatar(true);
    triggerImpact("light");

    try {
      await api.delete(`/users/${user.id}/avatar`);
      await onUpdateUser({
        nickname: editingNickname.trim() || user.nickname,
        avatarUrl: null,
      });
      triggerNotificationSuccess();
      Alert.alert("Sucesso", "Foto de perfil removida.");
    } catch (error: any) {
      console.log("Erro ao remover foto de perfil:", error?.response?.data || error);
      Alert.alert("Erro", "Não foi possível remover a foto de perfil.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Salvar novo apelido
  async function handleSaveNickname() {
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
      await onUpdateUser({
        nickname: editingNickname.trim(),
        avatarUrl: user?.avatarUrl ?? null,
      });
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
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.scrollContent}
                >
                  {/* Avatar com Foto ou Inicial + Botão de Editar */}
                  <View style={styles.avatarContainer}>
                <TouchableOpacity
                  style={styles.avatarWrapper}
                  onPress={handleAvatarPress}
                  activeOpacity={0.8}
                  disabled={uploadingAvatar}
                >
                  {Boolean(currentAvatarUrl) ? (
                    <Image
                      source={{ uri: currentAvatarUrl! }}
                      style={styles.avatarImage}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{initialLetter}</Text>
                    </View>
                  )}

                  {/* Badge de Câmera / Edição */}
                  <View style={styles.cameraBadge}>
                    <Text style={styles.cameraBadgeIcon}>📷</Text>
                  </View>

                  {/* Overlay de Carregamento */}
                  {uploadingAvatar && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color="#00f2fe" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAvatarPress}
                  disabled={uploadingAvatar}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.changePhotoText}>
                    {user?.avatarUrl ? "Editar foto de perfil" : "Adicionar foto de perfil"}
                  </Text>
                </TouchableOpacity>

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
                  onPress={handleSaveNickname}
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
    padding: 22,
    width: "100%",
    maxWidth: 380,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#30363d",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  scrollContent: {
    paddingBottom: 6,
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
    marginBottom: 16,
  },
  avatarWrapper: {
    position: "relative",
    width: 88,
    height: 88,
    marginBottom: 8,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#1e293b",
    borderWidth: 2.5,
    borderColor: "#00f2fe",
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2.5,
    borderColor: "#38bdf8",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "800",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#161b22",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  cameraBadgeIcon: {
    fontSize: 14,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoText: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
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
    marginBottom: 16,
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
