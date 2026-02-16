import { chatService } from '@/core/services/ai';
import { databaseService } from '@/core/services/storage';
import { ChatMessage, JournalEntry } from '@/shared/types';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseEntryChatProps {
  entry: JournalEntry | undefined;
  updateEntry: (entryId: string, updates: Partial<JournalEntry>) => Promise<void>;
}

export function useEntryChat({ entry, updateEntry }: UseEntryChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const loadedEntryId = useRef<string | null>(null);
  const autoTriggered = useRef(false);

  // Load messages from DB on mount / entry change
  useEffect(() => {
    if (!entry?.id || loadedEntryId.current === entry.id) {
      setIsLoadingMessages(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoadingMessages(true);
      try {
        const msgs = await databaseService.getChatMessages(entry.id);
        if (!cancelled) {
          setMessages(msgs);
          loadedEntryId.current = entry.id;
        }
      } catch (error) {
        console.error('[useEntryChat] Failed to load messages:', error);
      } finally {
        if (!cancelled) setIsLoadingMessages(false);
      }
    })();

    return () => { cancelled = true; };
  }, [entry?.id]);

  // Auto-trigger first exchange when no messages exist
  useEffect(() => {
    if (
      !entry?.id ||
      !entry.text ||
      entry.processingStage !== 'completed' ||
      isLoadingMessages ||
      autoTriggered.current ||
      messages.length > 0
    ) {
      return;
    }

    // Already has messages from a previous session — skip
    if (entry.summaryStatus === 'completed' && messages.length > 0) return;

    autoTriggered.current = true;

    (async () => {
      setIsWaitingForResponse(true);
      try {
        // Create the first user message (journal content as prompt)
        const userMsg: ChatMessage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          entryId: entry.id,
          role: 'user',
          content: entry.text,
          createdAt: new Date().toISOString(),
        };

        await databaseService.addChatMessage(userMsg);
        setMessages([userMsg]);

        // Get AI response
        const response = await chatService.getResponse([
          { role: 'user', content: entry.text },
        ]);

        const assistantMsg: ChatMessage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          entryId: entry.id,
          role: 'assistant',
          content: response,
          createdAt: new Date().toISOString(),
        };

        await databaseService.addChatMessage(assistantMsg);
        setMessages(prev => [...prev, assistantMsg]);

        // Mark as completed to prevent re-triggering
        await updateEntry(entry.id, { summaryStatus: 'completed' });
        await databaseService.updateEntry(entry.id, { summaryStatus: 'completed' });
      } catch (error) {
        console.error('[useEntryChat] Auto-trigger first exchange failed:', error);
        await updateEntry(entry.id, { summaryStatus: 'failed' });
        await databaseService.updateEntry(entry.id, { summaryStatus: 'failed' });
      } finally {
        setIsWaitingForResponse(false);
      }
    })();
  }, [entry?.id, entry?.text, entry?.processingStage, isLoadingMessages, messages.length]);

  const sendMessage = useCallback(async (text: string) => {
    if (!entry?.id || !text.trim() || isWaitingForResponse) return;

    setIsWaitingForResponse(true);
    try {
      // Create user message
      const userMsg: ChatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        entryId: entry.id,
        role: 'user',
        content: text.trim(),
        createdAt: new Date().toISOString(),
      };

      await databaseService.addChatMessage(userMsg);
      setMessages(prev => [...prev, userMsg]);

      // Build full history including the new message
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Get AI response
      const response = await chatService.getResponse(history);

      const assistantMsg: ChatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        entryId: entry.id,
        role: 'assistant',
        content: response,
        createdAt: new Date().toISOString(),
      };

      await databaseService.addChatMessage(assistantMsg);
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('[useEntryChat] Failed to send message:', error);
    } finally {
      setIsWaitingForResponse(false);
    }
  }, [entry?.id, messages, isWaitingForResponse]);

  const retryMessage = useCallback(async (assistantMessageId: string) => {
    if (!entry?.id || isWaitingForResponse) return;

    const msgIndex = messages.findIndex(m => m.id === assistantMessageId);
    if (msgIndex < 0) return;

    // Find the preceding user message
    let userMsgIndex = -1;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsgIndex = i;
        break;
      }
    }
    if (userMsgIndex < 0) return;

    // Remove the assistant message and everything after it
    const messagesToRemove = messages.slice(msgIndex);
    const kept = messages.slice(0, msgIndex);
    setMessages(kept);

    for (const msg of messagesToRemove) {
      try {
        await databaseService.deleteChatMessage(msg.id);
      } catch (e) {
        console.error('[useEntryChat] Failed to delete message from DB:', e);
      }
    }

    setIsWaitingForResponse(true);
    try {
      // For the first assistant message, rebuild history using entry.text directly
      // in case messages[0] content was corrupted or stored incorrectly
      const history = kept.map((m, i) => ({
        role: m.role,
        content: (i === 0 && m.role === 'user' && entry.text) ? entry.text : m.content,
      }));

      const response = await chatService.getResponse(history);

      const assistantMsg: ChatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        entryId: entry.id,
        role: 'assistant',
        content: response,
        createdAt: new Date().toISOString(),
      };

      await databaseService.addChatMessage(assistantMsg);
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('[useEntryChat] Failed to retry message:', error);
    } finally {
      setIsWaitingForResponse(false);
    }
  }, [entry?.id, messages, isWaitingForResponse]);

  return {
    messages,
    isLoadingMessages,
    sendMessage,
    retryMessage,
    isWaitingForResponse,
  };
}
