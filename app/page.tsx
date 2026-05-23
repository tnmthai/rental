'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSession, signOut } from 'next-auth/react';
import FavoriteButton from '@/app/components/FavoriteButton';
import ShareButtons from '@/app/components/ShareButtons';

function normalizeImageUrls(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(String).filter(Boolean);
  if (typeof input === 'string') {
    return input
      .split(/\r?\n|,/) 
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function extractKeywords(query: string): string[] {
  const stop = new Set([
    'room', 'house', 'flat', 'in', 'near', 'under', 'over', 'with', 'and', 'or',
    'the', 'a', 'an', 'nzd', 'week', 'wk', 'per', 'for', 'included', 'include'
  ]);
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2 && !stop.has(w))
    )
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, keywords: string[]) {
  if (!text || keywords.length === 0) return text;
  const pattern = keywords.map(escapeRegExp).join('|');
  if (!pattern) return text;
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    const hit = keywords.some((k) => part.toLowerCase() === k.toLowerCase());
    if (!hit) return <span key={idx}>{part}</span>;
    return (
      <mark key={idx} style={{ background: '#fff59d', padding: '0 2px', borderRadius: 3 }}>
        {part}
      </mark>
    );
  });
}

function formatDescription(text: string): string[] {
  return text
    .replace(/\s*•\s*/g, '\n• ')
    .replace(/\s+[-–—]\s+/g, '\n- ')
    .replace(/\s*\|\s*/g, '\n')
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function sanitizeDescriptionHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
}

function hasHtmlTags(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

function shouldHideDescription(description?: string | null, sourceUrl?: string | null): boolean {
  if (!description) return false;
  const isRoomiesSource = /roomies\.co\.nz/i.test(sourceUrl || '');
  const hasExternalPrefix = /^\s*\[External listing from Roomies\]/i.test(description);
  return isRoomiesSource && hasExternalPrefix;
}

function normalizeBadgeText(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasFemaleFriendlySignal(h: Hit): boolean {
  if (h.female_friendly) return true;
  const text = normalizeBadgeText(`${h.title || ''} ${h.description || ''}`);
  return /(female preferred|prefer female|female only|girls only|uu tien nu|nu)/.test(text);
}

function hasDeskSignal(h: Hit): boolean {
  if (h.has_desk) return true;
  const text = normalizeBadgeText(`${h.title || ''} ${h.description || ''}`);
  return /(study desk|desk|ban hoc|ban lam viec)/.test(text);
}

const NZ_COORDS: Record<string, [number, number]> = {
  auckland: [-36.8485, 174.7633],
  wellington: [-41.2866, 174.7756],
  christchurch: [-43.5321, 172.6362],
  hamilton: [-37.787, 175.2793],
  dunedin: [-45.8788, 170.5028],
  nelson: [-41.2706, 173.284],
  lincoln: [-43.6458, 172.4704],
  rolleston: [-43.5947, 172.3822],
  palmerston_north: [-40.3564, 175.6111],
  tauranga: [-37.6878, 176.1651],
  rotorua: [-38.1368, 176.2497],
  napier: [-39.4928, 176.912],
  hastings: [-39.6381, 176.8495],
  new_plymouth: [-39.0556, 174.0752],
  whangarei: [-35.7251, 174.3237],
  invercargill: [-46.4132, 168.3538],
  queenstown: [-45.0312, 168.6626],
  wanaka: [-44.6967, 169.1367],
  blenheim: [-41.5134, 173.9612],
  gisborne: [-38.6623, 178.0176],
  masterton: [-40.9497, 175.6573],
  whanganui: [-39.9333, 175.05],
  canterbury: [-43.5, 171.5],
  selwyn: [-43.65, 172.25],
  northland: [-35.6, 174.3],
  waikato: [-37.7833, 175.2833],
  otago: [-45.2, 170.3],
  southland: [-46.2, 168.4]
};

function normalizePlaceKey(s?: string | null): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(district|city|region)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferCoordsFromCity(city?: string | null): { lat: number; lng: number } | null {
  const normalized = normalizePlaceKey(city);
  if (!normalized) return null;

  const parts = normalized.split(',').map((x) => x.trim()).filter(Boolean);
  const candidates = parts.length ? [...parts, ...[...parts].reverse(), normalized] : [normalized];

  for (const c of candidates) {
    const words = c.split(/\s+/).filter(Boolean);
    if (NZ_COORDS[c]) return { lat: NZ_COORDS[c][0], lng: NZ_COORDS[c][1] };
    const compact = c.replace(/\s+/g, '_');
    if (NZ_COORDS[compact]) return { lat: NZ_COORDS[compact][0], lng: NZ_COORDS[compact][1] };

    for (let i = 0; i < words.length; i++) {
      if (NZ_COORDS[words[i]]) return { lat: NZ_COORDS[words[i]][0], lng: NZ_COORDS[words[i]][1] };
      if (i < words.length - 1) {
        const two = `${words[i]}_${words[i + 1]}`;
        if (NZ_COORDS[two]) return { lat: NZ_COORDS[two][0], lng: NZ_COORDS[two][1] };
      }
    }
  }

  return null;
}

function normalizeCoordScale(value: number, maxAbs: number): number {
  if (!Number.isFinite(value)) return value;
  let v = value;

  // Heal malformed numeric coordinates where decimal separator is lost,
  // e.g. 17248094250846224 -> 172.48094250846224
  // Keep scaling down until value is in valid range.
  let guard = 0;
  while (Math.abs(v) > maxAbs && guard < 20) {
    v = v / 10;
    guard += 1;
  }

  return v;
}

function normalizeCoords(lat?: number | string | null, lng?: number | string | null, city?: string | null): { lat: number; lng: number } | null {
  const missingCoords = lat === null || lat === undefined || lng === null || lng === undefined || lat === '' || lng === '';
  if (missingCoords) {
    // Only fall back to town/city center when coordinates are missing.
    return inferCoordsFromCity(city);
  }

  let la = Number(lat);
  let lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;

  la = normalizeCoordScale(la, 90);
  lo = normalizeCoordScale(lo, 180);

  // Auto-fix swapped input: lat should be [-90, 90], lng should be [-180, 180].
  if (Math.abs(la) > 90 && Math.abs(lo) <= 90) {
    return { lat: lo, lng: la };
  }

  if (Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
  return { lat: la, lng: lo };
}

type Hit = {
  id: number;
  title: string;
  city: string;
  price_nzd_week: number;
  source_url: string;
  image_urls?: string[];
  description?: string | null;
  furnished?: boolean;
  bills_included?: boolean;
  near_school?: string | null;
  female_friendly?: boolean;
  has_desk?: boolean;
  available_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_featured?: boolean;
  user_verified?: boolean;
};

type ExternalHit = {
  title: string;
  url: string;
  snippet?: string;
  source: 'web';
};

type WantedHit = {
  id: number;
  title: string;
  city: string;
  budget_nzd_week: number;
  description?: string;
  furnished?: boolean;
  bills_included?: boolean;
  near_school?: string;
  contact_name?: string;
  contact_email?: string;
};

async function trackClientEvent(event_name: 'contact_click' | 'share_click', listing_id?: number) {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event_name, listing_id: listing_id || null })
    });
  } catch {}
}

