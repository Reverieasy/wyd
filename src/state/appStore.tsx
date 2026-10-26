import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { AppState as NativeAppState } from 'react-native';

import { authService, type SignUpInput } from '@/src/features/auth/authService';
import { accountService } from '@/src/features/account/accountService';
import { authLinkService } from '@/src/features/auth/authLinkService';
import { activityService, type ActivityCursor } from '@/src/features/activity/activityService';
import { nudgeService } from '@/src/features/activity/nudgeService';
import { reactionService } from '@/src/features/activity/reactionService';
import { connectionService } from '@/src/features/connections/connectionService';
import { inviteService } from '@/src/features/connections/inviteService';
import { profileService } from '@/src/features/profiles/profileService';
import { widgetService } from '@/src/features/widgets/widgetService';
import { avatarService } from '@/src/features/profiles/avatarService';
import { legalService } from '@/src/features/legal/legalService';
import { safetyService } from '@/src/features/safety/safetyService';
import { notificationService, type NotificationPermissionState, type NotificationPreferences } from '@/src/features/notifications/notificationService';
import { pushTokenService } from '@/src/features/notifications/pushTokenService';
import type { AppNotificationData } from '@/src/features/notifications/notificationTypes';
import { realtimeService } from '@/src/features/realtime/realtimeService';
import type { AppRealtimeEvent } from '@/src/features/realtime/realtimeEvents';
import { updateQueries } from '@/src/features/updates/updateQueries';
import type { UpdateCursor } from '@/src/features/updates/updateQueries';
import { updateService } from '@/src/features/updates/updateService';
import { readableServiceError, ServiceError } from '@/src/lib/serviceError';
import { isSupabaseConfigured } from '@/src/lib/supabase';
import type { ActivityItem, ConnectionInvite, ConnectionWithPerson, DraftPhoto, MomentUpdate, Nudge, Reaction, ReactionType, RelationshipType, TermsStatus, UpdateDraft, UpdateStatus, User, UserId } from '@/src/models';

export type Preferences = {
  nudgesEnabled: boolean;
  recentMomentsDays: number;
  privacy: 'selected-people';
};

type ServerState = {
  configured: boolean;
  initializing: boolean;
  authLinkProcessing: boolean;
  recoveryActive: boolean;
  busy: boolean;
  session: Session | null;
  profile: User | null;
  termsStatus: TermsStatus | null;
  connections: ConnectionWithPerson[];
  updates: MomentUpdate[];
  updatesLoading: boolean;
  updatesLoadingMore: boolean;
  updatesCursor: UpdateCursor | null;
  updatesHasMore: boolean;
  updatesError: string | null;
  activity: ActivityItem[];
  nudges: Nudge[];
  reactions: Reaction[];
  activityLoading: boolean;
  activityLoadingMore: boolean;
  activityCursor: ActivityCursor | null;
  activityHasMore: boolean;
  activityError: string | null;
  activityReadAt: string | null;
  activityHydrated: boolean;
  nudgeSendingTo: UserId | null;
  reactionUpdating: string | null;
  lastSentUpdateId: string | null;
  invite: ConnectionInvite | null;
  inviteLoading: boolean;
  inviteError: string | null;
  realtimeConnected: boolean;
  notificationPreferences: NotificationPreferences;
  notificationPermission: NotificationPermissionState;
  notificationsLoading: boolean;
  notificationPromptVisible: boolean;
  notificationError: string | null;
  profileSearch: User | null;
  emailConfirmationPending: boolean;
  confirmationStatus: 'idle' | 'success' | 'error';
  confirmationError: string | null;
  verificationEmail: string | null;
  verificationBusy: boolean;
  verificationMessage: string | null;
  verificationError: string | null;
  resendAvailableAt: number | null;
  message: string | null;
  error: string | null;
};

type LocalState = {
  onboardingComplete: boolean;
  draft: UpdateDraft;
  preferences: Preferences;
};

export type AppState = { server: ServerState; local: LocalState };

type Action =
  | { type: 'SERVER_BUSY'; busy: boolean }
  | { type: 'RECOVERY_ACTIVE'; active: boolean }
  | { type: 'SERVER_ERROR'; error: string | null }
  | { type: 'SERVER_MESSAGE'; message: string | null }
  | { type: 'AUTH_LINK_PROCESSING'; processing: boolean }
  | { type: 'CONFIRMATION_SUCCESS' }
  | { type: 'CONFIRMATION_ERROR'; error: string }
  | { type: 'CLEAR_CONFIRMATION' }
  | { type: 'VERIFICATION_EMAIL_LOADED'; email: string | null }
  | { type: 'VERIFICATION_BUSY'; busy: boolean }
  | { type: 'VERIFICATION_RESULT'; message: string | null; error: string | null; resendAvailableAt?: number | null }
  | { type: 'SESSION_CLEARED' }
  | { type: 'SESSION_REFRESHED'; session: Session }
  | { type: 'EMAIL_CONFIRMATION_REQUIRED'; email: string }
  | { type: 'HYDRATE_SUCCESS'; session: Session; profile: User; connections: ConnectionWithPerson[] }
  | { type: 'TERMS_LOADED'; termsStatus: TermsStatus }
  | { type: 'PROFILE_UPDATED'; profile: User }
  | { type: 'PROFILE_SEARCHED'; profile: User | null }
  | { type: 'CONNECTIONS_LOADED'; connections: ConnectionWithPerson[] }
  | { type: 'UPDATES_LOADING'; userId: string; append: boolean }
  | { type: 'UPDATES_LOADED'; userId: string; updates: MomentUpdate[]; append: boolean; cursor: UpdateCursor | null; hasMore: boolean }
  | { type: 'UPDATES_ERROR'; userId: string; error: string }
  | { type: 'SINGLE_UPDATE_LOADED'; userId: string; updateId: string; update: MomentUpdate | null }
  | { type: 'UPDATE_SEEN'; userId: string; updateId: string; seenAt: string }
  | { type: 'ACTIVITY_LOADING'; userId: string; append: boolean }
  | { type: 'ACTIVITY_LOADED'; userId: string; activity: ActivityItem[]; nudges: Nudge[]; reactions: Reaction[]; readAt: string | null; append: boolean; cursor: ActivityCursor | null; hasMore: boolean }
  | { type: 'ACTIVITY_ERROR'; userId: string; error: string }
  | { type: 'ACTIVITY_READ'; userId: string; readAt: string }
  | { type: 'NUDGE_SENDING'; userId: string; personId: UserId | null }
  | { type: 'REACTION_UPDATING'; userId: string; updateId: string | null }
  | { type: 'REACTION_SET'; userId: string; updateId: string; reaction: Reaction }
  | { type: 'INVITE_LOADING' }
  | { type: 'INVITE_LOADED'; invite: ConnectionInvite | null }
  | { type: 'INVITE_ERROR'; error: string | null }
  | { type: 'REALTIME_CONNECTED'; userId: string; connected: boolean }
  | { type: 'NOTIFICATIONS_LOADED'; userId: string; preferences: NotificationPreferences; permission: NotificationPermissionState }
  | { type: 'NOTIFICATIONS_LOADING'; loading: boolean }
  | { type: 'NOTIFICATION_PROMPT'; visible: boolean }
  | { type: 'NOTIFICATION_ERROR'; error: string | null }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'SET_DRAFT_PHOTO'; photo: DraftPhoto }
  | { type: 'CLEAR_DRAFT_PHOTO' }
  | { type: 'SET_DRAFT_STATUS'; status: UpdateStatus | null }
  | { type: 'TOGGLE_DRAFT_RECIPIENT'; userId: UserId }
  | { type: 'SET_DRAFT_RECIPIENTS'; userIds: UserId[] }
  | { type: 'SET_DRAFT_CIRCLES'; circleIds: string[] }
  | { type: 'SET_DRAFT_CAPTION'; caption: string }
  | { type: 'PREPARE_NUDGE_RESPONSE'; nudgeId: string; senderId: UserId }
  | { type: 'DRAFT_SENDING'; sending: boolean }
  | { type: 'DRAFT_STAGE'; stage: UpdateDraft['sendStage'] }
  | { type: 'DRAFT_REQUEST_ID'; id: string }
  | { type: 'DRAFT_ERROR'; error: string | null }
  | { type: 'UPDATE_SENT'; update: MomentUpdate }
  | { type: 'UPDATE_DELETED'; userId: string; updateId: string }
  | { type: 'SET_PREFERENCE'; key: keyof Preferences; value: Preferences[keyof Preferences] };

