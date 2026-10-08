import { PropertyCard, CheckCard } from './types';

export const PROPERTY_CARDS: PropertyCard[] = [
  { id: 1, rank: 1, name: 'Cardboard Box', nameTh: 'กล่องกระดาษ', icon: '📦', category: 'humble' },
  { id: 2, rank: 2, name: 'Outhouse', nameTh: 'ส้วมหลุม', icon: '🚽', category: 'humble' },
  { id: 3, rank: 3, name: 'Manhole', nameTh: 'ท่อระบายน้ำ', icon: '🕳️', category: 'humble' },
  { id: 4, rank: 4, name: 'Doghouse', nameTh: 'บ้านน้องหมา', icon: '🐕', category: 'humble' },
  { id: 5, rank: 5, name: 'Camping Tent', nameTh: 'เต็นท์แคมป์', icon: '⛺', category: 'humble' },
  { id: 6, rank: 6, name: 'Ice Igloo', nameTh: 'กระท่อมอิกคลู', icon: '❄️', category: 'humble' },
  { id: 7, rank: 7, name: 'Camper Van', nameTh: 'รถตู้แคมป์เปอร์', icon: '🚐', category: 'humble' },
  { id: 8, rank: 8, name: 'Treehouse', nameTh: 'บ้านต้นไม้', icon: '🌳', category: 'humble' },
  { id: 9, rank: 9, name: 'Tipi Tent', nameTh: 'กระโจมอินเดียน', icon: '🏕️', category: 'humble' },
  { id: 10, rank: 10, name: 'Houseboat', nameTh: 'เรือนแพบ้าน', icon: '🛥️', category: 'humble' },
  { id: 11, rank: 11, name: 'Log Cabin', nameTh: 'บ้านไม้ซุง', icon: '🪵', category: 'suburban' },
  { id: 12, rank: 12, name: 'Mobile Home', nameTh: 'บ้านรถคาราวาน', icon: '🚙', category: 'suburban' },
  { id: 13, rank: 13, name: 'Secret Cave', nameTh: 'ถ้ำลับกลางเขา', icon: '🦇', category: 'suburban' },
  { id: 14, rank: 14, name: 'Windmill', nameTh: 'กังหันลมเนเธอร์แลนด์', icon: '💨', category: 'suburban' },
  { id: 15, rank: 15, name: 'Beach Shack', nameTh: 'กระท่อมริมหาด', icon: '🏖️', category: 'suburban' },
  { id: 16, rank: 16, name: 'Lighthouse', nameTh: 'ประภาคารริมทะเล', icon: '🗼', category: 'suburban' },
  { id: 17, rank: 17, name: 'Suburban Villa', nameTh: 'บ้านเดี่ยวชานเมือง', icon: '🏡', category: 'suburban' },
  { id: 18, rank: 18, name: 'Country Barn', nameTh: 'โรงนาชนบท', icon: '🚜', category: 'suburban' },
  { id: 19, rank: 19, name: 'Watermill', nameTh: 'โรงสีพลังน้ำ', icon: '🌾', category: 'suburban' },
  { id: 20, rank: 20, name: 'Downtown Condo', nameTh: 'คอนโดใจกลางเมือง', icon: '🏢', category: 'suburban' },
  { id: 21, rank: 21, name: 'City Apartment', nameTh: 'อพาร์ตเมนต์หรู', icon: '🏬', category: 'luxury' },
  { id: 22, rank: 22, name: 'Penthouse', nameTh: 'เพนต์เฮาส์ยอดตึก', icon: '🏙️', category: 'luxury' },
  { id: 23, rank: 23, name: 'Modern Mansion', nameTh: 'คฤหาสน์โมเดิร์น', icon: '🏛️', category: 'luxury' },
  { id: 24, rank: 24, name: 'Royal Chateau', nameTh: 'ชาโตว์สไตล์ฝรั่งเศส', icon: '🏰', category: 'luxury' },
  { id: 25, rank: 25, name: 'Private Island', nameTh: 'เกาะส่วนตัว', icon: '🏝️', category: 'luxury' },
  { id: 26, rank: 26, name: 'Sky Spire', nameTh: 'สกายสไปร์ระฟ้า', icon: '🏗️', category: 'luxury' },
  { id: 27, rank: 27, name: 'Floating Fortress', nameTh: 'ป้อมปราการลอยน้ำ', icon: '🚢', category: 'luxury' },
  { id: 28, rank: 28, name: 'Versailles Palace', nameTh: 'พระราชวังแวร์ซาย', icon: '👑', category: 'luxury' },
  { id: 29, rank: 29, name: 'Imperial Castle', nameTh: 'ปราสาทจักรพรรดิ', icon: '🏯', category: 'fantasy' },
  { id: 30, rank: 30, name: 'Space Station', nameTh: 'สถานีอวกาศนานาชาติ', icon: '🚀', category: 'fantasy' },
];

// 30 Checks: 2 each of 0, 2..15 ($0k, $2,000 to $15,000)
export const CHECK_VALUES = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export function generateCheckDeck(): CheckCard[] {
  const deck: CheckCard[] = [];
  CHECK_VALUES.forEach((val) => {
    deck.push({ id: `chk_${val}_a`, value: val });
    deck.push({ id: `chk_${val}_b`, value: val });
  });
  return deck;
}
