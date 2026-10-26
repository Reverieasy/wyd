export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
  username_changed_at: string | null;
};

type ConnectionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  relationship_type: Database['public']['Enums']['relationship_type'];
  status: Database['public']['Enums']['connection_status'];
  created_at: string;
  accepted_at: string | null;
};

type UpdateRow = {
  id: string;
  sender_id: string;
  photo_path: string;
  caption: string | null;
  status_text: string | null;
  is_quiet: boolean;
  created_at: string;
  expires_at: string | null;
  client_request_id: string | null;
};

type UpdateRecipientRow = {
  update_id: string;
  recipient_id: string;
  seen_at: string | null;
};

type CircleRow = { id: string; name: string; host_id: string; created_at: string };
type CircleMemberRow = { circle_id: string; user_id: string; joined_at: string };
type CircleRequestRow = { id: string; circle_id: string; requester_id: string; status: 'pending' | 'approved' | 'declined'; created_at: string; decided_at: string | null };

type NudgeRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'responded' | 'dismissed';
  created_at: string;
  responded_at: string | null;
  response_update_id: string | null;
  seen_at: string | null;
};

type ReactionRow = {
  id: string;
  update_id: string;
  user_id: string;
  reaction: 'heart' | 'teary' | 'laugh' | 'fire' | 'eyes';
  created_at: string;
};

type ActivityReadRow = { user_id: string; last_read_at: string; updated_at: string };
type MomentCommentRow = { id: string; update_id: string; user_id: string; body: string; created_at: string };
type MomentCommentWithAuthor = MomentCommentRow & { display_name: string; username: string };

type NotificationPreferencesRow = {
  user_id: string;
  enabled: boolean;
  moments: boolean;
  nudges: boolean;
  reactions: boolean;
  comments: boolean;
  connections: boolean;
  created_at: string;
  updated_at: string;
};

type PushTokenRow = {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: 'android' | 'ios';
  device_identifier: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
};

