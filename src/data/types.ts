export type User = {
  id: string;
  pseudo: string;
  verified: boolean;
  /** Couleur de l'initiale quand il n'y a pas de photo. */
  hue: number;
  /** Photo de profil (fichier local recadré en carré, 400 px). En prod : URL du CDN. */
  photo?: string;
  joinedAt: number;
  /** Mon profil seulement : prénom et nom (privés), date (ms) du prochain changement de pseudo possible (0 = tout de suite). */
  firstName?: string;
  lastName?: string;
  pseudoChangeableAt?: number;
  /** BadeScore (profil) : toute l'activité depuis l'inscription, calculée par le serveur (badings signés seulement). */
  badeScore?: BadeScore;
};

export type BadeScore = { score: number; level: string; levelIndex: number; from: number; next: number | null; nextLevel: string | null };

/** Image d'un bading, déjà recadrée et compressée (F1 RG2). */
export type BadingImage = { uri: string; width: number; height: number };

/**
 * Sticker créé par un utilisateur (F8) : image carrée (`uri`) ou dessin vectoriel (`svg`, stickers de démo).
 * Les stickers intégrés d'On Bade sont dans `stickers.ts`.
 */
export type CustomSticker = { id: string; ownerId: string; createdAt: number; uri?: string; svg?: string; label?: string; removed?: boolean };

export type Bading = {
  id: string;
  authorId: string;
  anonymous: boolean;
  text: string;
  createdAt: number;
  likes: number;
  likedByMe: boolean;
  rebades: number;
  shares: number;
  /** When set, this post is a rebade of `rebadeOf`; `text` is the optional opinion. */
  rebadeOf?: string;
  deleted?: boolean;
  image?: BadingImage;
  /** Nombre d'ouvertures du bading (visible par son auteur et dans la copie de ses données). */
  views?: number;
  /** Envoyé par le serveur : le fil l'affiche sans avoir chargé les commentaires. */
  commentCount?: number;
};

export type Comment = {
  id: string;
  badingId: string;
  authorId: string;
  text: string;
  createdAt: number;
  /** Commentaire auquel on répond : les réponses forment un arbre, sans limite de niveau. */
  parentId: string | null;
  /** Pseudo being answered, shown as « en réponse à @x ». */
  replyTo?: string;
  likes: number;
  likedByMe: boolean;
  deleted?: boolean;
  /** Commentaire-sticker : id d'un sticker intégré ou personnel (le texte est alors vide). */
  sticker?: string;
  /** Note vocale (le texte est alors vide) : adresse du son, durée et forme d'onde (barres de 0 à 100). */
  audio?: VoiceClip;
};

export type NotificationKind = 'like' | 'rebade' | 'mention' | 'badge' | 'comment' | 'reply'
  /** Messages de l'équipe On Bade : annonce à tous, message personnel, avertissement. */
  | 'announcement' | 'admin_message' | 'warning';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  /** null = anonymous actor */
  actorId: string | null;
  others?: number;
  badingId?: string;
  /** accepted = demande validée, granted = badge attribué directement par l'admin, refused = demande refusée. */
  badgeStatus?: 'accepted' | 'granted' | 'refused';
  /** Commentaire concerné (commentaire, réponse, mention dans un commentaire) : la notification l'ouvre. */
  commentId?: string;
  /** Messages de l'équipe : titre (facultatif) et texte. */
  title?: string;
  body?: string;
  createdAt: number;
  read: boolean;
};

export type MentionPolicy = 'everyone' | 'nobody';

/** Note vocale d'un commentaire. */
export type VoiceClip = { src: string; durationMs: number; waveform: number[] };
/** Note vocale enregistrée, prête à être envoyée (data URL base64). */
export type VoiceRecording = { dataUrl: string; durationMs: number; waveform: number[] };
