import type { ColumnType, Generated } from 'kysely'

// pg returns numeric as string
type NumericDefault = ColumnType<string, number | string | undefined, number | string>
type NumericNullable = ColumnType<
  string | null,
  number | string | null | undefined,
  number | string | null
>

export type UserRole = 'concert_goer' | 'artist' | 'venue_owner'
export type WigStatusValue = 'going' | 'not_going' | 'maybe'
export type PostReactionType = 'like' | 'dislike'
export type MediaType = 'photo' | 'video'

export interface UsersTable {
  user_id: Generated<number>
  role: UserRole
  email: string
  username: string
  location: string | null
}

export interface ConversationTable {
  conversation_id: Generated<number>
  is_group: Generated<boolean>
  name: string | null
}

export interface ArtistTable {
  artist_id: Generated<number>
  user_id: number
  name: string
  bio: string | null
}

export interface VenueTable {
  venue_id: Generated<number>
  owner_id: number
  name: string
  address: string
  city: string
  open_to_talent: Generated<boolean>
  latitude: NumericNullable
  longitude: NumericNullable
}

export interface ConcertTable {
  concert_id: Generated<number>
  venue_id: number
  title: string
  date: Date
  ticket_price: NumericDefault
}

export interface ConcertArtistTable {
  concert_id: number
  artist_id: number
}

export interface BookingTable {
  booking_id: Generated<number>
  venue_id: number
  artist_id: number
  concert_id: number | null
  status: Generated<string>
  pay_terms: string | null
  created_at: Generated<Date>
}

export interface TicketTable {
  ticket_id: Generated<number>
  concert_id: number
  user_id: number
  created_at: Generated<Date>
}

export interface WigStatusTable {
  user_id: number
  concert_id: number
  status: WigStatusValue
}

export interface RatingTable {
  rating_id: Generated<number>
  user_id: number
  concert_id: number
  stars: number
}

export interface PostTable {
  post_id: Generated<number>
  author_id: number
  concert_id: number
  body: string
  created_at: Generated<Date>
}

export interface CommentTable {
  comment_id: Generated<number>
  post_id: number
  user_id: number
  parent_comment_id: number | null
  body: string
  created_at: Generated<Date>
}

export interface PostReactionTable {
  user_id: number
  post_id: number
  type: PostReactionType
}

export interface MediaTable {
  media_id: Generated<number>
  uploader_id: number
  concert_id: number | null
  venue_id: number | null
  type: MediaType
  url: string
}

export interface LiveChatMessageTable {
  message_id: Generated<number>
  concert_id: number
  user_id: number
  body: string
  sent_at: Generated<Date>
}

export interface ConversationMemberTable {
  conversation_id: number
  user_id: number
}

export interface PrivateMessageTable {
  message_id: Generated<number>
  conversation_id: number
  sender_id: number
  body: string
  sent_at: Generated<Date>
}

export interface Database {
  users: UsersTable
  conversation: ConversationTable
  artist: ArtistTable
  venue: VenueTable
  concert: ConcertTable
  concert_artist: ConcertArtistTable
  booking: BookingTable
  ticket: TicketTable
  wig_status: WigStatusTable
  rating: RatingTable
  post: PostTable
  comment: CommentTable
  post_reaction: PostReactionTable
  media: MediaTable
  live_chat_message: LiveChatMessageTable
  conversation_member: ConversationMemberTable
  private_message: PrivateMessageTable
}