const I18N = {
  en: {
    signOut: 'Sign out',
    logIn: 'Log in',
    searchPlaceholder: 'Search rentals in natural language...',
    samplePrompt: 'Room under 250 NZD/week near LU in Lincoln, furnished, bills included',
    helpButton: 'Help / Instructions',
    suggestionsTitle: 'AI suggestion prompts',
    suggestionsHint: 'Tap a prompt to quickly fill your search',
    demoPromptLabel: 'You type',
    demoOutputLabel: 'RentFinder returns',
    demoPromptSample: 'Room under 250 NZD/week near LU in Lincoln, furnished, bills included',
    demoPoints: [
      'Filters 10 rooms under $250/week within 5km of Lincoln Uni',
      'Automatically highlights bills-included & furnished tags',
      'Generates an AI summary + copyable contact links'
    ],
    demoCtaHint: 'Press Enter to search · Shift+Enter for a new line',
    searching: 'Searching...',
    search: 'Search',
    save: 'Save',
    createListing: 'Create listing',
    shareRoom: 'Share your room',
    myDashboard: 'My dashboard',
    aiOverview: 'AI Overview',
    internalListings: 'Our internal listings',
    viewDetail: 'View detail',
    share: 'Share',
    viewSource: 'Open original listing',
    perWeek: 'per week',
    noPhoto: 'No photo yet',
    photosLabel: 'photos',
    readMore: 'Read more',
    readLess: 'Read less',
    externalSuggestions: 'External web suggestions',
    externalHint: 'These are web results outside our internal database.',
    visits: 'visits',
    online: 'online',
    language: 'Language',
    english: 'English',
    vietnamese: 'Vietnamese',
    slogan: 'Post fast, find smart',
    heroTitle: 'Search less. Match faster.',
    saveNeedLogin: 'Please log in first.',
    saveOk: 'Saved search created.',
    saveFail: 'Failed to save',
    searchingOverview1: 'Reading your request and extracting filters…',
    searchingOverview2: 'Checking internal listings and ranking best matches…',
    searchingOverview3: 'Almost done — preparing summary and suggestions…',
    noSource: '(no source url)',
    furnished: 'furnished',
    unfurnished: 'unfurnished',
    billsIncluded: 'bills included',
    billsSeparate: 'bills separate',
    near: 'near',
    available: 'available',
    femalePreferredBadge: 'female preferred',
    studyDeskBadge: 'study desk',
    featuredBadge: '⭐ Featured',
    verifiedBadge: '✅ Verified'
  },
  vi: {
    signOut: 'Đăng xuất',
    logIn: 'Đăng nhập',
    searchPlaceholder: 'Tìm nhà thuê bằng ngôn ngữ tự nhiên...',
    samplePrompt: 'Room under 250 NZD/week near LU in Lincoln, furnished, bills included',
    helpButton: 'Hướng dẫn',
    suggestionsTitle: 'Gợi ý prompt AI',
    suggestionsHint: 'Bấm để điền nhanh câu tìm kiếm',
    demoPromptLabel: 'Bạn gõ',
    demoOutputLabel: 'RentFinder trả về',
    demoPromptSample: 'Room under 250 NZD/week near LU in Lincoln, furnished, bills included',
    demoPoints: [
      'Lọc còn 10 phòng dưới $250/tuần trong bán kính 5km quanh Lincoln',
      'Tự gắn tag đã gồm bills & có nội thất',
      'Sinh tóm tắt AI + link liên hệ để copy nhanh'
    ],
    demoCtaHint: 'Nhấn Enter để tìm · Shift+Enter để xuống dòng',
    searching: 'Đang tìm...',
    search: 'Tìm',
    save: 'Lưu',
    createListing: 'Đăng tin',
    shareRoom: 'Chia sẻ phòng của bạn',
    myDashboard: 'Bảng điều khiển',
    aiOverview: 'Tóm tắt AI',
    internalListings: 'Danh sách nội bộ',
    viewDetail: 'Xem chi tiết',
    share: 'Chia sẻ',
    viewSource: 'Mở nguồn gốc tin đăng',
    perWeek: 'mỗi tuần',
    noPhoto: 'Chưa có ảnh',
    photosLabel: 'ảnh',
    readMore: 'Xem thêm',
    readLess: 'Thu gọn',
    externalSuggestions: 'Gợi ý từ web bên ngoài',
    externalHint: 'Đây là kết quả ngoài cơ sở dữ liệu nội bộ.',
    visits: 'lượt truy cập',
    online: 'đang online',
    language: 'Ngôn ngữ',
    english: 'English',
    vietnamese: 'Tiếng Việt',
    slogan: 'Đăng nhanh, tìm thông minh',
    heroTitle: 'Tìm ít hơn. Khớp nhanh hơn.',
    saveNeedLogin: 'Vui lòng đăng nhập trước.',
    saveOk: 'Đã lưu tìm kiếm.',
    saveFail: 'Lưu thất bại',
    searchingOverview1: 'Đang đọc yêu cầu và tách bộ lọc…',
    searchingOverview2: 'Đang kiểm tra dữ liệu nội bộ và xếp hạng kết quả…',
    searchingOverview3: 'Sắp xong — đang chuẩn bị tóm tắt và gợi ý…',
    noSource: '(không có nguồn)',
    furnished: 'đầy đủ nội thất',
    unfurnished: 'không nội thất',
    billsIncluded: 'đã gồm hóa đơn',
    billsSeparate: 'chưa gồm hóa đơn',
    near: 'gần',
    available: 'có thể ở từ',
    femalePreferredBadge: 'ưu tiên nữ',
    studyDeskBadge: 'có bàn học',
    featuredBadge: '⭐ Nổi bật',
    verifiedBadge: '✅ Đã xác minh'
  },
  zh: {
    signOut: '退出登录',
    logIn: '登录',
    searchPlaceholder: '用自然语言搜索租房...',
    samplePrompt: 'Room under 250 NZD/week near LU in Lincoln, furnished, bills included',
    helpButton: '帮助 / 说明',
    suggestionsTitle: 'AI 搜索建议',
    suggestionsHint: '点击快速填入搜索词',
    demoPromptLabel: '你输入',
    demoOutputLabel: 'RentFinder 返回',
    demoPromptSample: 'Room under 250 NZD/week near LU in Lincoln, furnished, bills included',
    demoPoints: [
      '筛选 Lincoln 大学 5 公里内低于 $250/周的 10 个房间',
      '自动标记含账单和带家具的标签',
      '生成 AI 摘要 + 可复制的联系方式'
    ],
    demoCtaHint: '按 Enter 搜索 · Shift+Enter 换行',
    searching: '搜索中...',
    search: '搜索',
    save: '保存',
    createListing: '发布房源',
    shareRoom: '分享你的房间',
    myDashboard: '我的控制台',
    aiOverview: 'AI 概述',
    internalListings: '内部房源',
    viewDetail: '查看详情',
    share: '分享',
    viewSource: '打开原始链接',
    perWeek: '每周',
    noPhoto: '暂无照片',
    photosLabel: '张照片',
    readMore: '展开',
    readLess: '收起',
    externalSuggestions: '外部网页建议',
    externalHint: '这些是外部数据库之外的结果。',
    visits: '次访问',
    online: '在线',
    language: '语言',
    english: 'English',
    vietnamese: 'Tiếng Việt',
    slogan: '快速发布，智能搜索',
    heroTitle: '少搜索，快匹配。',
    saveNeedLogin: '请先登录。',
    saveOk: '已保存搜索。',
    saveFail: '保存失败',
    searchingOverview1: '正在读取请求并提取筛选条件…',
    searchingOverview2: '正在检查内部房源并排序最佳匹配…',
    searchingOverview3: '即将完成 — 正在准备摘要和建议…',
    noSource: '（无来源链接）',
    furnished: '带家具',
    unfurnished: '不带家具',
    billsIncluded: '含账单',
    billsSeparate: '不含账单',
    near: '靠近',
    available: '可入住',
    femalePreferredBadge: '女生优先',
    studyDeskBadge: '有书桌',
    featuredBadge: '⭐ 精选',
    verifiedBadge: '✅ 已认证'
  },
  hi: {
    signOut: 'लॉग आउट',
    logIn: 'लॉग इन',
    searchPlaceholder: 'प्राकृतिक भाषा में किराया खोजें...',
    samplePrompt: 'Room under 250 NZD/week near LU in Lincoln, furnished, bills included',
    helpButton: 'सहायता / निर्देश',
    suggestionsTitle: 'AI सुझाव',
    suggestionsHint: 'जल्दी भरने के लिए टैप करें',
    demoPromptLabel: 'आप लिखते हैं',
    demoOutputLabel: 'RentFinder दिखाता है',
    demoPromptSample: 'Room under 250 NZD/week near LU in Lincoln, furnished, bills included',
    demoPoints: [
      'Lincoln Uni के 5km के भीतर $250/सप्ताह से कम के 10 कमरे फ़िल्टर करता है',
      'बिल-इन्क्लूडेड और फर्निश्ड टैग स्वचालित रूप से दिखाता है',
      'AI सारांश + कॉपी करने योग्य संपर्क लिंक बनाता है'
    ],
    demoCtaHint: 'खोजने के लिए Enter दबाएं · Shift+Enter नई लाइन',
    searching: 'खोज रहा है...',
    search: 'खोजें',
    save: 'सहेजें',
    createListing: 'लिस्टिंग बनाएं',
    shareRoom: 'अपना कमरा साझा करें',
    myDashboard: 'मेरा डैशबोर्ड',
    aiOverview: 'AI अवलोकन',
    internalListings: 'आंतरिक लिस्टिंग',
    viewDetail: 'विवरण देखें',
    share: 'साझा करें',
    viewSource: 'मूल लिस्टिंग खोलें',
    perWeek: 'प्रति सप्ताह',
    noPhoto: 'अभी फोटो नहीं',
    photosLabel: 'फोटो',
    readMore: 'और पढ़ें',
    readLess: 'कम पढ़ें',
    externalSuggestions: 'बाहरी वेब सुझाव',
    externalHint: 'ये हमारे आंतरिक डेटाबेस के बाहर के परिणाम हैं।',
    visits: 'विज़िट',
    online: 'ऑनलाइन',
    language: 'भाषा',
    english: 'English',
    vietnamese: 'Tiếng Việt',
    slogan: 'तेज़ी से पोस्ट करें, समझदारी से खोजें',
    heroTitle: 'कम खोजें। तेज़ी से मिलाएं।',
    saveNeedLogin: 'कृपया पहले लॉग इन करें।',
    saveOk: 'खोज सहेजी गई।',
    saveFail: 'सहेजने में विफल',
    searchingOverview1: 'आपका अनुरोध पढ़ रहा है और फ़िल्टर निकाल रहा है…',
    searchingOverview2: 'आंतरिक लिस्टिंग जांच रहा है और सर्वोत्तम मिलान रैंक कर रहा है…',
    searchingOverview3: 'लगभग हो गया — सारांश और सुझाव तैयार कर रहा है…',
    noSource: '(कोई स्रोत लिंक नहीं)',
    furnished: 'फर्निश्ड',
    unfurnished: 'अनफर्निश्ड',
    billsIncluded: 'बिल शामिल',
    billsSeparate: 'बिल अलग',
    near: 'पास',
    available: 'उपलब्ध',
    femalePreferredBadge: 'महिला वरीयता',
    studyDeskBadge: 'स्टडी डेस्क',
    featuredBadge: '⭐ विशेष',
    verifiedBadge: '✅ सत्यापित'
  }
} as const;

