'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { soundFX } from '@/lib/sounds';

export type Language = 'en' | 'th';

export interface Translations {
  [key: string]: {
    en: string;
    th: string;
  };
}

export const TRANSLATIONS: Translations = {
  // Navigation & General
  siteTitle: { en: 'BoardgameZaa', th: 'BoardgameZaa' },
  freeMultiplayer: { en: 'Free • Multiplayer', th: 'ฟรี • เล่นออนไลน์กับเพื่อน' },
  audioMute: { en: 'Mute Audio', th: 'ปิดเสียง' },
  audioUnmute: { en: 'Unmute Audio', th: 'เปิดเสียง' },
  rules: { en: 'Rules', th: 'กติกา' },
  backHome: { en: 'Back to Home', th: 'กลับหน้าแรก' },
  lobby: { en: 'Lobby', th: 'หน้าห้อง' },
  endGame: { en: 'End Game', th: 'จบเกม' },
  close: { en: 'Close', th: 'ปิด' },
  cancel: { en: 'Cancel', th: 'ยกเลิก' },
  saveChanges: { en: 'Save Changes', th: 'บันทึก' },
  copied: { en: 'Copied!', th: 'คัดลอกแล้ว!' },
  copy: { en: 'Copy', th: 'คัดลอก' },
  settings: { en: 'Settings', th: 'ตั้งค่า' },
  preferences: { en: 'Preferences', th: 'การตั้งค่า' },
  leaveRoom: { en: 'Leave Room', th: 'ออกจากห้อง' },
  loading: { en: 'Loading...', th: 'กำลังโหลด...' },

  // Hero Section (Home)
  heroTitle: {
    en: 'Play board games with friends online.',
    th: 'เล่นบอร์ดเกมออนไลน์กับเพื่อนได้ทันที',
  },
  heroSubtitle: {
    en: 'Direct room links. Instant setup with no downloads or sign-ups required. Open a table, share the code, and start playing.',
    th: 'แชร์ลิงก์เข้าห้องเล่นได้ทันที ไม่ต้องดาวน์โหลด ไม่ต้องสมัครสมาชิก เปิดโต๊ะ ส่งรหัส แล้วเริ่มเล่นกับเพื่อนได้เลย',
  },

  // Profile Strip (Home)
  yourProfile: { en: 'YOUR IDENTITY', th: 'โปรไฟล์ของคุณ' },
  nickname: { en: 'Your Nickname', th: 'ชื่อเล่นของคุณ' },
  nicknamePlaceholder: { en: 'Player name...', th: 'กรอกชื่อเล่นของคุณ...' },
  chooseAvatar: { en: 'Choose Avatar', th: 'เลือกอวตาร' },
  orDirectJoin: { en: 'JOIN EXISTING TABLE', th: 'เข้าร่วมห้องที่มีอยู่' },
  roomCodePlaceholder: {
    en: 'ROOM CODE',
    th: 'รหัสห้อง',
  },
  joinButton: { en: 'Join', th: 'เข้าห้อง' },
  hostNewTable: { en: 'Host New Table', th: 'สร้างห้องใหม่' },
  joining: { en: 'Joining...', th: 'กำลังเข้าห้อง...' },
  creating: { en: 'Creating Table...', th: 'กำลังสร้างห้อง...' },

  // Game Library / Filter (Home)
  allGames: { en: 'ALL GAMES', th: 'คลังเกมทั้งหมด' },
  availableTitles: { en: 'Available Titles', th: 'เกมที่พร้อมให้เล่น' },
  exploreSubtitle: {
    en: 'Select any game to host a private match with your rules.',
    th: 'เลือกเกมที่ต้องการเพื่อสร้างห้องเล่นกับเพื่อนตามกติกาที่คุณเลือก',
  },
  tagAll: { en: 'All', th: 'ทั้งหมด' },
  tagCoop: { en: 'Cooperative', th: 'ร่วมมือกัน' },
  tagBluff: { en: 'Social Deduction', th: 'บลัฟ & จับโกหก' },
  tagStrategy: { en: 'Strategy', th: 'วางแผนกลยุทธ์' },
  tagParty: { en: 'Party', th: 'ปาร์ตี้เฮฮา' },
  howItWorks: { en: 'How it works', th: 'วิธีเล่น' },
  hideRulesAccordion: { en: 'Hide rules', th: 'ซ่อนวิธีเล่น' },
  playBtn: { en: 'Play', th: 'เล่น' },
  hostTable: { en: 'Host Table', th: 'สร้างห้องเกมนี้' },
  viewRules: { en: 'Rules & Info', th: 'ดูกติกา' },
  hideRules: { en: 'Hide Rules', th: 'ซ่อนกติกา' },
  players: { en: 'players', th: 'คน' },
  min: { en: 'min', th: 'นาที' },

  // Room Lobby
  roomCode: { en: 'Room Code', th: 'รหัสห้อง' },
  shareCodeHint: {
    en: 'Share code or invite link to join this room.',
    th: 'แชร์รหัสห้องหรือส่งลิงก์ชวนเพื่อนเข้าร่วมห้องนี้',
  },
  copyLink: { en: 'Copy Link', th: 'คัดลอกลิงก์' },
  linkCopied: { en: 'Link Copied!', th: 'คัดลอกลิงก์แล้ว!' },
  addBot: { en: '+ Add Bot', th: '+ เพิ่มบอท' },
  selectGame: { en: 'Select Game', th: 'เลือกเกม' },
  hostSelectsGame: {
    en: 'As Table Host, choose which game to play.',
    th: 'ในฐานะหัวหน้าห้อง เลือกเกมที่ต้องการเล่น',
  },
  guestWaitingGame: {
    en: 'The Table Host selects the active game.',
    th: 'หัวหน้าห้องกำลังเลือกเกม...',
  },
  tablePlayers: { en: 'Players', th: 'ผู้เล่นในห้อง' },
  hostBadge: { en: 'Host', th: 'หัวหน้าห้อง' },
  youBadge: { en: 'You', th: 'คุณ' },
  editProfile: { en: 'Edit profile', th: 'แก้ไขโปรไฟล์' },
  editProfileTitle: { en: 'Edit Your Profile', th: 'แก้ไขโปรไฟล์ของคุณ' },
  kick: { en: 'Kick', th: 'เตะออก' },
  ready: { en: 'Ready', th: 'พร้อม' },
  waiting: { en: 'Waiting', th: 'กำลังรอ' },
  notReady: { en: 'Not Ready', th: 'ยังไม่พร้อม' },
  setReadyBtn: { en: 'Mark Ready', th: 'กดพร้อม' },
  cancelReadyBtn: { en: 'Cancel Ready', th: 'ยกเลิกพร้อม' },
  startGameBtn: { en: 'Start Match', th: 'เริ่มเกมเลย!' },
  waitingForHost: {
    en: 'Waiting for host to start...',
    th: 'รอหัวหน้าห้องเริ่มเกม...',
  },
  allMustBeReady: {
    en: 'All players must be ready',
    th: 'ผู้เล่นทุกคนต้องกดพร้อมก่อน',
  },
  needMinPlayers: {
    en: 'Need at least {min} players',
    th: 'ต้องมีผู้เล่นอย่างน้อย {min} คน',
  },
  needPlayersToStart: {
    en: 'Need {min} players to start (currently {curr}).',
    th: 'ต้องมีผู้เล่นอย่างน้อย {min} คน (ปัจจุบัน {curr} คน)',
  },
  maxPlayersExceeded: {
    en: 'Maximum {max} players',
    th: 'ผู้เล่นเกินกำหนด (สูงสุด {max} คน)',
  },
  gameSettings: { en: 'Game Settings', th: 'ตั้งค่าเกม' },
  gameSettingsDesc: {
    en: 'Configure timers, game modes & variants',
    th: 'ปรับแต่งเวลา โหมด และกติกาพิเศษ',
  },
  sendChatPlaceholder: {
    en: 'Type a message to squad...',
    th: 'พิมพ์ข้อความคุยกับเพื่อน...',
  },

  // Game Names & Descriptions
  'game_kakerlaken-poker_name': { en: 'Kakerlaken Poker', th: 'โป๊กเกอร์แมลงสาบ' },
  'game_kakerlaken-poker_desc': {
    en: 'Bluff and pass pest cards face-down. Avoid collecting 4 identical critters or running out of cards!',
    th: 'เกมบลัฟจับโกหกสุดมันส์ ส่งการ์ดคว่ำทายใจเพื่อน ใครสะสมสัตว์ซ้ำครบ 4 ตัวเป็นผู้แพ้เพียงคนเดียว!',
  },
  'game_kakerlaken-poker_genre': { en: 'Reverse Bluffing', th: 'บลัฟจับโกหก' },
  'game_bomb-busters_name': { en: 'Bomb Busters', th: 'Bomb Busters (หน่วยกู้ระเบิด)' },
  'game_bomb-busters_desc': {
    en: 'Cooperative deduction game. Coordinate with teammates to cut matching wire numbers before detonator fuses run out.',
    th: 'เกมร่วมมือไขปริศนากู้ระเบิด ช่วยกันตัดสายไฟที่มีหมายเลขตรงกันให้ทันก่อนระเบิดทำงาน!',
  },
  'game_bomb-busters_genre': { en: 'Co-op Wire Defusal', th: 'หน่วยกู้ระเบิด' },
  'game_sky-team_name': { en: 'Sky Team', th: 'Sky Team (กัปตันคู่บิน)' },
  'game_sky-team_desc': {
    en: 'Cooperative 2-player aviation game. Place dice silently to balance axis tilt, clear air traffic, and land safely.',
    th: 'เกมร่วมมือจำลองการบิน 2 คน จัดสรรลูกเต๋าอย่างเงียบๆ เพื่อปรับมุมเอียง ความเร็ว และลงจอดอย่างปลอดภัย',
  },
  'game_sky-team_genre': { en: 'Co-op Aviation', th: 'การบินจำลอง' },
  'game_splendor_name': { en: 'Splendor', th: 'Splendor (เกมค้าเพชร)' },
  'game_splendor_desc': {
    en: 'Collect chips to acquire development cards, earn permanent gem bonuses, and attract noble patrons to reach 15 prestige.',
    th: 'สะสมอัญมณีเพื่อซื้อการ์ดพัฒนา รับส่วนลดถาวร และดึงดูดขุนนางเพื่อพิชิต 15 คะแนนเกียรติยศ',
  },
  'game_splendor_genre': { en: 'Engine Building', th: 'วางแผนกลยุทธ์' },
  'game_werewolf_name': { en: 'Ultimate Werewolf', th: 'เกมล่ามนุษย์หมาป่า' },
  'game_werewolf_desc': {
    en: 'Classic social deduction. Villagers must identify and execute Werewolves before being devoured overnight.',
    th: 'เกมบลัฟล่ามนุษย์หมาป่าสุดคลาสสิก ชาวบ้านต้องหาตัวหมาป่าให้เจอและโหวตประหารก่อนถูกกินหมดหมู่บ้าน',
  },
  'game_werewolf_genre': { en: 'Social Deduction', th: 'บลัฟล่าหมาป่า' },
  'game_cheese-thief_name': { en: 'Cheese Thief', th: 'หนูขโมยชีส' },
  'game_cheese-thief_desc': {
    en: 'Fast-paced bluffing game with dice. Find out who stole the cheese during the secret hour!',
    th: 'เกมบลัฟสุดป่วน ทอยลูกเต๋าลับๆ แล้วหาตัวหนูจอมแสบที่แอบตื่นมาขโมยชีสยามค่ำคืน!',
  },
  'game_cheese-thief_genre': { en: 'Bluffing & Deception', th: 'บลัฟจับขโมย' },
  'game_codenames_name': { en: 'Codenames', th: 'Codenames (ถอดรหัสลับ)' },
  'game_codenames_desc': {
    en: 'Spymasters give one-word clues pointing to multiple words on board. Operatives deduce which words belong to their team.',
    th: 'หัวหน้าสายลับบอกคำใบ้ 1 คำเชื่อมโยงคำบนโต๊ะ เพื่อให้ลูกทีมทายรหัสคำลับของฝ่ายตนเองให้ครบ!',
  },
  'game_codenames_genre': { en: 'Word Deduction', th: 'ถอดรหัสคำ' },
  'game_spyfall_name': { en: 'Spyfall', th: 'Spyfall (ภารกิจสปายลับ)' },
  'game_spyfall_desc': {
    en: 'Everyone knows the secret location except the Spy. Ask questions to find the spy without giving away the location.',
    th: 'ทุกคนรู้สถานที่ลับยกเว้นสปาย ถามตอบเพื่อหาตัวสปายโดยไม่บอกใบ้สถานที่ให้สปายเดาได้!',
  },
  'game_spyfall_genre': { en: 'Social Interrogation', th: 'สปายสืบสวน' },
  'game_wavelength_name': { en: 'Wavelength', th: 'Wavelength (คลื่นความคิด)' },
  'game_wavelength_desc': {
    en: 'Telepathic party game. Read your psychic teammate’s mind to guess where the hidden target lies on the spectrum.',
    th: 'ปาร์ตี้เกมทายใจ หมุนเข็มสเปกตรัมตามคำใบ้ของเพื่อนเพื่อหาตำแหน่งเป้าหมายให้แม่นยำที่สุด!',
  },
  'game_wavelength_genre': { en: 'Telepathic Party', th: 'ปาร์ตี้ทายใจ' },
  'game_one-night-werewolf_name': { en: 'One Night Werewolf', th: 'หมาป่าคืนเดียว' },
  'game_one-night-werewolf_desc': {
    en: 'Fast 1-night deduction game. Roles swap in the dark, then 5 minutes of fierce debate and a single vote!',
    th: 'เกมหมาป่าจบไวในคืนเดียว สลับการ์ดในความมืด แล้วจับโกหกโหวตผู้ร้ายใน 5 นาที!',
  },
  'game_one-night-werewolf_genre': { en: 'Fast Deduction', th: 'หมาป่าคืนเดียว' },
  'game_for-sale_name': { en: 'For Sale', th: 'For Sale (บิดแหลกแจกบ้าน)' },
  'game_for-sale_desc': {
    en: 'Fast-paced property bidding game. Buy real estate low in phase 1, then sell high for fat paychecks in phase 2!',
    th: 'เกมประมูลอสังหาริมทรัพย์สุดเร้าใจ ซื้อบ้านราคาถูกในรอบแรก แล้วนำไปขายทำกำไรให้ได้เงินมากที่สุดในรอบสอง!',
  },
  'game_for-sale_genre': { en: 'Bidding & Auction', th: 'ประมูลอสังหาฯ' },
  'game_coup_name': { en: 'Coup', th: 'Coup (โค่นอำนาจ)' },
  'game_coup_desc': {
    en: 'Bluff, bribe, and assassinate in a dystopian city-state. Be the last player with influence standing!',
    th: 'เกมบลัฟชิงอำนาจ อ้างบทบาท สั่งลอบสังหาร และโค่นล้มคู่แข่งจนเหลือคุณคนสุดท้ายที่รอดชีวิต!',
  },
  'game_coup_genre': { en: 'Dystopian Bluffing', th: 'โค่นอำนาจ' },
  'game_catan_name': { en: 'Catan', th: 'Catan (ผู้บุกเบิกแห่งคาทาน)' },
  'game_catan_desc': {
    en: 'The premier island settlement & trading classic! Harvest resources, trade with neighbors and harbors, construct roads and cities, and race to 10 Victory Points.',
    th: 'เกมบอร์ดคลาสสิกระดับตำนาน! เก็บเกี่ยวทรัพยากร แลกเปลี่ยนกับเพื่อนและท่าเรือ สร้างถนนและเมืองใหญ่ เพื่อพิชิต 10 คะแนนเกียรติยศ',
  },
  'game_catan_genre': { en: 'Strategy & Trading', th: 'วางแผน & เจรจาค้าขาย' },

  // Kakerlaken Poker
  kakerlakenTitle: { en: 'Kakerlaken Poker', th: 'โป๊กเกอร์แมลงสาบ' },
  kakerlakenSubtitle: {
    en: 'The Reverse-Bluffing Classic • Avoid collecting 4 of any critter!',
    th: 'เกมบลัฟจับโกหกสุดคลาสสิก • ห้ามมีสัตว์ซ้ำครบ 4 ตัว!',
  },
  rivalsSeated: {
    en: 'Rivals Seated Across The Table (สวนสัตว์หน้าตักของคู่แข่ง)',
    th: 'สวนสัตว์หน้าตักของคู่แข่ง (ห้ามสะสมครบ 4 ตัว!)',
  },
  dangerWarning: {
    en: '⚠️ Warning: 4 of any creature = Immediate Elimination!',
    th: '⚠️ คำเตือน: สะสมสัตว์ซ้ำครบ 4 ตัว = แพ้ทันที!',
  },
  faceUpCollection: { en: 'Face-up Collection', th: 'การ์ดที่หงายอยู่หน้าตัก' },
  cleanDisplay: {
    en: 'Clean display (No pests yet)',
    th: 'หน้าตักสะอาด (ยังไม่มีสัตว์หน้าโต๊ะ)',
  },
  yourTurnOffer: {
    en: 'YOUR TURN: Pick a card from your hand to slide to a rival!',
    th: 'ตาของคุณ: เลือกการ์ดบนมือเพื่อเลื่อนส่งให้คู่แข่ง!',
  },
  cardOfferedToYou: {
    en: 'CARD OFFERED TO YOU! Call True, False, or Peek & Pass!',
    th: 'มีคนส่งการ์ดมาให้คุณ! ทายว่า จริง, โกหก หรือแอบดูแล้วส่งต่อ!',
  },
  claimedToBe: { en: 'Claimed to be:', th: 'อ้างว่าเป็น:' },
  trueBtn: { en: 'จริง (TRUE)', th: 'จริง (TRUE)' },
  falseBtn: { en: 'โกหก (FALSE)', th: 'โกหก (FALSE)' },
  peekPassBtn: {
    en: 'แอบดูแล้วส่งต่อ (Peek & Pass)',
    th: 'แอบดูแล้วส่งต่อ (Peek & Pass)',
  },
  slideCardBtn: {
    en: 'SLIDE CARD FACE-DOWN! ➔',
    th: 'เลื่อนการ์ดส่งตัวประหลาด! ➔',
  },
  yourHandTitle: {
    en: 'Your Hand & Tableau (การ์ดบนมือ & สวนสัตว์ของคุณ)',
    th: 'การ์ดบนมือและหน้าตักของคุณ',
  },
  cardsInHand: { en: 'Cards in Hand', th: 'การ์ดบนมือ' },
  yourSecretHand: {
    en: 'Your Secret Hand Cards:',
    th: 'การ์ดลับบนมือของคุณ:',
  },
  gameOver: { en: 'GAME OVER!', th: 'จบเกมแล้ว!' },
  hasBeenEliminated: {
    en: 'has been Eliminated!',
    th: 'แพ้เกมนี้!',
  },
  allOthersWin: {
    en: '🎉 All Other Operatives Win!',
    th: '🎉 ผู้เล่นที่เหลือทุกคนชนะร่วมกัน!',
  },
  onlyOneLoser: {
    en: 'In Kakerlaken Poker, there is only ONE loser. Everyone else survives and shares the victory!',
    th: 'ในโป๊กเกอร์แมลงสาบ มีผู้แพ้เพียงคนเดียวเท่านั้น ผู้เล่นที่เหลือทุกคนชนะร่วมกัน!',
  },
  returnToLobby: { en: 'Return to Lobby', th: 'กลับสู่หน้าห้อง' },

  // Bomb Busters
  bombBustersTitle: { en: 'Bomb Busters', th: 'Bomb Busters (หน่วยกู้ระเบิด)' },
  detonatorStability: { en: 'Detonator Stability', th: 'ความเสถียรของระเบิด' },
  defusedWires: { en: 'Defused Wires', th: 'สายไฟที่ตัดสำเร็จ' },
  sonarScanner: { en: 'Sonar Scanner', th: 'โซนาร์สแกนเนอร์' },
  stabilizer: { en: 'Stabilizer', th: 'อุปกรณ์รักษาเสถียรภาพ' },
  doubleDetector: { en: 'Double Detector', th: 'เครื่องตรวจจับคู่' },
  duoCut: { en: 'SNIP WIRE! ✂️', th: 'ตัดสายไฟ! ✂️' },
  soloCut: { en: 'EXECUTE SOLO CUT! ✂️', th: 'ตัดสายไฟเดี่ยว! ✂️' },
  tabletopWires: {
    en: 'Squad Defusal Tabletop / โต๊ะปฏิบัติการกู้ระเบิด',
    th: 'โต๊ะกู้ระเบิดของทีม (สายไฟทุกคนบนโต๊ะเดียวกัน)',
  },
  yourPersonalStand: {
    en: 'Your Personal Defusal Stand (Secret Wires)',
    th: 'แผงสายไฟลับส่วนตัวของคุณ',
  },
  teammateStands: {
    en: 'Operatives Seated Across The Table',
    th: 'แผงสายไฟของเพื่อนร่วมทีม',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  isThai: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  isThai: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load saved preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bgz_lang') as Language | null;
      if (saved === 'en' || saved === 'th') {
        setLanguageState(saved);
        document.documentElement.lang = saved;
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bgz_lang', lang);
      document.documentElement.lang = lang;
    }
  };

  const toggleLanguage = () => {
    soundFX.playClick();
    const nextLang: Language = language === 'en' ? 'th' : 'en';
    setLanguage(nextLang);
  };

  const t = (key: string, fallback?: string): string => {
    const entry = TRANSLATIONS[key];
    if (!entry) return fallback || key;
    return entry[language] || fallback || entry.en || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isThai: language === 'th',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export const useTranslation = useLanguage;

// Polished, tactile Language Switcher Button Component
interface LanguageSwitcherProps {
  className?: string;
  variant?: 'button' | 'pill';
}

export function LanguageSwitcher({
  className = '',
  variant = 'pill',
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  const handleSelect = (lang: Language) => {
    if (lang === language) return;
    soundFX.playClick();
    setLanguage(lang);
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={() => {
          soundFX.playClick();
          setLanguage(language === 'en' ? 'th' : 'en');
        }}
        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
          language === 'th'
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            : 'bg-[#18191e] text-zinc-300 border-[#272930] hover:bg-[#202228]'
        } ${className}`}
        title={language === 'en' ? 'Switch to Thai (เปลี่ยนเป็นภาษาไทย)' : 'Switch to English'}
      >
        <span>{language === 'en' ? '🇬🇧' : '🇹🇭'}</span>
        <span className="font-mono tracking-wider uppercase font-extrabold">
          {language === 'en' ? 'EN' : 'TH'}
        </span>
      </button>
    );
  }

  // Default dual pill: [ EN | TH ]
  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-xl bg-[#14151a] border border-[#272930] shadow-inner select-none ${className}`}
      role="group"
      aria-label="Language selector"
    >
      <button
        type="button"
        onClick={() => handleSelect('en')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
          language === 'en'
            ? 'bg-white text-zinc-950 shadow-xs font-black'
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
        }`}
        title="English"
      >
        <span className="text-xs">🇬🇧</span>
        <span className="font-mono text-[11px] tracking-wider">EN</span>
      </button>

      <button
        type="button"
        onClick={() => handleSelect('th')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
          language === 'th'
            ? 'bg-amber-400 text-stone-950 shadow-xs font-black'
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
        }`}
        title="ภาษาไทย (Thai)"
      >
        <span className="text-xs">🇹🇭</span>
        <span className="font-mono text-[11px] tracking-wider">TH</span>
      </button>
    </div>
  );
}