const initialState: AppState = {
  server: {
    configured: isSupabaseConfigured,
    initializing: true,
    authLinkProcessing: true,
    recoveryActive: false,
    busy: false,
    session: null,
    profile: null,
    termsStatus: null,
    connections: [],
    updates: [],
    updatesLoading: false,
    updatesLoadingMore: false,
    updatesCursor: null,
    updatesHasMore: true,
    updatesError: null,
    activity: [],
    nudges: [],
    reactions: [],
    activityLoading: false,
    activityLoadingMore: false,
    activityCursor: null,
    activityHasMore: true,
    activityError: null,
    activityReadAt: null,
    activityHydrated: false,
    nudgeSendingTo: null,
    reactionUpdating: null,
    lastSentUpdateId: null,
    invite: null,
    inviteLoading: false,
    inviteError: null,
    realtimeConnected: false,
    notificationPreferences: { enabled: true, moments: true, nudges: true, reactions: true, comments: true, connections: true },
    notificationPermission: 'undetermined',
    notificationsLoading: false,
    notificationPromptVisible: false,
    notificationError: null,
    profileSearch: null,
    emailConfirmationPending: false,
    confirmationStatus: 'idle',
    confirmationError: null,
    verificationEmail: null,
    verificationBusy: false,
    verificationMessage: null,
    verificationError: null,
    resendAvailableAt: null,
    message: null,
    error: null,
  },
  local: {
    onboardingComplete: false,
    draft: { photo: null, status: null, recipientIds: [], circleIds: [], caption: '', sending: false, sendStage: 'idle', clientRequestId: null, error: null, respondingToNudgeId: null },
    preferences: { nudgesEnabled: true, recentMomentsDays: 30, privacy: 'selected-people' },
  },
};

