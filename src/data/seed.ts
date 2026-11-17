/**
 * Local seed used while the backend is out of scope.
 * Replace `store.tsx`'s initial state with API calls when the backend lands.
 */
import type { AppNotification, Bading, Comment, CustomSticker, User } from './types';

const min = 60_000;
const h = 60 * min;
const d = 24 * h;
const now = Date.now();

export const ME_ID = 'me';

export const seedUsers: User[] = [
  { id: 'u1', pseudo: 'Koffi225', verified: false, hue: 28, joinedAt: now - 90 * d },
  { id: 'u2', pseudo: 'AwaLaGo', verified: false, hue: 330, joinedAt: now - 60 * d },
  { id: 'u3', pseudo: 'LeVraiZoba', verified: true, hue: 200, joinedAt: now - 300 * d },
  { id: 'u4', pseudo: 'Tantie_Brou', verified: false, hue: 140, joinedAt: now - 40 * d },
  { id: 'u5', pseudo: 'Djidji_Kpakpato', verified: false, hue: 52, joinedAt: now - 20 * d },
  { id: 'u6', pseudo: 'YopougonFM', verified: true, hue: 265, joinedAt: now - 400 * d },
];

export const seedBadings: Bading[] = [
  {
    id: 'b1',
    authorId: 'u1',
    anonymous: false,
    text: "Gbaka m'a déposé devant la maison, j'ai dit merci au chauffeur comme si c'était un taxi privé. Tout le gbaka a applaudi. Je suis descendu en marchant comme ministre 😭",
    createdAt: now - 12 * min,
    likes: 248,
    likedByMe: false,
    rebades: 31,
    shares: 54,
  },
  {
    id: 'b2',
    authorId: 'u2',
    anonymous: true,
    text: "J'ai envoyé « ma chérie tu me manques » dans le groupe de la famille au lieu de l'envoyer à mon gars. Papa a répondu « moi aussi ». Depuis on ne parle plus de ça.",
    createdAt: now - 47 * min,
    likes: 1032,
    likedByMe: true,
    rebades: 120,
    shares: 410,
  },
  {
    id: 'b3',
    authorId: 'u4',
    anonymous: false,
    rebadeOf: 'b2',
    text: 'Le « moi aussi » de papa là, c\'est la phrase la plus dangereuse de 2026 💀',
    createdAt: now - 30 * min,
    likes: 87,
    likedByMe: false,
    rebades: 0,
    shares: 4,
  },
  {
    id: 'b4',
    authorId: 'u3',
    anonymous: false,
    text: "Coupure de courant à 21h. Tout le quartier sort. Courant revient. Tout le monde crie « ÉHHH » comme si la Côte d'Ivoire venait de marquer. On est un peuple simple.",
    createdAt: now - 2 * h,
    likes: 3410,
    likedByMe: false,
    rebades: 402,
    shares: 1290,
  },
  {
    id: 'b5',
    authorId: 'u5',
    anonymous: false,
    text: "Au maquis j'ai commandé « comme d'habitude ». La serveuse m'a regardé. C'était ma première fois là-bas. Elle m'a amené attiéké poisson quand même. Elle me connaît mieux que moi.",
    createdAt: now - 5 * h,
    likes: 512,
    likedByMe: false,
    rebades: 18,
    shares: 77,
  },
  {
    id: 'b6',
    authorId: 'u6',
    anonymous: false,
    rebadeOf: 'b4',
    text: '',
    createdAt: now - 6 * h,
    likes: 40,
    likedByMe: false,
    rebades: 0,
    shares: 2,
  },
  {
    id: 'b7',
    authorId: 'u1',
    anonymous: true,
    text: "Ma mère m'a demandé de « regarder » la sauce sur le feu. J'ai regardé. Littéralement. Elle a brûlé pendant que je regardais. Elle a dit que je suis intelligent pour rien.",
    createdAt: now - 1 * d,
    likes: 2201,
    likedByMe: false,
    rebades: 260,
    shares: 640,
  },
];

export const seedNotifications: AppNotification[] = [
  { id: 'n1', kind: 'like', actorId: 'u1', others: 12, badingId: 'm1', createdAt: now - 8 * min, read: false },
  { id: 'n2', kind: 'mention', actorId: null, badingId: 'b5', createdAt: now - 40 * min, read: false },
  { id: 'n3', kind: 'rebade', actorId: 'u3', badingId: 'm1', createdAt: now - 3 * h, read: true },
  { id: 'n4', kind: 'badge', actorId: null, badgeStatus: 'refused', createdAt: now - 3 * d, read: true },
];

