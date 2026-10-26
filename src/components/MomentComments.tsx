import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { commentService, COMMENT_MAX_LENGTH, type CommentPage, type MomentComment } from '@/src/features/comments/commentService';
import { relativeTime } from '@/src/state/appStore';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { ActionButton } from './ActionButton';
import { Avatar } from './Avatar';
import { ConfirmationDialog } from './ConfirmationDialog';
import { TextField } from './TextField';
import { AppText } from './primitives/AppText';

export function MomentComments({ updateId, userId, onComposerFocus }: { updateId: string; userId: string; onComposerFocus?: () => void }) {
  const { colors, styles } = useThemeStyles(makeStyles);
  const [page, setPage] = useState<CommentPage>({ items: [], cursor: null, hasMore: false });
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [remove, setRemove] = useState<MomentComment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const active = useRef(false), sequence = useRef(0), mutation = useRef(false);
  const request = useRef<{ body: string; id: string } | null>(null);
  const thread = useRef<ScrollView>(null);
  const scrollToLatest = useRef(true);
  const composerFocused = useRef(false);
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => { if (composerFocused.current) requestAnimationFrame(() => requestAnimationFrame(() => { if (composerFocused.current) onComposerFocus?.(); })); });
    return () => subscription.remove();
  }, [onComposerFocus]);
  const load = useCallback(async (cursor: CommentPage['cursor'] = null) => {
    const own = ++sequence.current;
    scrollToLatest.current = !cursor;
    setLoading(true); setError(null);
    try {
      const next = await commentService.list(updateId, cursor);
      if (active.current && own === sequence.current) setPage(previous => ({ ...next, items: cursor ? [...previous.items, ...next.items.filter(item => !previous.items.some(old => old.id === item.id))] : next.items }));
    } catch (err) { if (active.current && own === sequence.current) setError(err instanceof Error ? err.message : 'Could not load comments. Try again.'); }
    finally { if (active.current && own === sequence.current) setLoading(false); }
  }, [updateId]);
  useFocusEffect(useCallback(() => { active.current = true; if (!mutation.current) { setSending(false); setDeleting(false); } void load(); return () => { active.current = false; sequence.current++; }; }, [load]));
  const count = Array.from(body.trim()).length;
  const post = async () => {
    if (mutation.current || !count || count > COMMENT_MAX_LENGTH) return;
    mutation.current = true; setSending(true); setError(null); setMessage(null);
    try {
      const trimmed = body.trim();
      if (request.current?.body !== trimmed) request.current = { body: trimmed, id: Crypto.randomUUID() };
      await commentService.add(updateId, trimmed, request.current.id);
      if (!active.current) return;
      setBody(''); request.current = null; setMessage('Comment posted.');
      await load();
    } catch (err) { if (active.current) setError(err instanceof Error ? err.message : 'Could not post your comment. Try again.'); }
    finally { mutation.current = false; if (active.current) setSending(false); }
  };
  const deleteComment = async () => {
    if (!remove || mutation.current) return;
    mutation.current = true; setDeleting(true); setError(null);
    try {
      await commentService.remove(updateId, remove.id);
      if (!active.current) return;
      setRemove(null); setMessage('Comment deleted.'); await load();
    } catch (err) { if (active.current) setError(err instanceof Error ? err.message : 'Could not delete your comment. Try again.'); }
    finally { mutation.current = false; if (active.current) setDeleting(false); }
  };
  return <View style={styles.section}>
    <View style={styles.heading}><AppText style={styles.title}>Comments</AppText><Pressable accessibilityRole="button" accessibilityLabel="Refresh comments" disabled={loading || sending || deleting} onPress={() => void load()} style={styles.refreshButton}><Feather name="refresh-cw" size={17} color={colors.background.accent} /><AppText style={styles.refreshText}>{loading ? 'Loading…' : 'Refresh'}</AppText></Pressable></View>
    <ScrollView ref={thread} nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.thread} contentContainerStyle={styles.messages} onContentSizeChange={() => { if (scrollToLatest.current) thread.current?.scrollToEnd({ animated: false }); }}>
      {page.hasMore ? <ActionButton label="Load older comments" variant="secondary" loading={loading} disabled={sending || deleting} onPress={() => void load(page.cursor)} /> : null}
      {!page.items.length && !loading && !error ? <AppText tone="secondary" variant="body14" style={{ textAlign: 'center', paddingVertical: 20 }}>No comments yet. Start the conversation.</AppText> : null}
      {[...page.items].reverse().map(item => {
        const mine = item.userId === userId;
        return <View key={item.id} style={[styles.comment, mine && styles.ownComment]}><View style={styles.avatar}><Avatar name={item.displayName} uri={item.avatarUrl ?? undefined} size={30} />{mine ? <View accessible={false} style={styles.avatarDot} /> : null}</View><View style={styles.commentBody}>
          <AppText style={[styles.author, mine && { textAlign: 'right' }]}>{mine ? 'You' : item.displayName}</AppText>
          <View style={[styles.bubble, mine ? styles.ownBubble : styles.otherBubble]}><AppText style={styles.bubbleText} selectable>{item.body}</AppText></View>
          <View style={[styles.messageMeta, mine && { justifyContent: 'flex-end' }]}><AppText style={styles.time}>{relativeTime(item.createdAt)} ago</AppText>{mine ? <Pressable accessibilityRole="button" accessibilityLabel={`Delete your comment: ${item.body}`} hitSlop={8} disabled={sending || deleting} onPress={() => { setError(null); setRemove(item); }} style={styles.deleteButton}><Feather name="more-horizontal" color={styles.time.color} size={16} /></Pressable> : null}</View>
        </View></View>;
      })}
    </ScrollView>
    <View style={styles.composer}><TextField onFocus={() => { composerFocused.current = true; onComposerFocus?.(); }} onBlur={() => { composerFocused.current = false; }} accessibilityLabel="Write a comment" placeholder="Write a comment…" value={body} onChangeText={value => { setBody(value); setMessage(null); }} multiline maxLength={COMMENT_MAX_LENGTH * 2} editable={!sending && !deleting} style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Send comment" accessibilityState={{ disabled: !count || count > COMMENT_MAX_LENGTH || deleting || sending, busy: sending }} disabled={!count || count > COMMENT_MAX_LENGTH || deleting || sending} onPress={() => void post()} style={[styles.sendButton, (!count || count > COMMENT_MAX_LENGTH || deleting) && { opacity: 0.4 }]}><LinearGradient colors={['#B16AFF', '#7832FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendFill}>{sending ? <ActivityIndicator color="white" size="small" /> : <Feather name="send" color="white" size={20} />}</LinearGradient></Pressable></View>
    {count > 400 ? <AppText variant="caption11" tone="secondary" style={{ textAlign: 'right' }}>{count}/{COMMENT_MAX_LENGTH}</AppText> : null}
    {error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
    {message ? <AppText accessibilityLiveRegion="polite" variant="caption11" style={{ color: colors.background.accent }}>{message}</AppText> : null}
    <ConfirmationDialog visible={!!remove} title="Delete your comment?" message="This will permanently remove this comment." confirmLabel="Delete" busy={deleting} error={error} onConfirm={() => void deleteComment()} onCancel={() => { if (!deleting) setRemove(null); }} />
  </View>;
}
const makeStyles = ({ colors, isDark }: Theme) => StyleSheet.create({
  section: { gap: 14, padding: 16, borderRadius: 20, backgroundColor: colors.background.card, boxShadow: '0px 5px 20px rgba(116, 66, 192, 0.04)' },
  title: { fontSize: 20, lineHeight: 28, fontFamily: 'PlusJakartaSans_800ExtraBold', color: isDark ? colors.text.primary : '#150B32' },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  thread: { maxHeight: 360 }, messages: { gap: 14, paddingVertical: 4 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 }, ownComment: { flexDirection: 'row-reverse' },
  avatar: { marginTop: 1 }, avatarDot: { position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#BD96FF', borderWidth: 1, borderColor: colors.background.card },
  commentBody: { maxWidth: '78%', flexShrink: 1, gap: 3 }, author: { fontSize: 11, lineHeight: 16, color: isDark ? colors.text.secondary : '#948AA8', paddingHorizontal: 7 },
  bubble: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 }, bubbleText: { fontSize: 14, lineHeight: 21, color: isDark ? colors.text.primary : '#150B32' },
  ownBubble: { backgroundColor: isDark ? colors.background.accentSoft : '#EEE5FF' }, otherBubble: { backgroundColor: isDark ? colors.background.subtle : '#F5F1FB' },
  messageMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 6, minHeight: 26 }, time: { fontSize: 10, lineHeight: 15, color: isDark ? colors.text.secondary : '#948AA8' }, deleteButton: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? colors.border.default : '#EAE4F6' },
  input: { flex: 1, height: 46, maxHeight: 120, fontSize: 12, borderRadius: 24, paddingTop: 12, paddingBottom: 10, backgroundColor: isDark ? colors.background.subtle : '#FDFCFF', borderColor: isDark ? colors.border.default : '#E6E0F2' },
  sendButton: { width: 44, height: 44, borderRadius: 22, marginBottom: 1, overflow: 'hidden' }, sendFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }, refreshText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: colors.background.accent },
  error: { color: '#DA645B' },
});