function alignDraftRecipients(local: LocalState, connections: ConnectionWithPerson[]) {
  const accepted = connections.filter(({ connection }) => connection.status === 'accepted');
  const personId = accepted[0]?.person.id;
  if (!personId) return { ...local, draft: { ...local.draft, recipientIds: [] } };
  return {
    ...local,
    draft: {
      ...local.draft,
      recipientIds: local.draft.recipientIds.length > 0 || local.draft.circleIds?.length
        ? local.draft.recipientIds.filter((id) => accepted.some(({ person }) => person.id === id))
        : [personId],
    },
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'RECOVERY_ACTIVE': return { ...state, server: { ...state.server, recoveryActive: action.active } };
    case 'SINGLE_UPDATE_LOADED': return state.server.session?.user.id !== action.userId ? state : { ...state, server: { ...state.server, updates: [...state.server.updates.filter(item => item.id !== action.updateId), ...(action.update ? [action.update] : [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)) } };
    case 'UPDATE_DELETED': return state.server.session?.user.id !== action.userId ? state : { ...state, server: { ...state.server, updates: state.server.updates.filter(item => item.id !== action.updateId), activity: state.server.activity.filter(item => item.updateId !== action.updateId), reactions: state.server.reactions.filter(item => item.updateId !== action.updateId) } };
    case 'SERVER_BUSY': return { ...state, server: { ...state.server, busy: action.busy } };
    case 'SERVER_ERROR': return { ...state, server: { ...state.server, error: action.error, busy: false, initializing: false } };
    case 'SERVER_MESSAGE': return { ...state, server: { ...state.server, message: action.message } };
    case 'AUTH_LINK_PROCESSING': return { ...state, server: { ...state.server, authLinkProcessing: action.processing } };
    case 'CONFIRMATION_SUCCESS':
      return { ...state, server: { ...state.server, confirmationStatus: 'success', confirmationError: null, emailConfirmationPending: false, verificationEmail: null } };
    case 'CONFIRMATION_ERROR':
      return { ...state, server: { ...state.server, initializing: false, confirmationStatus: 'error', confirmationError: action.error } };
    case 'CLEAR_CONFIRMATION':
      return { ...state, server: { ...state.server, emailConfirmationPending: false, confirmationStatus: 'idle', confirmationError: null, verificationMessage: null, verificationError: null } };
    case 'VERIFICATION_EMAIL_LOADED':
      return { ...state, server: { ...state.server, verificationEmail: action.email } };
    case 'VERIFICATION_BUSY':
      return { ...state, server: { ...state.server, verificationBusy: action.busy, verificationMessage: null, verificationError: null } };
    case 'VERIFICATION_RESULT':
      return {
        ...state,
        server: {
          ...state.server,
          verificationBusy: false,
          verificationMessage: action.message,
          verificationError: action.error,
          resendAvailableAt: action.resendAvailableAt === undefined ? state.server.resendAvailableAt : action.resendAvailableAt,
        },
      };
    case 'SESSION_CLEARED':
      return {
        server: {
          ...initialState.server,
          configured: state.server.configured,
          initializing: false,
          authLinkProcessing: state.server.authLinkProcessing,
          confirmationStatus: state.server.confirmationStatus,
          confirmationError: state.server.confirmationError,
          verificationEmail: state.server.verificationEmail,
          verificationMessage: state.server.verificationMessage,
          verificationError: state.server.verificationError,
          resendAvailableAt: state.server.resendAvailableAt,
        },
        local: initialState.local,
      };
    case 'SESSION_REFRESHED':
      return state.server.session?.user.id === action.session.user.id
        ? { ...state, server: { ...state.server, session: action.session } }
        : state;
    case 'EMAIL_CONFIRMATION_REQUIRED':
      return {
        ...state,
        server: {
          ...state.server,
          initializing: false,
          busy: false,
          emailConfirmationPending: true,
          verificationEmail: action.email,
          verificationMessage: null,
          verificationError: null,
          message: null,
          error: null,
        },
      };
    case 'HYDRATE_SUCCESS': {
      const accountChanged = state.server.session?.user.id !== action.session.user.id;
      return {
        server: {
          ...state.server,
          initializing: false,
          busy: false,
          session: action.session,
          profile: action.profile,
          connections: action.connections,
          updates: [],
          updatesCursor: null,
          updatesHasMore: true,
          updatesLoadingMore: false,
          updatesError: null,
          activity: [],
          activityCursor: null,
          activityHasMore: true,
          activityLoadingMore: false,
          nudges: [],
          reactions: [],
          activityError: null,
          activityReadAt: null,
          activityHydrated: false,
          lastSentUpdateId: null,
          emailConfirmationPending: false,
          realtimeConnected: false,
          notificationPromptVisible: false,
          notificationError: null,
          error: null,
        },
        local: alignDraftRecipients(accountChanged ? initialState.local : state.local, action.connections),
      };
    }
    case 'TERMS_LOADED': return { ...state, server: { ...state.server, termsStatus: action.termsStatus } };
    case 'PROFILE_UPDATED': return { ...state, server: { ...state.server, profile: action.profile, busy: false, error: null } };
    case 'PROFILE_SEARCHED': return { ...state, server: { ...state.server, profileSearch: action.profile, busy: false, error: null } };
    case 'CONNECTIONS_LOADED': {
      return { server: { ...state.server, connections: action.connections, busy: false, error: null }, local: alignDraftRecipients(state.local, action.connections) };
    }
    case 'UPDATES_LOADING':
      return state.server.session?.user.id === action.userId
        ? { ...state, server: { ...state.server, updatesLoading: action.append ? state.server.updatesLoading : true, updatesLoadingMore: action.append, updatesError: null } }
        : state;
    case 'UPDATES_LOADED':
      if (state.server.session?.user.id !== action.userId) return state;
      return {
        ...state,
        server: {
          ...state.server,
          updates: action.append
            ? [...new Map([...state.server.updates, ...action.updates].map((item) => [item.id, item])).values()]
            : action.updates,
          updatesLoading: false,
          updatesLoadingMore: false,
          updatesCursor: action.cursor ?? (action.append ? state.server.updatesCursor : null),
          updatesHasMore: action.hasMore,
          updatesError: null,
        },
      };
    case 'UPDATES_ERROR':
      return state.server.session?.user.id === action.userId
        ? { ...state, server: { ...state.server, updatesLoading: false, updatesLoadingMore: false, updatesError: action.error } }
        : state;
    case 'UPDATE_SEEN':
      return state.server.session?.user.id === action.userId
        ? { ...state, server: { ...state.server, updates: state.server.updates.map((update) => update.id === action.updateId ? { ...update, seenAt: action.seenAt } : update) } }
        : state;
    case 'ACTIVITY_LOADING':
      return state.server.session?.user.id === action.userId
        ? { ...state, server: { ...state.server, activityLoading: action.append ? state.server.activityLoading : true, activityLoadingMore: action.append, activityError: null } }
        : state;
    case 'ACTIVITY_LOADED':
      if (state.server.session?.user.id !== action.userId) return state;
      return { ...state, server: {
        ...state.server,
        activity: action.append ? [...new Map([...state.server.activity, ...action.activity].map((item) => [item.id, item])).values()] : action.activity,
        nudges: action.append ? [...new Map([...state.server.nudges, ...action.nudges].map((item) => [item.id, item])).values()] : action.nudges,
        reactions: action.append ? [...new Map([...state.server.reactions, ...action.reactions].map((item) => [item.id, item])).values()] : action.reactions,
        activityReadAt: action.readAt,
        activityHydrated: true,
        activityLoading: false,
        activityLoadingMore: false,
        activityCursor: action.cursor ?? (action.append ? state.server.activityCursor : null),
        activityHasMore: action.hasMore,
        activityError: null,
      } };
    case 'ACTIVITY_ERROR':
      return state.server.session?.user.id === action.userId
        ? { ...state, server: { ...state.server, activityLoading: false, activityLoadingMore: false, activityError: action.error } }
        : state;
    case 'ACTIVITY_READ':
      return state.server.session?.user.id === action.userId
        ? { ...state, server: { ...state.server, activityReadAt: action.readAt, activity: state.server.activity.map((item) => ({ ...item, read: true })) } }
        : state;
    case 'NUDGE_SENDING':
      return state.server.session?.user.id === action.userId
        ? { ...state, server: { ...state.server, nudgeSendingTo: action.personId } }
        : state;
    case 'REACTION_UPDATING':
      return state.server.session?.user.id === action.userId
        ? { ...state, server: { ...state.server, reactionUpdating: action.updateId } }
        : state;
    case 'REACTION_SET':
      return state.server.session?.user.id === action.userId
        ? { ...state, server: { ...state.server, reactionUpdating: null, updates: state.server.updates.map((update) => update.id === action.updateId ? { ...update, reactions: [action.reaction, ...update.reactions.filter((item) => item.userId !== action.userId)] } : update) } }
        : state;
    case 'INVITE_LOADING': return { ...state, server: { ...state.server, inviteLoading: true, inviteError: null } };
    case 'INVITE_LOADED': return { ...state, server: { ...state.server, invite: action.invite, inviteLoading: false, inviteError: null } };
    case 'INVITE_ERROR': return { ...state, server: { ...state.server, inviteLoading: false, inviteError: action.error } };
    case 'REALTIME_CONNECTED':
      return state.server.session?.user.id === action.userId
        ? { ...state, server: { ...state.server, realtimeConnected: action.connected } }
        : state;
    case 'NOTIFICATIONS_LOADED':
      return state.server.session?.user.id === action.userId
        ? { ...state, server: { ...state.server, notificationPreferences: action.preferences, notificationPermission: action.permission, notificationsLoading: false, notificationError: null } }
        : state;
    case 'NOTIFICATIONS_LOADING': return { ...state, server: { ...state.server, notificationsLoading: action.loading } };
    case 'NOTIFICATION_PROMPT': return { ...state, server: { ...state.server, notificationPromptVisible: action.visible } };
    case 'NOTIFICATION_ERROR': return { ...state, server: { ...state.server, notificationsLoading: false, notificationError: action.error } };
    case 'COMPLETE_ONBOARDING': return { ...state, local: { ...state.local, onboardingComplete: true } };
    case 'SET_DRAFT_PHOTO': return { ...state, local: { ...state.local, draft: { ...state.local.draft, photo: action.photo, status: state.local.draft.photo ? state.local.draft.status : null, clientRequestId: Crypto.randomUUID(), sendStage: 'idle', error: null } } };
    case 'CLEAR_DRAFT_PHOTO': return { ...state, local: { ...state.local, draft: { ...state.local.draft, photo: null, clientRequestId: null, sendStage: 'idle', error: null } } };
    case 'SET_DRAFT_STATUS': return { ...state, local: { ...state.local, draft: { ...state.local.draft, status: action.status } } };
    case 'SET_DRAFT_RECIPIENTS': return { ...state, local: { ...state.local, draft: { ...state.local.draft, recipientIds: [...new Set(action.userIds)], error: null } } };
    case 'SET_DRAFT_CIRCLES': return { ...state, local: { ...state.local, draft: { ...state.local.draft, circleIds: [...new Set(action.circleIds)], error: null } } };
    case 'TOGGLE_DRAFT_RECIPIENT': {
      const selected = state.local.draft.recipientIds.includes(action.userId);
      return { ...state, local: { ...state.local, draft: { ...state.local.draft, recipientIds: selected ? state.local.draft.recipientIds.filter((id) => id !== action.userId) : [...state.local.draft.recipientIds, action.userId] } } };
    }
    case 'SET_DRAFT_CAPTION': return { ...state, local: { ...state.local, draft: { ...state.local.draft, caption: action.caption, error: null } } };
    case 'PREPARE_NUDGE_RESPONSE': return { ...state, local: { ...state.local, draft: { ...state.local.draft, recipientIds: [action.senderId], circleIds: [], respondingToNudgeId: action.nudgeId, error: null } } };
    case 'DRAFT_SENDING': return { ...state, local: { ...state.local, draft: { ...state.local.draft, sending: action.sending, sendStage: action.sending ? state.local.draft.sendStage : 'idle', error: null } } };
    case 'DRAFT_STAGE': return { ...state, local: { ...state.local, draft: { ...state.local.draft, sendStage: action.stage } } };
    case 'DRAFT_REQUEST_ID': return { ...state, local: { ...state.local, draft: { ...state.local.draft, clientRequestId: action.id } } };
    case 'DRAFT_ERROR': return { ...state, local: { ...state.local, draft: { ...state.local.draft, sending: false, sendStage: 'idle', error: action.error } } };
    case 'UPDATE_SENT': {
      if (state.server.session?.user.id !== action.update.senderId) return state;
      const defaultRecipient = state.server.connections.find(({ connection }) => connection.status === 'accepted')?.person.id;
      return {
        server: {
          ...state.server,
          updates: [action.update, ...state.server.updates.filter((item) => item.id !== action.update.id)],
          updatesLoading: false,
          updatesError: null,
          lastSentUpdateId: action.update.id,
        },
        local: {
          ...state.local,
          draft: { photo: null, status: null, recipientIds: defaultRecipient ? [defaultRecipient] : [], circleIds: [], caption: '', sending: false, sendStage: 'idle', clientRequestId: null, error: null, respondingToNudgeId: null },
        },
      };
    }
    case 'SET_PREFERENCE': return { ...state, local: { ...state.local, preferences: { ...state.local.preferences, [action.key]: action.value } } };
  }
}

type AppActions = {
  refreshUpdate: (id: string) => Promise<void>;
  completeOnboarding: () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (input: SignUpInput) => Promise<'signed-in' | 'confirmation-required' | null>;
  resendSignupConfirmation: () => Promise<boolean>;
  clearConfirmationFlow: () => void;
  signOut: () => Promise<boolean>;
  acceptTerms: () => Promise<boolean>;
  refreshTerms: () => Promise<void>;
  updateProfile: (input: { displayName: string; username: string; bio: string }) => Promise<boolean>;
  updateAvatar: (photo: DraftPhoto) => Promise<boolean>;
  finishRecovery: () => void;
  removeConnection: (connectionId: string) => Promise<boolean>;
  blockUser: (personId: string) => Promise<boolean>;
  deleteAccount: (confirmation: string) => Promise<boolean>;
  clearServerFeedback: () => void;
  searchProfile: (username: string) => Promise<User | null>;
  requestConnection: (relationshipType: RelationshipType) => Promise<boolean>;
  acceptConnection: (connectionId: string) => Promise<boolean>;
  refreshConnections: () => Promise<void>;
  loadInvite: () => Promise<void>;
  redeemInvite: (code: string, relationshipType: RelationshipType) => Promise<boolean>;
  regenerateInvite: () => Promise<void>;
  shareInvite: () => Promise<void>;
  copyInvite: () => Promise<void>;
  setDraftPhoto: (photo: DraftPhoto) => void;
  clearDraftPhoto: () => void;
  setDraftStatus: (status: UpdateStatus | null) => void;
  toggleDraftRecipient: (userId: UserId) => void;
  setDraftRecipients: (userIds: UserId[]) => void;
  setDraftCircles: (circleIds: string[]) => void;
  setDraftCaption: (caption: string) => void;
  sendDraft: () => Promise<string | null>;
  refreshUpdates: () => Promise<void>;
  loadMoreUpdates: () => Promise<void>;
  refreshActivity: () => Promise<void>;
  loadMoreActivity: () => Promise<void>;
  markActivityRead: () => Promise<void>;
  sendNudge: (personId: UserId) => Promise<boolean>;
  prepareNudgeResponse: (nudgeId: string, senderId: UserId) => void;
  markNudgeSeen: (nudgeId: string) => Promise<void>;
  reactToUpdate: (updateId: string, reaction: ReactionType) => Promise<boolean>;
  deleteMoment: (updateId: string) => Promise<void>;
  markUpdateSeen: (updateId: string) => Promise<void>;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  enableNotifications: () => Promise<void>;
  dismissNotificationPrompt: () => Promise<void>;
  setNotificationPreference: (key: keyof NotificationPreferences, value: boolean) => Promise<void>;
  openNotificationSettings: () => Promise<void>;
  handleNotificationSignal: (data: AppNotificationData) => Promise<void>;
  prepareNotificationRoute: (data: AppNotificationData) => Promise<boolean>;
};

type StoreValue = { state: AppState; actions: AppActions };
const AppStoreContext = createContext<StoreValue | null>(null);
const notificationPromptKey = (userId: string) => `watchu-doin:notification-prompt:${userId}`;

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const sendingRef = useRef(false);
  const deletedMomentsRef = useRef(new Set<string>());
  const stateRef = useRef(state);
  const realtimeTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  stateRef.current = state;

  const clearInvalidSession = useCallback(async (error: unknown) => {
    const mapped = readableServiceError(error);
    if (mapped.code !== 'auth_required') return false;
    await realtimeService.stop();
    await pushTokenService.disableCurrent().catch(() => undefined);
    await authService.clearLocalSession().catch(() => undefined);
    dispatch({ type: 'SESSION_CLEARED' });
    return true;
  }, []);

  const loadUpdates = useCallback(async (userId: string, append = false) => {
    if (append && (!stateRef.current.server.updatesHasMore || stateRef.current.server.updatesLoadingMore)) return;
    dispatch({ type: 'UPDATES_LOADING', userId, append });
    try {
      const page = await updateQueries.listVisible(userId, append ? stateRef.current.server.updatesCursor : null);
      dispatch({ type: 'UPDATES_LOADED', userId, updates: page.updates.filter(item => !deletedMomentsRef.current.has(`${userId}:${item.id}`)), append, cursor: page.cursor, hasMore: page.hasMore });
    } catch (error) {
      if (await clearInvalidSession(error)) return;
      dispatch({ type: 'UPDATES_ERROR', userId, error: readableServiceError(error).message });
    }
  }, [clearInvalidSession]);

  const loadActivity = useCallback(async (userId: string, connections: ConnectionWithPerson[], append = false) => {
    if (append && (!stateRef.current.server.activityHasMore || stateRef.current.server.activityLoadingMore)) return;
    dispatch({ type: 'ACTIVITY_LOADING', userId, append });
    try {
      const snapshot = await activityService.list(userId, connections, append ? stateRef.current.server.activityCursor : null);
      dispatch({ type: 'ACTIVITY_LOADED', userId, activity: snapshot.items.filter(item => !item.updateId || !deletedMomentsRef.current.has(`${userId}:${item.updateId}`)), nudges: snapshot.nudges, reactions: snapshot.reactions, readAt: snapshot.lastReadAt, append, cursor: snapshot.cursor, hasMore: snapshot.hasMore });
    } catch (error) {
      if (await clearInvalidSession(error)) return;
      dispatch({ type: 'ACTIVITY_ERROR', userId, error: readableServiceError(error).message });
    }
  }, [clearInvalidSession]);

  const registerPushIfGranted = useCallback(async (force = false) => {
    const current = stateRef.current;
    if (!current.server.profile || (!force && !current.server.notificationPreferences.enabled)) return;
    const permission = await notificationService.permissionState();
    if (permission !== 'granted') return;
    const token = await notificationService.getExpoPushToken();
    if (stateRef.current.server.profile?.id !== current.server.profile.id) return;
    await pushTokenService.register(token);
  }, []);

  const refreshAuthoritative = useCallback(async (userId: string) => {
    if (stateRef.current.server.session?.user.id !== userId) return;
    try {
      const connections = await connectionService.listForUser(userId);
      if (stateRef.current.server.session?.user.id !== userId) return;
      dispatch({ type: 'CONNECTIONS_LOADED', connections });
      await Promise.all([loadUpdates(userId), loadActivity(userId, connections)]);
    } catch (error) {
      if (await clearInvalidSession(error)) return;
      if (stateRef.current.server.session?.user.id === userId) {
        dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
      }
    }
  }, [clearInvalidSession, loadActivity, loadUpdates]);

  const handleRealtimeEvent = useCallback((userId: string, event: AppRealtimeEvent) => {
    const key = event.kind === 'seen' ? 'updates' : event.kind;
    const pending = realtimeTimersRef.current.get(key);
    if (pending) clearTimeout(pending);
    realtimeTimersRef.current.set(key, setTimeout(() => {
      realtimeTimersRef.current.delete(key);
      if (stateRef.current.server.session?.user.id !== userId) return;
      if (event.kind === 'connection') {
        void refreshAuthoritative(userId);
        return;
      }
      if (event.kind === 'moment' || event.kind === 'reaction' || event.kind === 'seen') void loadUpdates(userId);
      if (event.kind !== 'seen') void loadActivity(userId, stateRef.current.server.connections);
    }, 180));
  }, [loadActivity, loadUpdates, refreshAuthoritative]);

  const hydrateSession = useCallback(async (session: Session) => {
    const [profile, connections, notificationPreferences, notificationPermission, termsStatus] = await Promise.all([
      profileService.getById(session.user.id),
      connectionService.listForUser(session.user.id),
      notificationService.loadPreferences(session.user.id),
      notificationService.permissionState(),
      legalService.getTermsStatus(),
    ]);
    dispatch({ type: 'HYDRATE_SUCCESS', session, profile, connections });
    dispatch({ type: 'TERMS_LOADED', termsStatus });
    dispatch({ type: 'NOTIFICATIONS_LOADED', userId: session.user.id, preferences: notificationPreferences, permission: notificationPermission });
    void loadUpdates(session.user.id);
    void loadActivity(session.user.id, connections);
    if (notificationPermission === 'granted' && notificationPreferences.enabled) {
      setTimeout(() => void registerPushIfGranted().catch((error) => {
        if (stateRef.current.server.session?.user.id === session.user.id) dispatch({ type: 'NOTIFICATION_ERROR', error: readableServiceError(error).message });
      }), 0);
    }
    dispatch({ type: 'INVITE_LOADING' });
    void inviteService.getMyInvite()
      .then((invite) => dispatch({ type: 'INVITE_LOADED', invite }))
      .catch((error) => dispatch({ type: 'INVITE_ERROR', error: inviteService.errorMessage(error) }));
  }, [loadActivity, loadUpdates, registerPushIfGranted]);

  const processAuthLink = useCallback(async (url: string) => {
    if (!authLinkService.isAuthCallbackUrl(url)) return false;
    dispatch({ type: 'AUTH_LINK_PROCESSING', processing: true });
    const result = await authLinkService.handle(url);
    if (result.kind === 'success') {
      if (result.recovery) dispatch({ type: 'RECOVERY_ACTIVE', active: true });
      try {
        await hydrateSession(result.session);
        if (!result.recovery) dispatch({ type: 'CONFIRMATION_SUCCESS' });
      } catch (error) {
        dispatch({ type: 'CONFIRMATION_ERROR', error: readableServiceError(error).message });
      }
    } else if (result.kind === 'error') {
      if (result.recovery) {
        dispatch({ type: 'RECOVERY_ACTIVE', active: true });
        dispatch({ type: 'SERVER_ERROR', error: result.message });
      } else dispatch({ type: 'CONFIRMATION_ERROR', error: result.message });
    }
    dispatch({ type: 'AUTH_LINK_PROCESSING', processing: false });
    return true;
  }, [hydrateSession]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      dispatch({ type: 'SERVER_ERROR', error: 'Add EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env to connect this build.' });
      dispatch({ type: 'AUTH_LINK_PROCESSING', processing: false });
      return;
    }
    let active = true;
    const subscription = authService.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT' || !session) {
        void realtimeService.stop();
        dispatch({ type: 'SESSION_CLEARED' });
      } else if (event === 'PASSWORD_RECOVERY') {
        dispatch({ type: 'RECOVERY_ACTIVE', active: true });
        setTimeout(() => void hydrateSession(session).catch(() => undefined), 0);
      } else if (event === 'TOKEN_REFRESHED') {
        realtimeService.updateAuth(session.access_token);
        dispatch({ type: 'SESSION_REFRESHED', session });
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setTimeout(() => void hydrateSession(session).catch((error) => {
          if (active) void clearInvalidSession(error).then((cleared) => { if (!cleared) dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message }); });
        }), 0);
      }
    });
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      if (active && authLinkService.isAuthCallbackUrl(url)) void processAuthLink(url);
    });

    void (async () => {
      try {
        const pendingEmail = await authService.getPendingVerificationEmail();
        if (active) dispatch({ type: 'VERIFICATION_EMAIL_LOADED', email: pendingEmail });

        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && authLinkService.isAuthCallbackUrl(initialUrl)) {
          await processAuthLink(initialUrl);
          return;
        }

        const session = await authService.getSession();
        if (!active) return;
        if (session) await hydrateSession(session);
        else dispatch({ type: 'SESSION_CLEARED' });
      } catch (error) {
        if (active) {
          const cleared = await clearInvalidSession(error);
          if (!cleared) dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
        }
      } finally {
        if (active) dispatch({ type: 'AUTH_LINK_PROCESSING', processing: false });
      }
    })();

    return () => {
      active = false;
      void realtimeService.stop();
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [clearInvalidSession, hydrateSession, processAuthLink]);

  useEffect(() => {
    const session = state.server.session;
    const userId = state.server.profile?.id;
    if (!session || !userId) return;
    let active = true;
    let subscribedOnce = false;
    void realtimeService.start(userId, session.access_token, {
      onEvent: (event) => handleRealtimeEvent(userId, event),
      onConnected: () => {
        if (!active || stateRef.current.server.session?.user.id !== userId) return;
        dispatch({ type: 'REALTIME_CONNECTED', userId, connected: true });
        if (subscribedOnce) void refreshAuthoritative(userId);
        subscribedOnce = true;
      },
    }).catch(() => {
      if (active) dispatch({ type: 'REALTIME_CONNECTED', userId, connected: false });
    });
    return () => {
      active = false;
      for (const timer of realtimeTimersRef.current.values()) clearTimeout(timer);
      realtimeTimersRef.current.clear();
      void realtimeService.stop();
    };
  }, [handleRealtimeEvent, refreshAuthoritative, state.server.profile?.id, state.server.session?.access_token, state.server.session]);

  useEffect(() => {
    void notificationService.configureChannel();
    const stopTokenListener = notificationService.listenForTokenChanges(() => { void registerPushIfGranted().catch(() => undefined); });
    const subscription = NativeAppState.addEventListener('change', (nextState) => {
      const userId = stateRef.current.server.session?.user.id;
      if (nextState !== 'active' || !userId) return;
      void refreshAuthoritative(userId);
      void registerPushIfGranted().catch(() => undefined);
    });
    return () => { subscription.remove(); stopTokenListener(); };
  }, [refreshAuthoritative, registerPushIfGranted]);

  const offerNotificationPrompt = useCallback(async (userId: string) => {
    if (stateRef.current.server.session?.user.id !== userId) return;
    if (stateRef.current.server.notificationPermission !== 'undetermined') return;
    const alreadyOffered = await AsyncStorage.getItem(notificationPromptKey(userId));
    if (!alreadyOffered && stateRef.current.server.session?.user.id === userId) {
      dispatch({ type: 'NOTIFICATION_PROMPT', visible: true });
    }
  }, []);

  const actions = useMemo<AppActions>(() => ({
    refreshUpdate: async (id) => {
      const userId = stateRef.current.server.profile?.id;
      if (!userId) return;
      try { const update = await updateQueries.getVisibleById(userId, id); dispatch({ type: 'SINGLE_UPDATE_LOADED', userId, updateId: id, update: deletedMomentsRef.current.has(`${userId}:${id}`) ? null : update }); }
      catch (error) { dispatch({ type: 'UPDATES_ERROR', userId, error: readableServiceError(error).message }); }
    },
    completeOnboarding: () => dispatch({ type: 'COMPLETE_ONBOARDING' }),
    clearServerFeedback: () => {
      dispatch({ type: 'SERVER_ERROR', error: null });
      dispatch({ type: 'SERVER_MESSAGE', message: null });
      dispatch({ type: 'INVITE_ERROR', error: null });
    },
    signIn: async (email, password) => {
      dispatch({ type: 'SERVER_BUSY', busy: true });
      dispatch({ type: 'SERVER_ERROR', error: null });
      try {
        const session = await authService.signIn(email, password);
        if (!session) throw new ServiceError('No session was returned. Please try again.', 'session_missing');
        await authService.clearPendingVerificationEmail();
        dispatch({ type: 'VERIFICATION_EMAIL_LOADED', email: null });
        dispatch({ type: 'CLEAR_CONFIRMATION' });
        await hydrateSession(session);
        return true;
      } catch (error) {
        dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
        return false;
      }
    },
    signUp: async (input) => {
      dispatch({ type: 'SERVER_BUSY', busy: true });
      dispatch({ type: 'SERVER_ERROR', error: null });
      try {
        const username = input.username.trim().replace(/^@/, '').toLowerCase();
        if (!/^[a-z0-9._]{3,24}$/.test(username)) throw new ServiceError('Username must be 3-24 letters, numbers, periods, or underscores.', 'invalid_username');
        if (input.password.length < 8) throw new ServiceError('Use a password with at least 8 characters.', 'weak_password');
        const result = await authService.signUp({ ...input, username });
        if (!result.session) {
          const normalizedEmail = input.email.trim().toLowerCase();
          await authService.rememberPendingVerificationEmail(normalizedEmail);
          dispatch({ type: 'EMAIL_CONFIRMATION_REQUIRED', email: normalizedEmail });
          return 'confirmation-required';
        }
        await authService.clearPendingVerificationEmail();
        dispatch({ type: 'VERIFICATION_EMAIL_LOADED', email: null });
        await hydrateSession(result.session);
        return 'signed-in';
      } catch (error) {
        dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
        return null;
      }
    },
    resendSignupConfirmation: async () => {
      const email = state.server.verificationEmail;
      if (!email) {
        dispatch({ type: 'VERIFICATION_RESULT', message: null, error: 'Enter your email again from the sign-in screen.' });
        return false;
      }
      if (state.server.resendAvailableAt && Date.now() < state.server.resendAvailableAt) {
        dispatch({ type: 'VERIFICATION_RESULT', message: null, error: 'Please wait before requesting another email.' });
        return false;
      }
      dispatch({ type: 'VERIFICATION_BUSY', busy: true });
      try {
        await authService.resendSignupConfirmation(email);
        dispatch({
          type: 'VERIFICATION_RESULT',
          message: 'A new confirmation email is on its way.',
          error: null,
          resendAvailableAt: Date.now() + 60_000,
        });
        return true;
      } catch (error) {
        dispatch({ type: 'VERIFICATION_RESULT', message: null, error: readableServiceError(error).message });
        return false;
      }
    },
    clearConfirmationFlow: () => dispatch({ type: 'CLEAR_CONFIRMATION' }),
    signOut: async () => {
      dispatch({ type: 'SERVER_BUSY', busy: true });
      try {
        // Auxiliary cleanup must not prevent the user from ending their session.
        await Promise.allSettled([pushTokenService.disableCurrent(), realtimeService.stop()]);
        await authService.signOut();
        void widgetService.clear().catch(() => undefined);
        await authService.clearPendingVerificationEmail().catch(() => undefined);
        dispatch({ type: 'VERIFICATION_EMAIL_LOADED', email: null });
        dispatch({ type: 'CLEAR_CONFIRMATION' });
        dispatch({ type: 'SESSION_CLEARED' });
        return true;
      }
      catch (error) { dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message }); return false; }
    },
    acceptTerms: async () => {
      const status = state.server.termsStatus;
      if (!status) return false;
      dispatch({ type: 'SERVER_BUSY', busy: true });
      try {
        const acceptedAt = await legalService.acceptTerms(status.currentVersion);
        dispatch({ type: 'TERMS_LOADED', termsStatus: { ...status, acceptedAt } });
        dispatch({ type: 'SERVER_BUSY', busy: false });
        return true;
      } catch (error) {
        dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
        return false;
      }
    },
    refreshTerms: async () => {
      try { dispatch({ type: 'TERMS_LOADED', termsStatus: await legalService.getTermsStatus() }); }
      catch (error) { dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message }); }
    },
    updateProfile: async (input) => {
      dispatch({ type: 'SERVER_BUSY', busy: true });
      try {
        dispatch({ type: 'PROFILE_UPDATED', profile: await profileService.updateProfile(input) });
        return true;
      } catch (error) {
        dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
        return false;
      }
    },
    updateAvatar: async (photo) => {
      const profile = stateRef.current.server.profile;
      if (!profile) return false;
      dispatch({ type: 'SERVER_BUSY', busy: true });
      dispatch({ type: 'SERVER_ERROR', error: null });
      try {
        await avatarService.upload(profile.id, photo);
        const updated = await profileService.getById(profile.id);
        if (stateRef.current.server.session?.user.id !== profile.id) return false;
        dispatch({ type: 'PROFILE_UPDATED', profile: updated });
        if (profile.avatarPath) void avatarService.removeOld(profile.avatarPath).catch(() => undefined);
        return true;
      } catch (error) {
        dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
        return false;
      } finally { dispatch({ type: 'SERVER_BUSY', busy: false }); }
    },
    removeConnection: async (connectionId) => {
      const profileId = state.server.profile?.id;
      if (!profileId) return false;
      dispatch({ type: 'SERVER_BUSY', busy: true });
      try {
        await safetyService.removeConnection(connectionId);
        await refreshAuthoritative(profileId);
        dispatch({ type: 'SERVER_MESSAGE', message: 'Connection removed.' });
        return true;
      } catch (error) {
        dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
        return false;
      }
    },
    blockUser: async (personId) => {
      const profileId = state.server.profile?.id;
      if (!profileId) return false;
      dispatch({ type: 'SERVER_BUSY', busy: true });
      try {
        await safetyService.blockUser(personId);
        await refreshAuthoritative(profileId);
        dispatch({ type: 'SERVER_MESSAGE', message: 'Person blocked.' });
        return true;
      } catch (error) {
        dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
        return false;
      }
    },
    deleteAccount: async (confirmation) => {
      dispatch({ type: 'SERVER_BUSY', busy: true });
      try {
        await accountService.deleteAccount(confirmation);
        await realtimeService.stop();
        await authService.clearLocalSession();
        dispatch({ type: 'SESSION_CLEARED' });
        return true;
      } catch (error) {
        dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
        return false;
      }
    },
    searchProfile: async (username) => {
      dispatch({ type: 'SERVER_BUSY', busy: true });
      dispatch({ type: 'SERVER_ERROR', error: null });
      try {
        const profile = await profileService.findExactUsername(username);
        if (!profile) throw new ServiceError('No profile found with that exact username.', 'profile_not_found');
        if (profile.id === state.server.profile?.id) throw new ServiceError('That is your own username.', 'self_connection');
        dispatch({ type: 'PROFILE_SEARCHED', profile });
        return profile;
      } catch (error) {
        dispatch({ type: 'PROFILE_SEARCHED', profile: null });
        dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
        return null;
      }
    },
    requestConnection: async (relationshipType) => {
      const profile = state.server.profile;
      const person = state.server.profileSearch;
      if (!profile || !person) return false;
      dispatch({ type: 'SERVER_BUSY', busy: true });
      try {
        const requested = await connectionService.request(profile.id, person, relationshipType);
        void notificationService.sendPush('connection_request', requested.connection.id).catch(() => undefined);
        const connections = await connectionService.listForUser(profile.id);
        dispatch({ type: 'CONNECTIONS_LOADED', connections });
        dispatch({ type: 'PROFILE_SEARCHED', profile: null });
        dispatch({ type: 'SERVER_MESSAGE', message: `Request sent to @${person.handle}.` });
        return true;
      } catch (error) {
        dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
        return false;
      }
    },
    acceptConnection: async (connectionId) => {
      const profile = state.server.profile;
      if (!profile) return false;
      dispatch({ type: 'SERVER_BUSY', busy: true });
      try {
        const acceptedConnection = await connectionService.accept(connectionId, profile.id);
        void notificationService.sendPush('connection_accepted', acceptedConnection.id).catch(() => undefined);
        const connections = await connectionService.listForUser(profile.id);
        dispatch({ type: 'CONNECTIONS_LOADED', connections });
        void offerNotificationPrompt(profile.id);
        return true;
      } catch (error) {
        dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message });
        return false;
      }
    },
    refreshConnections: async () => {
      const profile = state.server.profile;
      if (!profile) return;
      dispatch({ type: 'SERVER_BUSY', busy: true });
      try {
        const connections = await connectionService.listForUser(profile.id);
        dispatch({ type: 'CONNECTIONS_LOADED', connections });
        await loadActivity(profile.id, connections);
      }
      catch (error) { dispatch({ type: 'SERVER_ERROR', error: readableServiceError(error).message }); }
    },
    loadInvite: async () => {
      dispatch({ type: 'INVITE_LOADING' });
      try { dispatch({ type: 'INVITE_LOADED', invite: await inviteService.getMyInvite() }); }
      catch (error) { dispatch({ type: 'INVITE_ERROR', error: inviteService.errorMessage(error) }); }
    },
    redeemInvite: async (code, relationshipType) => {
      const normalized = code.trim().toUpperCase();
      if (!normalized) {
        dispatch({ type: 'INVITE_ERROR', error: 'Enter an invite code.' });
        return false;
      }
      if (normalized === state.server.invite?.code.toUpperCase()) {
        dispatch({ type: 'INVITE_ERROR', error: 'You cannot use your own invite code.' });
        return false;
      }
      dispatch({ type: 'INVITE_LOADING' });
      try {
        const redemption = await inviteService.redeemInvite(normalized, relationshipType);
        void notificationService.sendPush('connection_request', redemption.connectionId).catch(() => undefined);
        const profileId = state.server.profile?.id;
        if (profileId) dispatch({ type: 'CONNECTIONS_LOADED', connections: await connectionService.listForUser(profileId) });
        dispatch({ type: 'INVITE_LOADED', invite: state.server.invite });
        dispatch({ type: 'SERVER_MESSAGE', message: 'Connection request sent.' });
        return true;
      } catch (error) {
        dispatch({ type: 'INVITE_ERROR', error: inviteService.errorMessage(error) });
        return false;
      }
    },
    regenerateInvite: async () => {
      dispatch({ type: 'INVITE_LOADING' });
      try {
        dispatch({ type: 'INVITE_LOADED', invite: await inviteService.regenerateInvite() });
        dispatch({ type: 'SERVER_MESSAGE', message: 'A new invite code is ready.' });
      }
      catch (error) { dispatch({ type: 'INVITE_ERROR', error: inviteService.errorMessage(error) }); }
    },
    shareInvite: async () => {
      const invite = state.server.invite;
      if (!invite) return;
      try { await inviteService.shareInvite(invite); }
      catch (error) { dispatch({ type: 'INVITE_ERROR', error: inviteService.errorMessage(error) }); }
    },
    copyInvite: async () => {
      const invite = state.server.invite;
      if (!invite) return;
      try {
        await inviteService.copyInvite(invite);
        dispatch({ type: 'SERVER_MESSAGE', message: 'Invite code copied.' });
      } catch (error) {
        dispatch({ type: 'INVITE_ERROR', error: inviteService.errorMessage(error) });
      }
    },
    finishRecovery: () => dispatch({ type: 'RECOVERY_ACTIVE', active: false }),
    setDraftPhoto: (photo) => dispatch({ type: 'SET_DRAFT_PHOTO', photo }),
    clearDraftPhoto: () => dispatch({ type: 'CLEAR_DRAFT_PHOTO' }),
    setDraftStatus: (status) => dispatch({ type: 'SET_DRAFT_STATUS', status }),
    toggleDraftRecipient: (userId) => dispatch({ type: 'TOGGLE_DRAFT_RECIPIENT', userId }),
    setDraftRecipients: (userIds) => dispatch({ type: 'SET_DRAFT_RECIPIENTS', userIds }),
    setDraftCircles: (circleIds) => dispatch({ type: 'SET_DRAFT_CIRCLES', circleIds }),
    setDraftCaption: (caption) => dispatch({ type: 'SET_DRAFT_CAPTION', caption }),
    sendDraft: async () => {
      const profile = state.server.profile;
      const session = state.server.session;
      const draft = state.local.draft;
      if (!profile || !session || !draft.photo || draft.sending || sendingRef.current) return null;
      if (!state.server.termsStatus?.acceptedAt) {
        dispatch({ type: 'DRAFT_ERROR', error: 'Accept the Terms of Use before sharing a moment.' });
        return null;
      }
      const acceptedIds = new Set(
        state.server.connections
          .filter(({ connection }) => connection.status === 'accepted')
          .map(({ person }) => person.id),
      );
      const recipientIds = draft.recipientIds.filter((id) => acceptedIds.has(id));
      const circleIds = draft.circleIds ?? [];
      if (recipientIds.length === 0 && circleIds.length === 0) {
        dispatch({ type: 'DRAFT_ERROR', error: 'Choose at least one close person or approved circle.' });
        return null;
      }
      if (draft.caption.length > 150) {
        dispatch({ type: 'DRAFT_ERROR', error: 'Keep your caption to 150 characters or fewer.' });
        return null;
      }

      sendingRef.current = true;
      dispatch({ type: 'DRAFT_SENDING', sending: true });
      try {
        const clientRequestId = draft.clientRequestId ?? Crypto.randomUUID();
        if (!draft.clientRequestId) dispatch({ type: 'DRAFT_REQUEST_ID', id: clientRequestId });
        const { row, photoUrl } = await updateService.send({
          userId: session.user.id,
          photo: draft.photo,
          recipientIds,
          circleIds,
          caption: draft.caption,
          statusText: draft.status ? statusDetails[draft.status].label : null,
          clientRequestId,
        }, (stage) => dispatch({ type: 'DRAFT_STAGE', stage }));
        const update: MomentUpdate = {
          id: row.id,
          senderId: row.sender_id,
          sender: profile,
          recipientIds,
          circleIds,
          photoPath: row.photo_path,
          photoUrl,
          caption: row.caption,
          statusText: row.status_text,
          isQuiet: row.is_quiet,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          seenAt: null,
          reactions: [],
        };
        const responseNudgeId = draft.respondingToNudgeId;
        dispatch({ type: 'UPDATE_SENT', update });
        void notificationService.sendPush('moment', update.id).catch(() => undefined);
        void offerNotificationPrompt(profile.id);
        // The saved update is already in state. Refreshing the feed and activity
        // must not delay the success screen after the draft has been cleared.
        void Promise.allSettled([
          loadUpdates(profile.id),
          (async () => {
            if (responseNudgeId) {
              try {
                await nudgeService.markResponded(responseNudgeId, update.id);
              } catch (error) {
                if (stateRef.current.server.session?.user.id === profile.id) {
                  dispatch({ type: 'SERVER_ERROR', error: nudgeService.errorMessage(error) });
                }
              }
            }
            await loadActivity(profile.id, state.server.connections);
          })(),
        ]);
        return update.id;
      } catch (error) {
        dispatch({ type: 'DRAFT_ERROR', error: updateService.errorMessage(error) });
        return null;
      } finally {
        sendingRef.current = false;
      }
    },
    refreshUpdates: async () => {
      const profileId = state.server.profile?.id;
      if (profileId) await loadUpdates(profileId);
    },
    loadMoreUpdates: async () => {
      const profileId = state.server.profile?.id;
      if (profileId) await loadUpdates(profileId, true);
    },
    refreshActivity: async () => {
      const profileId = state.server.profile?.id;
      if (!profileId) return;
      try {
        const connections = await connectionService.listForUser(profileId);
        dispatch({ type: 'CONNECTIONS_LOADED', connections });
        await loadActivity(profileId, connections);
      } catch (error) {
        dispatch({ type: 'ACTIVITY_ERROR', userId: profileId, error: readableServiceError(error).message });
      }
    },
    loadMoreActivity: async () => {
      const profileId = state.server.profile?.id;
      if (profileId) await loadActivity(profileId, state.server.connections, true);
    },
    markActivityRead: async () => {
      const profileId = state.server.profile?.id;
      if (!profileId) return;
      try {
        const readAt = await activityService.markRead();
        dispatch({ type: 'ACTIVITY_READ', userId: profileId, readAt });
      } catch (error) {
        dispatch({ type: 'ACTIVITY_ERROR', userId: profileId, error: readableServiceError(error).message });
      }
    },
    sendNudge: async (personId) => {
      const profileId = state.server.profile?.id;
      if (!profileId) return false;
      if (!state.server.termsStatus?.acceptedAt) {
        dispatch({ type: 'SERVER_ERROR', error: 'Accept the current Terms of Use before sending a nudge.' });
        return false;
      }
      dispatch({ type: 'NUDGE_SENDING', userId: profileId, personId });
      dispatch({ type: 'SERVER_ERROR', error: null });
      try {
        const nudge = await nudgeService.send(personId);
        void notificationService.sendPush('nudge', nudge.id).catch(() => undefined);
        dispatch({ type: 'SERVER_MESSAGE', message: 'Nudge sent.' });
        return true;
      } catch (error) {
        dispatch({ type: 'SERVER_ERROR', error: nudgeService.errorMessage(error) });
        return false;
      } finally {
        dispatch({ type: 'NUDGE_SENDING', userId: profileId, personId: null });
      }
    },
    prepareNudgeResponse: (nudgeId, senderId) => dispatch({ type: 'PREPARE_NUDGE_RESPONSE', nudgeId, senderId }),
    markNudgeSeen: async (nudgeId) => {
      const profileId = state.server.profile?.id;
      if (!profileId) return;
      try {
        await nudgeService.markSeen(nudgeId);
        await loadActivity(profileId, state.server.connections);
      } catch (error) {
        dispatch({ type: 'ACTIVITY_ERROR', userId: profileId, error: nudgeService.errorMessage(error) });
      }
    },
    deleteMoment: async (updateId) => {
      const userId = stateRef.current.server.session?.user.id;
      if (!userId) throw new ServiceError('Sign in again before deleting this moment.', 'auth_required');
      await updateService.deleteOwn(updateId, userId);
      if (stateRef.current.server.session?.user.id !== userId) throw new ServiceError('Your account changed. Please try again.', 'auth_changed');
      deletedMomentsRef.current.add(`${userId}:${updateId}`);
      dispatch({ type: 'UPDATE_DELETED', userId, updateId });
      void loadUpdates(userId);
      void loadActivity(userId, stateRef.current.server.connections);
    },
    reactToUpdate: async (updateId, reactionType) => {
      const profile = state.server.profile;
      if (!profile) return false;
      if (stateRef.current.server.updates.find(update => update.id === updateId)?.senderId === profile.id) return false;
      if (!state.server.termsStatus?.acceptedAt) {
        dispatch({ type: 'SERVER_ERROR', error: 'Accept the current Terms of Use before reacting.' });
        return false;
      }
      dispatch({ type: 'REACTION_UPDATING', userId: profile.id, updateId });
      dispatch({ type: 'SERVER_ERROR', error: null });
      try {
        const row = await reactionService.set(updateId, reactionType);
        void notificationService.sendPush('reaction', row.id).catch(() => undefined);
        dispatch({ type: 'REACTION_SET', userId: profile.id, updateId, reaction: {
          id: row.id,
          updateId: row.update_id,
          userId: row.user_id,
          user: profile,
          type: row.reaction,
          createdAt: row.created_at,
        } });
        return true;
      } catch (error) {
        dispatch({ type: 'REACTION_UPDATING', userId: profile.id, updateId: null });
        dispatch({ type: 'SERVER_ERROR', error: reactionService.errorMessage(error) });
        return false;
      }
    },
    markUpdateSeen: async (updateId) => {
      const profileId = state.server.profile?.id;
      if (!profileId) return;
      const update = state.server.updates.find((item) => item.id === updateId);
      if (!update || update.senderId === profileId || update.seenAt) return;
      try {
        const seenAt = await updateService.markSeen(updateId);
        dispatch({ type: 'UPDATE_SEEN', userId: profileId, updateId, seenAt });
      } catch {
        // Seen state is best-effort and should never interrupt viewing a moment.
      }
    },
    setPreference: (key, value) => dispatch({ type: 'SET_PREFERENCE', key, value }),
    enableNotifications: async () => {
      const userId = state.server.profile?.id;
      if (!userId) return;
      dispatch({ type: 'NOTIFICATIONS_LOADING', loading: true });
      dispatch({ type: 'NOTIFICATION_ERROR', error: null });
      try {
        await AsyncStorage.setItem(notificationPromptKey(userId), 'shown');
        const permission = await notificationService.requestPermission();
        const preferences = { ...state.server.notificationPreferences, enabled: true };
        await notificationService.savePreferences(userId, preferences);
        dispatch({ type: 'NOTIFICATIONS_LOADED', userId, preferences, permission });
        dispatch({ type: 'NOTIFICATION_PROMPT', visible: false });
        if (permission === 'granted') await registerPushIfGranted(true);
        else if (permission === 'denied') dispatch({ type: 'NOTIFICATION_ERROR', error: 'Notifications are off in system settings.' });
        else if (permission === 'unavailable') dispatch({ type: 'NOTIFICATION_ERROR', error: 'Phone notifications need a configured Android build on a physical phone. In-app alerts still work.' });
      } catch (error) {
        dispatch({ type: 'NOTIFICATION_ERROR', error: readableServiceError(error).message });
      }
    },
    dismissNotificationPrompt: async () => {
      const userId = state.server.profile?.id;
      if (userId) await AsyncStorage.setItem(notificationPromptKey(userId), 'shown');
      dispatch({ type: 'NOTIFICATION_PROMPT', visible: false });
    },
    setNotificationPreference: async (key, value) => {
      const userId = state.server.profile?.id;
      if (!userId) return;
      const preferences = { ...state.server.notificationPreferences, [key]: value };
      dispatch({ type: 'NOTIFICATIONS_LOADING', loading: true });
      try {
        await notificationService.savePreferences(userId, preferences);
        const permission = await notificationService.permissionState();
        dispatch({ type: 'NOTIFICATIONS_LOADED', userId, preferences, permission });
        if (key === 'enabled' && !value) await pushTokenService.disableCurrent();
        if (key === 'enabled' && value) {
          if (permission === 'granted') await registerPushIfGranted(true);
          else if (permission !== 'unavailable') dispatch({ type: 'NOTIFICATION_PROMPT', visible: true });
        }
      } catch (error) {
        dispatch({ type: 'NOTIFICATION_ERROR', error: readableServiceError(error).message });
      }
    },
    openNotificationSettings: () => notificationService.openSettings(),
    handleNotificationSignal: async (data) => {
      const userId = stateRef.current.server.session?.user.id;
      if (!userId) return;
      if (data.type === 'moment' || data.type === 'reaction' || data.type === 'comment') await loadUpdates(userId);
      if (data.type === 'connection_request' || data.type === 'connection_accepted') await refreshAuthoritative(userId);
      else await loadActivity(userId, stateRef.current.server.connections);
    },
    prepareNotificationRoute: async (data) => {
      const userId = stateRef.current.server.session?.user.id;
      if (!userId) return false;
      if (data.type === 'moment' || data.type === 'reaction' || data.type === 'comment') {
        const visible = await updateQueries.isVisible(data.updateId);
        if (!visible) {
          dispatch({ type: 'SERVER_MESSAGE', message: 'This moment is no longer available.' });
          return false;
        }
        await loadUpdates(userId);
        return true;
      }
      if (data.type === 'nudge') {
        const nudge = await nudgeService.getPendingForReceiver(data.nudgeId, userId);
        if (!nudge || nudge.sender_id !== data.senderId) {
          dispatch({ type: 'SERVER_MESSAGE', message: 'This nudge is no longer available.' });
          await loadActivity(userId, stateRef.current.server.connections);
          return false;
        }
        dispatch({ type: 'PREPARE_NUDGE_RESPONSE', nudgeId: data.nudgeId, senderId: data.senderId });
        return true;
      }
      await refreshAuthoritative(userId);
      return true;
    },
  }), [hydrateSession, loadActivity, loadUpdates, offerNotificationPrompt, refreshAuthoritative, registerPushIfGranted, state]);

  return <AppStoreContext.Provider value={{ state, actions }}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const value = useContext(AppStoreContext);
  if (!value) throw new Error('useAppStore must be used inside AppStoreProvider');
  return value;
}

export const statusDetails: Record<UpdateStatus, { label: string; symbol: string }> = {
  studying: { label: 'Studying', symbol: '\u{1F4DA}' },
  chilling: { label: 'Chilling', symbol: '\u2615' },
  working: { label: 'Working', symbol: '\u{1F4BB}' },
  home: { label: 'Home', symbol: '\u{1F3E0}' },
  eating: { label: 'Eating', symbol: '\u{1F35C}' },
  school: { label: 'School', symbol: '\u{1F393}' },
  morning: { label: 'Good morning', symbol: '\u2600\uFE0F' },
};

export function relativeTime(isoDate: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(isoDate).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

export function clockTime(isoDate: string) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(isoDate));
}