type NotificationDeliveryRow = {
  id: string;
  event_type: 'moment' | 'nudge' | 'reaction' | 'connection_request' | 'connection_accepted';
  event_id: string;
  recipient_id: string;
  push_token_id: string;
  status: 'pending' | 'sent' | 'failed' | 'invalid_token';
  expo_ticket_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type TermsAcceptanceRow = { user_id: string; version: string; accepted_at: string };
type BlockRow = { blocker_id: string; blocked_id: string; created_at: string };
type ReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  update_id: string | null;
  kind: 'user' | 'moment';
  reason: 'harassment' | 'inappropriate' | 'spam' | 'impersonation' | 'threats' | 'other';
  details: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
};
type SupportRequestRow = {
  id: string;
  user_id: string;
  category: 'bug' | 'account' | 'safety' | 'notification' | 'other';
  details: string;
  status: 'pending' | 'reviewing' | 'resolved';
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      circles: { Row: CircleRow; Insert: Pick<CircleRow, 'name' | 'host_id'> & Partial<CircleRow>; Update: Partial<CircleRow>; Relationships: [] };
      circle_members: { Row: CircleMemberRow; Insert: CircleMemberRow; Update: Partial<CircleMemberRow>; Relationships: [] };
      circle_join_requests: { Row: CircleRequestRow; Insert: CircleRequestRow; Update: Partial<CircleRequestRow>; Relationships: [] };
      circle_updates: { Row: { circle_id: string; update_id: string }; Insert: { circle_id: string; update_id: string }; Update: { circle_id?: string; update_id?: string }; Relationships: [] };
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ProfileRow, 'id'>>;
        Relationships: [];
      };
      connections: {
        Row: ConnectionRow;
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          relationship_type: Database['public']['Enums']['relationship_type'];
          status?: Database['public']['Enums']['connection_status'];
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: Partial<Omit<ConnectionRow, 'id' | 'requester_id' | 'addressee_id'>>;
        Relationships: [];
      };
      updates: {
        Row: UpdateRow;
        Insert: {
          id?: string;
          sender_id: string;
          photo_path: string;
          caption?: string | null;
          status_text?: string | null;
          is_quiet?: boolean;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: Partial<UpdateRow>;
        Relationships: [];
      };
      update_recipients: {
        Row: UpdateRecipientRow;
        Insert: {
          update_id: string;
          recipient_id: string;
          seen_at?: string | null;
        };
        Update: Partial<UpdateRecipientRow>;
        Relationships: [];
      };
      nudges: {
        Row: NudgeRow;
        Insert: Pick<NudgeRow, 'sender_id' | 'receiver_id'> & Partial<Omit<NudgeRow, 'sender_id' | 'receiver_id'>>;
        Update: Partial<NudgeRow>;
        Relationships: [];
      };
      reactions: {
        Row: ReactionRow;
        Insert: Pick<ReactionRow, 'update_id' | 'user_id' | 'reaction'> & Partial<Omit<ReactionRow, 'update_id' | 'user_id' | 'reaction'>>;
        Update: Partial<ReactionRow>;
        Relationships: [];
      };
      moment_comments: {
        Row: MomentCommentRow;
        Insert: Pick<MomentCommentRow, 'update_id' | 'user_id' | 'body'> & Partial<Pick<MomentCommentRow, 'id' | 'created_at'>>;
        Update: Partial<MomentCommentRow>;
        Relationships: [];
      };
      activity_reads: {
        Row: ActivityReadRow;
        Insert: Pick<ActivityReadRow, 'user_id' | 'last_read_at'> & Partial<Pick<ActivityReadRow, 'updated_at'>>;
        Update: Partial<ActivityReadRow>;
        Relationships: [];
      };
      notification_preferences: {
        Row: NotificationPreferencesRow;
        Insert: Pick<NotificationPreferencesRow, 'user_id'> & Partial<Omit<NotificationPreferencesRow, 'user_id'>>;
        Update: Partial<Omit<NotificationPreferencesRow, 'user_id'>>;
        Relationships: [];
      };
      push_tokens: {
        Row: PushTokenRow;
        Insert: Pick<PushTokenRow, 'user_id' | 'expo_push_token' | 'platform'> & Partial<Omit<PushTokenRow, 'user_id' | 'expo_push_token' | 'platform'>>;
        Update: Partial<Omit<PushTokenRow, 'id'>>;
        Relationships: [];
      };
      notification_deliveries: {
        Row: NotificationDeliveryRow;
        Insert: Pick<NotificationDeliveryRow, 'event_type' | 'event_id' | 'recipient_id' | 'push_token_id'> & Partial<Omit<NotificationDeliveryRow, 'event_type' | 'event_id' | 'recipient_id' | 'push_token_id'>>;
        Update: Partial<Omit<NotificationDeliveryRow, 'id'>>;
        Relationships: [];
      };
      terms_acceptances: {
        Row: TermsAcceptanceRow;
        Insert: Pick<TermsAcceptanceRow, 'user_id' | 'version'> & Partial<Pick<TermsAcceptanceRow, 'accepted_at'>>;
        Update: Partial<TermsAcceptanceRow>;
        Relationships: [];
      };
      blocks: {
        Row: BlockRow;
        Insert: Pick<BlockRow, 'blocker_id' | 'blocked_id'> & Partial<Pick<BlockRow, 'created_at'>>;
        Update: Partial<BlockRow>;
        Relationships: [];
      };
      reports: {
        Row: ReportRow;
        Insert: Pick<ReportRow, 'reporter_id' | 'reported_user_id' | 'kind' | 'reason'> & Partial<Omit<ReportRow, 'reporter_id' | 'reported_user_id' | 'kind' | 'reason'>>;
        Update: Partial<ReportRow>;
        Relationships: [];
      };
      support_requests: {
        Row: SupportRequestRow;
        Insert: Pick<SupportRequestRow, 'user_id' | 'category' | 'details'> & Partial<Omit<SupportRequestRow, 'user_id' | 'category' | 'details'>>;
        Update: Partial<SupportRequestRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      list_comment_notifications: { Args: { p_before_created_at?: string; p_limit?: number }; Returns: { id: string; update_id: string; user_id: string; created_at: string; display_name: string; username: string; avatar_path: string | null }[] };
      list_moment_comments: { Args: { p_update_id: string; p_before_created_at?: string; p_before_id?: string; p_limit?: number }; Returns: MomentCommentWithAuthor[] };
      add_moment_comment: { Args: { p_update_id: string; p_body: string; p_id: string }; Returns: string };
      delete_moment_comment: { Args: { p_update_id: string; p_id: string }; Returns: boolean };
      circle_action: { Args: { p_action: string; p_circle_id?: string; p_name?: string; p_code?: string; p_request_id?: string; p_user_id?: string }; Returns: Json };
      create_circle_update: { Args: { p_photo_path: string; p_recipient_ids: string[]; p_circle_ids: string[]; p_client_request_id: string; p_caption?: string | null; p_status_text?: string | null; p_is_quiet?: boolean }; Returns: UpdateRow[] };
      is_username_available: { Args: { p_username: string }; Returns: boolean };
      update_profile_v2: { Args: { p_username: string; p_display_name: string; p_bio: string }; Returns: ProfileRow[] };
      get_my_profile_stats: { Args: Record<PropertyKey, never>; Returns: { moments: number; moments_this_month: number; reactions: number }[] };
      get_my_invite: {
        Args: Record<PropertyKey, never>;
        Returns: { code: string; expires_at: string }[];
      };
      regenerate_invite: {
        Args: Record<PropertyKey, never>;
        Returns: { code: string; expires_at: string }[];
      };
      redeem_invite: {
        Args: {
          p_code: string;
          p_relationship_type: Database['public']['Enums']['relationship_type'];
        };
        Returns: {
          connection_id: string;
          invited_user_id: string;
          connection_status: 'pending';
        }[];
      };
      create_update: {
        Args: {
          p_photo_path: string;
          p_recipient_ids: string[];
          p_caption?: string | null;
          p_status_text?: string | null;
          p_is_quiet?: boolean;
        };
        Returns: UpdateRow[];
      };
      create_update_v2: {
        Args: {
          p_photo_path: string;
          p_recipient_ids: string[];
          p_client_request_id: string;
          p_caption?: string | null;
          p_status_text?: string | null;
          p_is_quiet?: boolean;
        };
        Returns: UpdateRow[];
      };
      list_visible_updates: {
        Args: { p_cursor_created_at?: string | null; p_cursor_id?: string | null; p_limit?: number };
        Returns: UpdateRow[];
      };
      send_nudge: {
        Args: { p_recipient_id: string };
        Returns: NudgeRow[];
      };
      mark_nudge_seen: {
        Args: { p_nudge_id: string };
        Returns: NudgeRow[];
      };
      mark_nudge_responded: {
        Args: { p_nudge_id: string; p_update_id: string };
        Returns: NudgeRow[];
      };
      set_reaction: {
        Args: { p_update_id: string; p_reaction: ReactionRow['reaction'] };
        Returns: ReactionRow[];
      };
      mark_update_seen: {
        Args: { p_update_id: string };
        Returns: string;
      };
      mark_activity_read: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      register_push_token: {
        Args: { p_expo_push_token: string; p_platform: string; p_device_identifier?: string | null };
        Returns: Pick<PushTokenRow, 'id' | 'expo_push_token' | 'platform' | 'enabled' | 'last_seen_at'>[];
      };
      disable_push_token: {
        Args: { p_expo_push_token: string };
        Returns: boolean;
      };
      get_terms_status: {
        Args: Record<PropertyKey, never>;
        Returns: { current_version: string; accepted_at: string | null }[];
      };
      accept_terms: {
        Args: { p_version: string };
        Returns: string;
      };
      find_profile_by_username: {
        Args: { p_username: string };
        Returns: ProfileRow[];
      };
      update_profile: {
        Args: { p_username: string; p_display_name: string };
        Returns: ProfileRow[];
      };
      update_avatar: {
        Args: { p_path: string | null };
        Returns: undefined;
      };
      remove_connection: {
        Args: { p_connection_id: string };
        Returns: boolean;
      };
      block_user: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      unblock_user: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      list_blocked_users: {
        Args: Record<PropertyKey, never>;
        Returns: (ProfileRow & { blocked_at: string })[];
      };
      report_user: {
        Args: { p_user_id: string; p_reason: ReportRow['reason']; p_details?: string | null };
        Returns: string;
      };
      report_moment: {
        Args: { p_update_id: string; p_reason: ReportRow['reason']; p_details?: string | null };
        Returns: string;
      };
      submit_support_request: {
        Args: { p_category: SupportRequestRow['category']; p_details: string };
        Returns: string;
      };
    };
    Enums: {
      relationship_type: 'partner' | 'best_friend' | 'family' | 'friend';
      connection_status: 'pending' | 'accepted' | 'blocked';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRowType = ProfileRow;
export type ConnectionRowType = ConnectionRow;
export type UpdateRowType = UpdateRow;
export type UpdateRecipientRowType = UpdateRecipientRow;
export type NudgeRowType = NudgeRow;
export type ReactionRowType = ReactionRow;
