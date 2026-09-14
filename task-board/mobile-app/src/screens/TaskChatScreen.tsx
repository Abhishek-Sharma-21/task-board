import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from '../components/Avatar';
import { Task, TaskChatMessage, User } from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

interface TaskChatScreenProps {
  task: Task | null;
  currentUser: User | null;
  onBack: () => void;
}

export const TaskChatScreen: React.FC<TaskChatScreenProps> = ({
  task,
  currentUser,
  onBack,
}) => {
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState<TaskChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  // Fetch messages from backend when task opens
  useEffect(() => {
    if (!task) return;
    const fetchChatMessages = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/tasks/${task.id}/chat/messages`);
        if (res.data?.data) {
          const msgList = Array.isArray(res.data.data)
            ? res.data.data
            : res.data.data.messages || [];
          setMessages(msgList);
          scrollToBottom();
        }
      } catch (e) {
        console.log('[mobile-app] Error fetching chat messages', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChatMessages();
  }, [task]);

  // Listen for real-time live chat messages
  useEffect(() => {
    const socket = getSocket();
    const handleNewChatMessage = (newMsg: TaskChatMessage) => {
      if (newMsg.taskId === task?.id) {
        setMessages((prev) => {
          const currentList = Array.isArray(prev) ? prev : [];
          if (currentList.some((m) => m.id === newMsg.id)) return currentList;
          return [...currentList, newMsg];
        });
        scrollToBottom();
      }
    };

    socket.on('chat:messageCreated', handleNewChatMessage);
    return () => {
      socket.off('chat:messageCreated', handleNewChatMessage);
    };
  }, [task]);

  const handleSend = async () => {
    if (!inputText.trim() || !task || isSending) return;
    const textToSend = inputText.trim();
    setInputText('');

    try {
      setIsSending(true);
      const res = await api.post(`/tasks/${task.id}/chat/messages`, { body: textToSend });
      if (res.data?.data) {
        const createdMsg = res.data.data;
        setMessages((prev) => {
          const currentList = Array.isArray(prev) ? prev : [];
          if (currentList.some((m) => m.id === createdMsg.id)) return currentList;
          return [...currentList, createdMsg];
        });
      }
    } catch (e) {
      console.log('[mobile-app] Error sending chat message', e);
      const tempMsg: TaskChatMessage = {
        id: `temp-${Date.now()}`,
        taskId: task.id,
        userId: currentUser?.id || 'u1',
        body: textToSend,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: currentUser || undefined,
      };
      setMessages((prev) => {
        const currentList = Array.isArray(prev) ? prev : [];
        return [...currentList, tempMsg];
      });
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.screenBack, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1}>
            {task?.title || 'Task Chat'}
          </Text>
          <Text style={[styles.subText, { color: colors.textMuted }]}>Real-Time Task Chat</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.red} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading chat messages...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatList}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToBottom()}
        >
          {messages.length > 0 ? (
            messages.map((msg) => {
              const isOwn = msg.userId === currentUser?.id;
              const senderName = msg.user?.name || (isOwn ? 'You' : 'Member');
              const msgTime = msg.createdAt
                ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Now';

              return (
                <View key={msg.id} style={[styles.messageRow, isOwn && styles.ownRow]}>
                  <Avatar letter={senderName} size="small" isRed={isOwn} />

                  <View style={styles.msgBody}>
                    <Text style={[styles.metaText, { color: colors.textMuted }, isOwn && styles.rightAlign]}>
                      {isOwn ? 'You' : senderName} · {msgTime}
                    </Text>

                    <View
                      style={[
                        styles.bubble,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        isOwn && { backgroundColor: colors.redDark, borderColor: colors.red },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          { color: colors.text },
                          isOwn && styles.ownBubbleText,
                        ]}
                      >
                        {msg.body}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyChatState}>
              <Text style={[styles.emptyChatTitle, { color: colors.text }]}>No messages yet</Text>
              <Text style={[styles.emptyChatDesc, { color: colors.textMuted }]}>
                Be the first to leave a comment or message on this task!
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Composer docks cleanly at the bottom */}
      <View style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          style={[
            styles.composerInput,
            {
              borderColor: colors.border,
              backgroundColor: colors.inputBg,
              color: colors.text,
            },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onFocus={scrollToBottom}
          onSubmitEditing={handleSend}
          editable={!isSending}
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: colors.red },
            (!inputText.trim() || isSending) && styles.disabledSendBtn,
          ]}
          onPress={handleSend}
          activeOpacity={0.8}
          disabled={!inputText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 9,
  },
  backText: {
    fontSize: 27,
    lineHeight: 27,
  },
  headerTitleBox: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  subText: {
    fontSize: 10,
    marginTop: 2,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 11,
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 16,
    gap: 15,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  ownRow: {
    flexDirection: 'row-reverse',
  },
  msgBody: {
    maxWidth: '78%',
  },
  metaText: {
    fontSize: 9,
    marginBottom: 4,
  },
  rightAlign: {
    textAlign: 'right',
  },
  bubble: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  bubbleText: {
    fontSize: 11,
    lineHeight: 16,
  },
  ownBubbleText: {
    color: '#ffffff',
  },
  emptyChatState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyChatTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyChatDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
    borderTopWidth: 1,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 11,
  },
  sendBtn: {
    width: 38,
    height: 37,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendBtn: {
    opacity: 0.5,
  },
  sendIcon: {
    color: '#ffffff',
    fontSize: 15,
  },
});