const ListingMap = dynamic(() => import('./components/ListingMap'), { ssr: false });

type Lang = keyof typeof I18N;

export default function HomePage() {
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [aiOverview, setAiOverview] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [wantedHits, setWantedHits] = useState<WantedHit[]>([]);
  const [externalHits, setExternalHits] = useState<ExternalHit[]>([]);
  const [saveMsg, setSaveMsg] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [notifCount, setNotifCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [filterPrice, setFilterPrice] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [filterFurnished, setFilterFurnished] = useState<string>('any');
  const [filterBills, setFilterBills] = useState<string>('any');
  const [filterCity, setFilterCity] = useState<string>('');
  const [expandedDesc, setExpandedDesc] = useState<Record<number, boolean>>({});
  const searchInputRef = useRef<HTMLTextAreaElement | null>(null);
  const keywords = useMemo(() => extractKeywords(query), [query]);
  const t = I18N[lang];
  const [showMenu, setShowMenu] = useState(false);
  const primaryNav = [
    { href: '/post', label: t.createListing, primary: true },
    { href: '/map', label: '🗺️ Map' },
    { href: '/wanted', label: 'Requests' }
  ];
  const menuNav = [
    { href: '/wanted/post', label: 'Post room request' },
    { href: '/hosts', label: t.shareRoom },
    { href: '/about', label: 'About' }
  ];
  const suggestedPrompts = useMemo(
    () => [
      t.samplePrompt,
      lang === 'vi'
        ? 'Phòng gần University of Canterbury dưới 230 NZD/tuần, có giường và bàn học, ưu tiên nữ'
        : 'Room near University of Canterbury under 230 NZD/week, bed + study desk, female preferred',
      lang === 'vi'
        ? 'Studio cho 2 người ở Christchurch dưới 380 NZD/tuần, cho nuôi mèo, có chỗ đậu xe'
        : 'Studio for 2 in Christchurch under 380 NZD/week, cat friendly, with parking'
    ],
    [lang, t.samplePrompt]
  );
  const mapPoints = useMemo(
    () =>
      hits
        .map((h) => {
          const c = normalizeCoords(h.latitude, h.longitude, h.city);
          if (!c) return null;
          return {
            id: h.id,
            title: h.title,
            city: h.city,
            price_nzd_week: h.price_nzd_week,
            lat: c.lat,
            lng: c.lng
          };
        })
        .filter(Boolean) as Array<{ id: number; title: string; city: string; price_nzd_week: number; lat: number; lng: number }>,
    [hits]
  );

  useEffect(() => {
    if (!searchInputRef.current) return;
    const el = searchInputRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [query]);

  function buildFilterQuery(): string {
    const parts: string[] = [];
    if (query.trim()) parts.push(query.trim());
    if (filterCity) parts.push(`in ${filterCity}`);
    if (filterPrice.max) parts.push(`under ${filterPrice.max} NZD/week`);
    if (filterFurnished === 'yes') parts.push('furnished');
    if (filterFurnished === 'no') parts.push('unfurnished');
    if (filterBills === 'yes') parts.push('bills included');
    return parts.join(', ') || 'room for rent';
  }

  async function run() {
    const searchQuery = buildFilterQuery();
    setLoading(true);
    setReply('');
    setHits([]);
    setWantedHits([]);
    setExternalHits([]);

    const loadingSteps = [t.searchingOverview1, t.searchingOverview2, t.searchingOverview3];
    let step = 0;
    setAiOverview(loadingSteps[step]);
    const timer = setInterval(() => {
      step = Math.min(step + 1, loadingSteps.length - 1);
      setAiOverview(loadingSteps[step]);
    }, 900);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: searchQuery })
      });
      const data = await res.json();
      setReply(data.reply || data.error || 'No reply');
      setAiOverview(data.aiOverview || '');
      setHits(data.results || []);
      setWantedHits(data.wantedResults || []);
      setExternalHits(data.externalResults || []);
    } catch {
      setReply('Search failed. Please try again.');
      setAiOverview('');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  async function saveSearch() {
    if (!session?.user) {
      setSaveMsg(t.saveNeedLogin);
      return;
    }
    const res = await fetch('/api/my/saved-searches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Quick saved search', query })
    });
    const data = await res.json();
    setSaveMsg(res.ok ? t.saveOk : data.error || t.saveFail);
  }

  useEffect(() => {
    let timer: any;
    async function pollAdminCount() {
      const res = await fetch('/api/admin/moderation/count');
      if (!res.ok) return;
      const data = await res.json();
      const count = Number(data.pending_count || 0);
      setPendingCount(count);
      const key = 'admin_last_seen_pending_count';
      const lastSeen = Number(localStorage.getItem(key) || 0);
      setNewCount(Math.max(count - lastSeen, 0));
    }
    if (session?.user) {
      pollAdminCount();
      timer = setInterval(pollAdminCount, 20000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [session?.user]);

  useEffect(() => {
    async function trackVisit() {
      const key = 'rf_visit_counted';
      if (!sessionStorage.getItem(key)) {
        const r = await fetch('/api/metrics/visits', { method: 'POST' });
        const j = await r.json().catch(() => ({}));
        if (typeof j.total === 'number') setVisitCount(j.total);
        sessionStorage.setItem(key, '1');
      } else {
        const r = await fetch('/api/metrics/visits');
        const j = await r.json().catch(() => ({}));
        if (typeof j.total === 'number') setVisitCount(j.total);
      }
    }
    trackVisit();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('rf_lang');
    if (saved === 'en' || saved === 'vi' || saved === 'zh' || saved === 'hi') setLang(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('rf_lang', lang);
  }, [lang]);

  useEffect(() => {
    const saved = localStorage.getItem('rf_theme') as 'light' | 'dark' | null;
    const preferred = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(preferred);
    document.documentElement.setAttribute('data-theme', preferred);
  }, []);

  useEffect(() => {
    localStorage.setItem('rf_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    async function loadFavorites() {
      if (!session?.user) { setFavoriteIds(new Set()); return; }
      try {
        const res = await fetch('/api/my/favorites');
        const data = await res.json();
        if (res.ok && data.items) {
          setFavoriteIds(new Set(data.items.map((f: any) => Number(f.listing_id))));
        }
      } catch {}
    }
    loadFavorites();
  }, [session?.user]);

  useEffect(() => {
    async function loadNotifCount() {
      if (!session?.user) { setNotifCount(0); return; }
      try {
        const res = await fetch('/api/my/notifications');
        const data = await res.json();
        if (res.ok) setNotifCount(Number(data.unread_count || 0));
      } catch {}
    }
    loadNotifCount();
    const timer = setInterval(loadNotifCount, 30000);
    return () => clearInterval(timer);
  }, [session?.user]);

  useEffect(() => {
    const storageKey = 'rf_online_session_id';
    let sessionId = localStorage.getItem(storageKey);
    if (!sessionId) {
      sessionId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
      localStorage.setItem(storageKey, sessionId);
    }

    let timer: any;

    async function trackOnline() {
      const r = await fetch('/api/metrics/online', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const j = await r.json().catch(() => ({}));
      if (typeof j.online === 'number') setOnlineCount(j.online);
    }

    trackOnline();
    timer = setInterval(trackOnline, 45000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  function markAdminSeen() {
    localStorage.setItem('admin_last_seen_pending_count', String(pendingCount));
    setNewCount(0);
  }

  return (
    <main
      style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: '18px 16px 80px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        color: '#1f2937',
        position: 'relative'
      }}
    >
      <header
        className="home-topbar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
          gap: 10,
          width: '100vw',
          position: 'relative',
          left: '50%',
          marginLeft: '-50vw',
          padding: '0 20px',
          boxSizing: 'border-box'
        }}
      >
        <a href="/" className="miniBrand" style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 900, fontSize: 17, flexShrink: 0 }}>
          RentFinder
        </a>

        <nav className="topNav" aria-label="Primary actions" style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {primaryNav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="btn btn-sm"
              style={{
                background: item.primary ? 'var(--brand-primary)' : 'rgba(255,255,255,0.9)',
                color: item.primary ? '#fff' : 'var(--text-secondary)',
                border: item.primary ? '1px solid var(--brand-primary)' : '1px solid var(--border-default)',
                boxShadow: item.primary ? 'var(--shadow-btn-primary)' : 'var(--shadow-sm)',
                padding: '6px 12px',
                fontSize: 13
              }}
            >
              {item.label}
            </a>
          ))}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              style={{
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.9)',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
                color: 'var(--text-secondary)'
              }}
              aria-label="More options"
            >
              ☰
            </button>
            {showMenu ? (
              <>
                <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 6,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  boxShadow: '0 12px 36px rgba(0,0,0,0.12)',
                  minWidth: 180,
                  zIndex: 999,
                  padding: '6px 0'
                }}>
                  {session?.user ? (
                    <>
                      <a href="/dashboard" onClick={() => setShowMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', textDecoration: 'none', color: '#1f2937', fontSize: 14, fontWeight: 600 }}>
                        {session.user.image ? (
                          <img src={session.user.image} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
                        ) : null}
                        {t.myDashboard}
                        {notifCount > 0 ? <span style={{ marginLeft: 'auto', background: '#2563eb', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>{notifCount}</span> : null}
                      </a>
                      {(pendingCount > 0 || newCount > 0) ? (
                        <a href="/admin/moderation" onClick={() => { markAdminSeen(); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', textDecoration: 'none', color: '#1f2937', fontSize: 14 }}>
                          🔔 Moderation
                          <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>{newCount > 0 ? newCount : pendingCount}</span>
                        </a>
                      ) : null}
                      <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
                    </>
                  ) : null}
                  {menuNav.map((item) => (
                    <a key={item.href} href={item.href} onClick={() => setShowMenu(false)} style={{ display: 'block', padding: '10px 16px', textDecoration: 'none', color: '#1f2937', fontSize: 14 }}>
                      {item.label}
                    </a>
                  ))}
                  {session?.user ? (
                    <>
                      <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
                      <button
                        onClick={() => { signOut({ callbackUrl: '/' }); setShowMenu(false); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', color: '#ef4444', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {t.signOut}
                      </button>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </nav>

        {!session?.user ? (
          <a href="/login" className="btn btn-sm" style={{ background: '#fff', color: 'var(--brand-primary)', border: '1px solid var(--brand-primary)', flexShrink: 0, fontSize: 13, padding: '6px 12px' }}>
            {t.logIn}
          </a>
        ) : null}
      </header>

      {/* Center hero when no results, push to top when results appear */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: hits.length > 0 || externalHits.length > 0 || wantedHits.length > 0 || loading ? 'flex-start' : 'center',
          flex: hits.length > 0 || externalHits.length > 0 || wantedHits.length > 0 || loading ? 0 : 1,
          transition: 'flex 0.3s ease'
        }}
      >
        <section
          className="homeHero"
          style={{
            textAlign: 'center',
            marginBottom: 20,
            border: '1px solid #e5eaf2',
            borderRadius: 22,
            padding: '24px clamp(14px, 4vw, 36px)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 42%, #eff6ff 100%)',
            boxShadow: '0 16px 48px rgba(15, 23, 42, 0.08)',
            overflow: 'hidden',
            position: 'relative',
            width: '100%',
            maxWidth: 800
          }}
        >
          <h1
            style={{
              margin: '0 auto 14px',
              fontSize: 20,
              fontWeight: 850,
              letterSpacing: 0,
              color: '#334155'
            }}
          >
            {t.heroTitle}
          </h1>

        <div
          className="searchBar"
          style={{
            display: 'flex',
            gap: 12,
            padding: 12,
            border: '1px solid #dbeafe',
            borderRadius: 24,
            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.11)',
            background: '#ffffff',
            width: '100%',
            boxSizing: 'border-box',
            alignItems: 'stretch'
          }}
        >
          <div className="searchInputWrap" style={{ flex: 1, minWidth: 0, display: 'flex' }}>
            <textarea
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.samplePrompt}
              rows={1}
              spellCheck={false}
              style={{
                flex: 1,
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: 16,
                lineHeight: 1.4,
                color: '#111827',
                padding: '14px 16px',
                boxSizing: 'border-box',
                borderRadius: 16,
                resize: 'none',
                background: '#f8fafc',
                minHeight: 54,
                overflow: 'hidden'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  run();
                }
              }}
            />
          </div>
          <div className="searchActions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={run}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? t.searching : t.search}
            </button>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="btn btn-outline"
              style={{
                background: showFilters ? '#eff6ff' : undefined,
                borderColor: showFilters ? '#3b82f6' : undefined,
                color: showFilters ? '#2563eb' : undefined
              }}
            >
              ⚙️ Filters
            </button>
            <button
              onClick={saveSearch}
              className="btn btn-outline"
            >
              {t.save}
            </button>
          </div>
        </div>

        {showFilters ? (
          <div style={{
            marginTop: 10,
            padding: '14px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            background: '#fafbfc',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            alignItems: 'flex-end'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>City</label>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontSize: 13, minWidth: 140, background: '#fff' }}
              >
                <option value="">Any</option>
                {['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Dunedin', 'Lincoln', 'Nelson', 'Palmerston North', 'Tauranga', 'Napier', 'New Plymouth', 'Whangarei', 'Invercargill', 'Queenstown'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Price (NZD/wk)</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={filterPrice.min}
                  onChange={(e) => setFilterPrice((p) => ({ ...p, min: e.target.value }))}
                  style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 8px', fontSize: 13, width: 70, background: '#fff' }}
                />
                <span style={{ color: '#9ca3af' }}>–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filterPrice.max}
                  onChange={(e) => setFilterPrice((p) => ({ ...p, max: e.target.value }))}
                  style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 8px', fontSize: 13, width: 70, background: '#fff' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Furnished</label>
              <select
                value={filterFurnished}
                onChange={(e) => setFilterFurnished(e.target.value)}
                style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontSize: 13, minWidth: 100, background: '#fff' }}
              >
                <option value="any">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Bills included</label>
              <select
                value={filterBills}
                onChange={(e) => setFilterBills(e.target.value)}
                style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontSize: 13, minWidth: 100, background: '#fff' }}
              >
                <option value="any">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <button
              onClick={() => { setFilterCity(''); setFilterPrice({ min: '', max: '' }); setFilterFurnished('any'); setFilterBills('any'); }}
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid #bae6fd',
              borderRadius: 999,
              padding: '6px 12px',
              background: showHelp ? '#e0f2fe' : '#ffffff',
              color: '#075985',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ? {t.helpButton}
          </button>
          <button
            type="button"
            onClick={() => setShowSuggestions((v) => !v)}
            aria-expanded={showSuggestions}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid #cbd5e1',
              borderRadius: 999,
              padding: '6px 12px',
              background: showSuggestions ? '#f1f5f9' : '#ffffff',
              color: '#475569',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            💡 {t.suggestionsTitle}
          </button>
        </div>

        {showHelp ? (
          <div
            className="heroDemo"
            style={{
              marginTop: 12,
              display: 'flex',
              gap: 14,
              padding: '14px 16px',
              border: '1px solid #dbeafe',
              borderRadius: 14,
              background: '#ffffff',
              textAlign: 'left',
              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: 1, textTransform: 'uppercase' }}>{t.demoPromptLabel}</div>
              <p style={{ margin: '6px 0 4px', fontSize: 14, color: '#1f2937', lineHeight: 1.5 }}>
                "{t.demoPromptSample}"
              </p>
              <small style={{ color: '#6b7280', fontSize: 12 }}>{t.demoCtaHint}</small>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', letterSpacing: 1, textTransform: 'uppercase' }}>{t.demoOutputLabel}</div>
              <ul style={{ margin: '6px 0 0', paddingLeft: 16, color: '#374151', lineHeight: 1.5, fontSize: 14 }}>
                {t.demoPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {saveMsg ? <p style={{ marginTop: 4, fontSize: 12, color: '#5f6368' }}>{saveMsg}</p> : null}

        {showSuggestions ? (
          <div
            style={{
              marginTop: 12,
              textAlign: 'left',
              border: '1px solid #d8e0eb',
              background: 'rgba(255,255,255,0.8)',
              borderRadius: 14,
              padding: '12px 14px'
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{t.suggestionsTitle}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={`${prompt}-${idx}`}
                  onClick={() => setQuery(prompt)}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
      </div>

      {(aiOverview || reply) && (
        <section
          style={{
            marginBottom: 18,
            color: '#374151',
            fontSize: 16,
            lineHeight: 1.6,
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            borderRadius: 12,
            padding: '12px 14px'
          }}
        >
          <strong>{t.aiOverview}:</strong> {aiOverview || reply}
        </section>
      )}

      {hits.length > 0 && (
        <section>
          {mapPoints.length > 0 ? <ListingMap points={mapPoints} /> : null}
          <h3 style={{ margin: '0 0 10px', color: '#111827' }}>{t.internalListings}</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16
            }}
          >
            {hits.map((h) => {
              const gallery = normalizeImageUrls(h.image_urls);
              const primaryImage = gallery[0] || null;
              const extraPhotos = Math.max(gallery.length - 1, 0);
              const femaleFriendly = hasFemaleFriendlySignal(h);
              const hasDesk = hasDeskSignal(h);
              const hideDescription = shouldHideDescription(h.description, h.source_url);
              const plainSnippet = !hideDescription && h.description
                ? formatDescription(h.description.replace(/<[^>]+>/g, ' ')).join(' ')
                : '';
              const normalizedSnippet = plainSnippet.replace(/\s+/g, ' ').trim();
              const snippet = normalizedSnippet.length > 220 ? `${normalizedSnippet.slice(0, 220).trim()}…` : normalizedSnippet;
              const canExpand = normalizedSnippet.length > 220;
              const metaParts: Array<JSX.Element | string> = [];
              if (h.city) metaParts.push(<span key="city">{highlightText(h.city, keywords)}</span>);
              if (h.near_school) metaParts.push(
                <span key="near">{t.near} {highlightText(h.near_school, keywords)}</span>
              );
              if (h.available_date) metaParts.push(
                <span key="available">{t.available} {new Date(h.available_date).toLocaleDateString()}</span>
              );

              return (
                <article
                  key={h.id}
                  className="card"
                  style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}
                >
                  {primaryImage ? (
                    <div style={{ position: 'relative', width: '100%', paddingTop: '62%', overflow: 'hidden' }}>
                      <img
                        src={primaryImage}
                        alt={h.title}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      {extraPhotos > 0 ? (
                        <span
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: 12,
                            background: 'rgba(15, 23, 42, 0.8)',
                            color: '#fff',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '4px 10px'
                          }}
                        >
                          +{extraPhotos} {t.photosLabel}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div
                      style={{
                        height: 180,
                        background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        color: '#6b7280'
                      }}
                    >
                      {t.noPhoto}
                    </div>
                  )}

                  <div style={{ padding: '14px 16px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: 20, lineHeight: 1.35 }}>
                          {highlightText(h.title, keywords)}
                        </h3>
                        {metaParts.length ? (
                          <p style={{ margin: '6px 0 0', color: '#4b5563', fontSize: 13, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {metaParts.map((part, idx) => (
                              <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {idx > 0 ? <span style={{ color: '#d1d5db' }}>•</span> : null}
                                {part}
                              </span>
                            ))}
                          </p>
                        ) : null}
                      </div>
                      <span
                        style={{
                          whiteSpace: 'nowrap',
                          fontWeight: 800,
                          color: '#044e6c',
                          background: '#e0f2fe',
                          borderRadius: 14,
                          padding: '6px 12px',
                          fontSize: 14,
                          alignSelf: 'flex-start',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        ${h.price_nzd_week.toLocaleString()} {t.perWeek}
                        {session?.user ? (
                          <FavoriteButton
                            listingId={h.id}
                            initialFavorited={favoriteIds.has(h.id)}
                            onToggle={(fav) => {
                              setFavoriteIds((prev) => {
                                const next = new Set(prev);
                                if (fav) next.add(h.id);
                                else next.delete(h.id);
                                return next;
                              });
                            }}
                          />
                        ) : null}
                      </span>
                    </div>

                    {snippet ? (
                      <div style={{ marginTop: 12 }}>
                        <p
                          className={!expandedDesc[h.id] ? 'descClamp' : undefined}
                          style={{ margin: 0, color: '#4d5156', fontSize: 14, lineHeight: 1.6, minHeight: 48 }}
                        >
                          {highlightText(snippet, keywords)}
                        </p>
                        {canExpand ? (
                          <button
                            onClick={() => setExpandedDesc((prev) => ({ ...prev, [h.id]: !prev[h.id] }))}
                            style={{ border: 'none', background: 'transparent', color: '#1a73e8', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginTop: 6 }}
                          >
                            {expandedDesc[h.id] ? t.readLess : t.readMore}
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {h.is_featured ? (
                        <span className="badge badge-warning">{t.featuredBadge}</span>
                      ) : null}
                      {h.user_verified ? (
                        <span className="badge badge-success">{t.verifiedBadge}</span>
                      ) : null}
                      <span className="badge badge-neutral">{h.furnished ? t.furnished : t.unfurnished}</span>
                      <span className="badge badge-neutral">{h.bills_included ? t.billsIncluded : t.billsSeparate}</span>
                      {femaleFriendly ? (
                        <span className="badge badge-error">{t.femalePreferredBadge}</span>
                      ) : null}
                      {hasDesk ? (
                        <span className="badge badge-blue">{t.studyDeskBadge}</span>
                      ) : null}
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <a
                          href={`/listing/${h.id}`}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--brand-blue)', border: '1px solid var(--brand-blue)' }}
                        >
                          {t.viewDetail}
                        </a>
                        <ShareButtons listingId={h.id} title={h.title} compact />
                      </div>

                      <div style={{ fontSize: 12, color: '#006621' }}>
                        {h.source_url ? (
                          <a
                            href={h.source_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => trackClientEvent('contact_click', h.id)}
                            style={{ color: '#006621', textDecoration: 'none', fontWeight: 600 }}
                          >
                            {t.viewSource}
                          </a>
                        ) : (
                          <span>{t.noSource}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {wantedHits.length > 0 && (
        <section style={{ marginTop: 18 }}>
          <h3 style={{ margin: '0 0 8px', color: '#111827' }}>Room requests (renters looking for rooms)</h3>
          <ul style={{ padding: 0, margin: 0 }}>
            {wantedHits.map((w) => (
              <li key={w.id} style={{ listStyle: 'none', borderTop: '1px solid #eee', padding: '10px 0' }}>
                <div style={{ fontWeight: 700, color: '#111827' }}>{w.title}</div>
                <div style={{ color: '#4b5563', marginTop: 3 }}>
                  {w.city} · budget ${w.budget_nzd_week}/week · {w.furnished ? 'furnished preferred' : 'furnished optional'} · {w.bills_included ? 'bills included preferred' : 'bills flexible'}
                  {w.near_school ? <> · near {w.near_school}</> : null}
                </div>
                {w.description ? <div style={{ marginTop: 4, color: '#6b7280' }}>{w.description}</div> : null}
                {w.contact_email ? (
                  <div style={{ marginTop: 6 }}>
                    <a
                      href={`mailto:${w.contact_email}?subject=${encodeURIComponent(`Room offer for your request #${w.id}`)}`}
                      style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 600 }}
                    >
                      Contact renter
                    </a>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {externalHits.length > 0 && (
        <section style={{ marginTop: 18 }}>
          <h3 style={{ margin: '0 0 8px', color: '#111827' }}>{t.externalSuggestions}</h3>
          <p style={{ margin: '0 0 10px', color: '#6b7280', fontSize: 13 }}>
            {t.externalHint}
          </p>
          <ul style={{ padding: 0, margin: 0 }}>
            {externalHits.map((x, idx) => (
              <li key={`${x.url}-${idx}`} style={{ listStyle: 'none', borderTop: '1px solid #eee', padding: '10px 0' }}>
                <a href={x.url} target="_blank" style={{ color: '#1a0dab', textDecoration: 'none', fontWeight: 600 }}>
                  {x.title}
                </a>
                <div style={{ color: '#006621', fontSize: 13 }}>{x.url}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginTop: 18, padding: '8px 0 4px', borderTop: '1px dashed #e5e7eb' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Popular:</span>
          {['Auckland', 'Hamilton', 'Wellington', 'Christchurch', 'Lincoln', 'Dunedin'].map((city) => (
            <a key={city} href={`/rent/${city.toLowerCase()}`} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #e5e7eb', borderRadius: 999, textDecoration: 'none', color: '#4b5563', background: '#fff' }}>
              {city}
            </a>
          ))}
        </div>
      </section>

      <footer
        style={{
          marginTop: 'auto',
          paddingTop: 12,
          borderTop: '1px solid #eceff3',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          color: '#9ca3af',
          fontSize: 12
        }}
      >
        {typeof visitCount === 'number' ? <span>👀 {visitCount.toLocaleString()}</span> : null}
        {typeof onlineCount === 'number' ? <span>🟢 {onlineCount.toLocaleString()} online</span> : null}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          aria-label={t.language}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 999,
            padding: '4px 10px',
            background: '#fff',
            color: '#6b7280',
            fontSize: 12
          }}
        >
          <option value="en">EN</option>
          <option value="vi">VI</option>
          <option value="zh">中文</option>
          <option value="hi">हिंदी</option>
        </select>
        <button
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 999,
            padding: '4px 10px',
            background: 'transparent',
            color: '#9ca3af',
            fontSize: 12,
            cursor: 'pointer'
          }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </footer>

      <style jsx global>{`
        body {
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
          background: linear-gradient(180deg, #f8fbff 0%, #f9fafb 38%, #ffffff 100%);
        }

        .descClamp {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .searchInputWrap textarea {
          width: 100%;
          font-family: inherit;
        }

        .heroDemo {
          transition: box-shadow 0.2s ease;
        }

        .heroDemo:hover {
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
        }

        .heroDemo > div {
          flex: 1;
        }

        @media (max-width: 768px) {
          .home-topbar {
            margin-bottom: 20px !important;
            padding: 0 12px !important;
            justify-content: center !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
          }

          .miniBrand {
            font-size: 16px !important;
          }

          .topNav {
            justify-content: flex-end !important;
            gap: 4px !important;
          }

          .topNav .btn-sm {
            padding: 5px 8px !important;
            font-size: 12px !important;
          }

          .homeHero {
            border-radius: 16px !important;
            padding: 18px 12px !important;
          }

          .homeHero > h1 {
            font-size: 17px !important;
          }

          .searchBar {
            border-radius: 14px !important;
            flex-wrap: wrap;
            gap: 8px !important;
            padding: 8px !important;
          }

          .searchInputWrap {
            flex-basis: 100%;
          }

          .searchInputWrap textarea {
            min-height: 60px;
            font-size: 14px !important;
            padding: '10px 12px' !important;
          }

          .heroDemo {
            flex-direction: column;
          }

          .searchActions {
            width: 100%;
            justify-content: flex-start;
            gap: 6px !important;
            flex-wrap: wrap;
          }

          .searchActions button {
            flex: 1;
          }
        }
      `}</style>
    </main>
  );
}