export const seedMyBadings: Bading[] = [
  {
    id: 'm1',
    authorId: ME_ID,
    anonymous: false,
    text: "J'ai dit à mon patron que j'étais malade. Il m'a vu au match le soir à la télé, au premier rang, en train de danser. Lundi il m'a demandé si le docteur était bon.",
    createdAt: now - 3 * h,
    likes: 13,
    likedByMe: false,
    rebades: 2,
    shares: 1,
  },
  {
    id: 'm2',
    authorId: ME_ID,
    anonymous: true,
    text: "J'ai fait semblant de comprendre l'anglais pendant toute une réunion. À la fin on m'a demandé de faire le résumé.",
    createdAt: now - 2 * d,
    likes: 64,
    likedByMe: false,
    rebades: 5,
    shares: 9,
  },
];

/** Badings that "arrive" on pull-to-refresh, one or two at a time. */
export const incomingBadings: Bading[] = [
  {
    id: 'n-1',
    authorId: 'u2',
    anonymous: false,
    text: "Mon voisin a mis la musique à fond à 6h du matin. Je suis allé me plaindre. Il m'a donné une bière. Maintenant on danse ensemble à 6h.",
    createdAt: 0,
    likes: 3,
    likedByMe: false,
    rebades: 0,
    shares: 0,
  },
  {
    id: 'n-2',
    authorId: 'u5',
    anonymous: true,
    text: "Le woro-woro m'a demandé la monnaie de 10 000. J'ai dit que j'ai pas. Il a sorti la monnaie de 10 000 de sa poche pour me montrer qu'il en a, lui.",
    createdAt: 0,
    likes: 9,
    likedByMe: false,
    rebades: 1,
    shares: 0,
  },
  {
    id: 'n-3',
    authorId: 'u3',
    anonymous: false,
    text: "Ma tante a envoyé un vocal de 7 minutes pour dire « ok ». Les 6 premières minutes c'était le bruit du marché.",
    createdAt: 0,
    likes: 21,
    likedByMe: false,
    rebades: 2,
    shares: 3,
  },
];

export const seedComments: Comment[] = [
  { id: 'c1', badingId: 'b4', authorId: 'u2', text: "Le « ÉHHH » collectif c'est notre hymne national bis 😭", createdAt: now - 90 * min, parentId: null, likes: 42, likedByMe: false },
  { id: 'c2', badingId: 'b4', authorId: 'u1', text: 'Et après tout le monde rentre comme si de rien était', createdAt: now - 70 * min, parentId: 'c1', replyTo: 'AwaLaGo', likes: 8, likedByMe: false },
  { id: 'c3', badingId: 'b4', authorId: 'u5', text: "Chez nous on applaudit même le frigo quand il redémarre", createdAt: now - 40 * min, parentId: null, likes: 17, likedByMe: false },
  { id: 'c4', badingId: 'b1', authorId: 'u4', text: 'Ministre de la gbaka 😂', createdAt: now - 8 * min, parentId: null, likes: 5, likedByMe: false },
  { id: 'c8', badingId: 'b4', authorId: 'u6', text: '', sticker: 'ehhh', createdAt: now - 55 * min, parentId: null, likes: 23, likedByMe: false },
  { id: 'c9', badingId: 'b4', authorId: 'u1', text: '', sticker: 'us1', createdAt: now - 50 * min, parentId: 'c1', replyTo: 'AwaLaGo', likes: 6, likedByMe: false },
  { id: 'c10', badingId: 'b1', authorId: 'u2', text: '', sticker: 'us2', createdAt: now - 6 * min, parentId: null, likes: 14, likedByMe: false },
  { id: 'c11', badingId: 'b1', authorId: 'u6', text: '', sticker: 'us3', createdAt: now - 4 * min, parentId: null, likes: 3, likedByMe: false },
  { id: 'c5', badingId: 'b2', authorId: 'u3', text: 'Papa a vu, papa a compris, papa a validé.', createdAt: now - 30 * min, parentId: null, likes: 64, likedByMe: false },
  { id: 'c6', badingId: 'b2', authorId: 'u6', text: 'On veut la suite de cette histoire', createdAt: now - 20 * min, parentId: 'c5', replyTo: 'LeVraiZoba', likes: 3, likedByMe: false },
  { id: 'c7', badingId: 'm1', authorId: 'u3', text: 'Le docteur était bon ou pas finalement ? 😭', createdAt: now - 2 * h, parentId: null, likes: 11, likedByMe: false },
];

