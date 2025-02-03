interface AppBskyFeedLike {
  subject: ComAtprotoRepoStrongRef,
  createdAt: string
}

type AppBskyFeedPost = {
  /** The primary post content. May be an empty string, if there are embeds. */
  text: string

  /** @deprecated replaced by app.bsky.richtext.facet. */
  entities?: {
    /** A text segment. Start is inclusive, end is exclusive. Indices are for utf16-encoded strings. */
    index: { start: number, end: number },

    /** Expected values are 'mention' and 'link'. */
    type: string,
    value: string
  }[],

  /** Annotations of text (mentions, URLs, hashtags, etc) */
  facets?: AppBskyRichtextFacet[]
  reply?: { root: ComAtprotoRepoStrongRef, parent: ComAtprotoRepoStrongRef },
  embed?:
  AppBskyEmbedImages |
  AppBskyEmbedVideo |
  AppBskyEmbedExternal |
  AppBskyEmbedRecord |
  AppBskyEmbedRecordWithMedia |
  { $type: string, [k: string]: unknown }
  
  /** Indicates human language of post primary text content. */
  langs?: string[],

  labels?: SelfLabels |
  { $type: string, [k: string]: unknown },

  /** Additional hashtags, in addition to any included in post text and facets. */
  tags?: string[]
  /** Client-declared timestamp when this post was originally created. */
  createdAt: string
}

type AppBskyFeedRepost = {
  subject: ComAtprotoRepoStrongRef,
  createdAt: string
}

type AppBskyFeedThreadgate = {
  /** Reference (AT-URI) to the post record. */
  post: string,

  allow?: (
    // MentionRule or FollowRule - not fully defined?
    { [k: string]: unknown } |
    // ListRule
    { list: string } |
    { $type: string, [k: string]: unknown }
  )[],

  createdAt: string,

  /** List of hidden reply URIs. */
  hiddenReplies?: string[]
}

type AppBskyGraphFollow = {
  subject: string,
  createdAt: string
}

type AppBskyGraphBlock = {
  subject: string,
  createdAt: string
}

type AppBskyGraphList = {
  purpose: 'app.bsky.graph.defs#modlist' |
    'app.bsky.graph.defs#curatelist' |
    'app.bsky.graph.defs#referencelist',

  /** Display name for list; can not be empty. */
  name: string,
  description?: string,
  descriptionFacets?: AppBskyRichtextFacet[],
  avatar?: BlobRef,
  labels?: SelfLabels | { $type: string; [k: string]: unknown },
  createdAt: string
}

type AppBskyGraphListitem = {
  /** The account which is included on the list. */
  subject: string
  /** Reference (AT-URI) to the list record (app.bsky.graph.list). */
  list: string
  createdAt: string
}

type AppBskyGraphListblock = {
  /** Reference (AT-URI) to the mod list record. */
  subject: string
  createdAt: string
}

type AppBskyActorProfile = {
  displayName?: string,
  /** Free-form profile description text. */
  description?: string,
  /** Small image to be displayed next to posts from account. AKA, 'profile picture' */
  avatar?: BlobRef,
  /** Larger horizontal image to display behind profile view. */
  banner?: BlobRef,
  labels?: SelfLabels | { $type: string, [k: string]: unknown },
  joinedViaStarterPack?: ComAtprotoRepoStrongRef,
  pinnedPost?: ComAtprotoRepoStrongRef,
  createdAt?: string
}

type AppBskyFeedGenerator = {
  did: string,
  displayName: string,
  description?: string,
  descriptionFacets?: AppBskyRichtextFacet[],
  avatar?: BlobRef,
  /** Declaration that a feed accepts feedback interactions from a client through app.bsky.feed.sendInteractions */
  acceptsInteractions?: boolean,
  labels?: SelfLabels | { $type: string, [k: string]: unknown },
  contentMode?: 'app.bsky.feed.defs#contentModeUnspecified' |
    'app.bsky.feed.defs#contentModeVideo' | (string & {})
  createdAt: string
}

type AppBskyFeedPostgate = {
  /** Reference (AT-URI) to the post record. */
  post: string
  /** List of AT-URIs embedding this post that the author has detached from. */
  detachedEmbeddingUris?: string[]
  embeddingRules?: (
    /** DisableRule: Disables embedding of this post. */
    { [k: string]: unknown } |
    { $type: string, [k: string]: unknown })[],
  createdAt: string
}

type ChatBskyActorDeclaration = {
  allowIncoming: 'all' | 'none' | 'following' | (string & {})
}

type AppBskyGraphStarterpack = {
  /** Display name for starter pack; can not be empty. */
  name: string,
  description?: string,
  descriptionFacets?: AppBskyRichtextFacet[],
  /** Reference (AT-URI) to the list record. */
  list: string,
  feeds?: { uri: string }[],
  createdAt: string
}

type SelfLabels = {
  values: {
    /** The short string name of the value or type of this label. */
    val: string
  }[]
}

type AppBskyEmbedImages = {
  images: {
    image: BlobRef,
    alt?: string,
    aspectRatio?: { width: number, height: number }
  }[]
}

type AppBskyEmbedVideo = {
  video: BlobRef,
  captions?: { lang: string, file: BlobRef }[],
  alt?: string,
  aspectRatio?: { width: number, height: number }
}

type AppBskyEmbedExternal = {
  external: { uri: string, title: string, description: string, thumb?: BlobRef }
}

type AppBskyEmbedRecord = {
  record: ComAtprotoRepoStrongRef
}

type AppBskyEmbedRecordWithMedia = {
  record: AppBskyEmbedRecord,
  media: AppBskyEmbedImages | AppBskyEmbedVideo | AppBskyEmbedExternal
}

/** Annotation of a sub-string within rich text. */
type AppBskyRichtextFacet = {
  /** Specifies the sub-string range a facet feature applies to. Start index is inclusive, end index is exclusive. Indices are zero-indexed, counting bytes of the UTF-8 encoded text. NOTE: some languages, like Javascript, use UTF-16 or Unicode codepoints for string slice indexing; in these languages, convert to byte arrays before working with facets. */
  index: { byteStart: number, byteEnd: number }
  features: (
    { did: string } |
    { uri: string } |
    { tag: string } |
    { $type: string; [k: string]: unknown })[]
}

interface ComAtprotoRepoStrongRef {
  cid: string,
  uri: string
}

type BlobRef = {
  ref: string,
  mimeType: string,
  size: number
}

interface Entity {
  index: TextSlice
  /** Expected values are 'mention' and 'link'. */
  type: string
  value: string
}

/** @deprecated Use app.bsky.richtext instead -- A text segment. Start is inclusive, end is exclusive. Indices are for utf16-encoded strings. */
interface TextSlice {
  start: number
  end: number
}
