import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { triggerImpact, triggerSelection } from "../services/hapticsService";

interface CreateRoomModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateRoom: (roomData: {
    name: string;
    description?: string;
    category: string;
    password?: string;
    maxMembers: number;
  }) => Promise<void>;
}

const CATEGORIES = ["Geral", "Resenha", "Esportes", "Eventos", "Ajuda", "Games"];
const MEMBER_LIMITS = [10, 25, 50, 100];

export default function CreateRoomModal({
  visible,
  onClose,
  onCreateRoom,
}: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Geral");
  const [maxMembers, setMaxMembers] = useState(50);
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setName("");
    setDescription("");
    setCategory("Geral");
    setMaxMembers(50);
    setIsProtected(false);
    setPassword("");
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert("Atenção", "Por favor, digite o nome da sala.");
      return;
    }

    if (isProtected && (!password || password.trim().length < 3)) {
      Alert.alert("Atenção", "A senha da sala deve ter pelo menos 3 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await onCreateRoom({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        password: isProtected ? password.trim() : undefined,
        maxMembers,
      });

      triggerImpact("medium");
      resetForm();
      onClose();
    } catch (err: any) {
      console.log("Erro ao criar sala:", err);
      Alert.alert("Erro", "Não foi possível criar a sala. Tente novamente.");
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
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.keyboardContainer}
            >
              <View style={styles.modal}>
                <View style={styles.headerRow}>
                  <Text style={styles.title}>Criar Sala de Bate-Papo</Text>
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.closeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  {/* Nome da Sala */}
                  <Text style={styles.label}>Nome da Sala *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Galera da Praça, Torcida, etc."
                    placeholderTextColor="#6b7280"
                    value={name}
                    onChangeText={setName}
                    maxLength={50}
                  />

                  {/* Descrição */}
                  <Text style={styles.label}>Descrição (opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Explique sobre o que é esta sala..."
                    placeholderTextColor="#6b7280"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    maxLength={160}
                  />

                  {/* Categorias */}
                  <Text style={styles.label}>Categoria</Text>
                  <View style={styles.chipsRow}>
                    {CATEGORIES.map((cat) => {
                      const active = category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => {
                            triggerSelection();
                            setCategory(cat);
                          }}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              active && styles.chipTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Limite de Membros */}
                  <Text style={styles.label}>Capacidade de Membros</Text>
                  <View style={styles.chipsRow}>
                    {MEMBER_LIMITS.map((limit) => {
                      const active = maxMembers === limit;
                      return (
                        <TouchableOpacity
                          key={limit}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => {
                            triggerSelection();
                            setMaxMembers(limit);
                          }}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              active && styles.chipTextActive,
                            ]}
                          >
                            {limit} pessoas
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Proteção com Senha */}
                  <View style={styles.switchRow}>
                    <View style={styles.switchLabelBlock}>
                      <Text style={styles.switchTitle}>🔒 Sala com Senha</Text>
                      <Text style={styles.switchSubtitle}>
                        Apenas pessoas com a senha poderão entrar
                      </Text>
                    </View>
                    <Switch
                      value={isProtected}
                      onValueChange={(val) => {
                        triggerSelection();
                        setIsProtected(val);
                      }}
                      trackColor={{ false: "#30363d", true: "#2563eb" }}
                      thumbColor={isProtected ? "#38bdf8" : "#9ca3af"}
                    />
                  </View>

                  {isProtected && (
                    <View style={styles.passwordContainer}>
                      <Text style={styles.label}>Definir Senha de Acesso *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Digite uma senha para a sala"
                        placeholderTextColor="#6b7280"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        maxLength={30}
                      />
                    </View>
                  )}

                  {/* Botão de Criação */}
                  <TouchableOpacity
                    style={[styles.createButton, loading && styles.disabledButton]}
                    onPress={handleCreate}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.createButtonText}>Criar Sala</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
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
    padding: 16,
  },
  keyboardContainer: {
    width: "100%",
    maxWidth: 420,
  },
  modal: {
    backgroundColor: "#161b22",
    borderRadius: 24,
    padding: 20,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "#30363d",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#21262d",
    paddingBottom: 12,
  },
  title: {
    color: "#f0f6fc",
    fontSize: 18,
    fontWeight: "800",
  },
  closeIcon: {
    color: "#8b949e",
    fontSize: 20,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 10,
  },
  label: {
    color: "#c9d1d9",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#0d1117",
    color: "#f0f6fc",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#30363d",
    fontSize: 14,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    backgroundColor: "#21262d",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  chipActive: {
    backgroundColor: "#1e3a8a",
    borderColor: "#3b82f6",
  },
  chipText: {
    color: "#8b949e",
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#60a5fa",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0d1117",
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  switchLabelBlock: {
    flex: 1,
    marginRight: 10,
  },
  switchTitle: {
    color: "#f0f6fc",
    fontSize: 14,
    fontWeight: "600",
  },
  switchSubtitle: {
    color: "#8b949e",
    fontSize: 11,
    marginTop: 2,
  },
  passwordContainer: {
    marginTop: 6,
  },
  createButton: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