/** Stickers personnels de démo (créés par d'autres Badeurs), pour tester « Enregistrer le sticker ». */
export const seedCustomStickers: CustomSticker[] = [
  { id: 'us1', ownerId: 'u1', label: "Gbaka boss", createdAt: now - 3 * 86_400_000, svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><rect x=\"16\" y=\"16\" width=\"480\" height=\"480\" rx=\"96\" fill=\"#ffb547\"/><rect x=\"70\" y=\"150\" width=\"372\" height=\"190\" rx=\"40\" fill=\"#1a1919\"/><rect x=\"100\" y=\"180\" width=\"70\" height=\"60\" rx=\"10\" fill=\"#5ab0ff\"/><rect x=\"190\" y=\"180\" width=\"70\" height=\"60\" rx=\"10\" fill=\"#5ab0ff\"/><rect x=\"280\" y=\"180\" width=\"70\" height=\"60\" rx=\"10\" fill=\"#5ab0ff\"/><rect x=\"370\" y=\"180\" width=\"44\" height=\"60\" rx=\"10\" fill=\"#5ab0ff\"/><circle cx=\"150\" cy=\"345\" r=\"38\" fill=\"#1a1919\" stroke=\"#ffb547\" stroke-width=\"14\"/><circle cx=\"362\" cy=\"345\" r=\"38\" fill=\"#1a1919\" stroke=\"#ffb547\" stroke-width=\"14\"/><text x=\"256\" y=\"120\" text-anchor=\"middle\" font-family=\"Arial Black, Arial, sans-serif\" font-weight=\"900\" font-size=\"70\" fill=\"#1a1919\">GBAKA</text><text x=\"256\" y=\"455\" text-anchor=\"middle\" font-family=\"Arial Black, Arial, sans-serif\" font-weight=\"900\" font-size=\"64\" fill=\"#1a1919\">BOSS</text></svg>" },
  { id: 'us2', ownerId: 'u2', label: "Tantie a dit non", createdAt: now - 4 * 86_400_000, svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><rect x=\"16\" y=\"16\" width=\"480\" height=\"480\" rx=\"96\" fill=\"#ff6fa8\"/><circle cx=\"256\" cy=\"230\" r=\"140\" fill=\"#8a4b2a\"/><path d=\"M116 210 Q256 40 396 210 Q330 130 256 140 Q182 130 116 210Z\" fill=\"#1a1919\"/><path d=\"M180 205 l50 18 M332 205 l-50 18\" stroke=\"#1a1919\" stroke-width=\"14\" stroke-linecap=\"round\"/><circle cx=\"208\" cy=\"240\" r=\"14\" fill=\"#1a1919\"/><circle cx=\"304\" cy=\"240\" r=\"14\" fill=\"#1a1919\"/><path d=\"M206 305 Q256 280 306 305\" stroke=\"#1a1919\" stroke-width=\"14\" fill=\"none\" stroke-linecap=\"round\"/><text x=\"256\" y=\"455\" text-anchor=\"middle\" font-family=\"Arial Black, Arial, sans-serif\" font-weight=\"900\" font-size=\"72\" fill=\"#1a1919\">NON !</text></svg>" },
  { id: 'us3', ownerId: 'u6', label: "Yop City", createdAt: now - 5 * 86_400_000, svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><rect x=\"16\" y=\"16\" width=\"480\" height=\"480\" rx=\"96\" fill=\"#9810e6\"/><rect x=\"70\" y=\"250\" width=\"70\" height=\"170\" fill=\"#ede3fa\"/><rect x=\"155\" y=\"190\" width=\"80\" height=\"230\" fill=\"#ffffff\"/><rect x=\"250\" y=\"230\" width=\"70\" height=\"190\" fill=\"#ede3fa\"/><rect x=\"335\" y=\"170\" width=\"90\" height=\"250\" fill=\"#ffffff\"/><circle cx=\"390\" cy=\"105\" r=\"42\" fill=\"#ffb547\"/><text x=\"256\" y=\"130\" text-anchor=\"middle\" font-family=\"Arial Black, Arial, sans-serif\" font-weight=\"900\" font-size=\"74\" fill=\"#ffffff\">YOP</text><text x=\"256\" y=\"480\" text-anchor=\"middle\" font-family=\"Arial Black, Arial, sans-serif\" font-weight=\"900\" font-size=\"54\" fill=\"#ffffff\">CITY</text></svg>" },
];
