// Mock data for the brand-side demo experience at /demo/brand/*
// All data is SA-flavoured (ZAR, SA cities, SA-style names) and never persisted.

import creator1Photo from "@/assets/demo/creator-1-lerato.png";
import creator2Photo from "@/assets/demo/creator-2-sam.png";
import creator3Photo from "@/assets/demo/creator-3-sipho.png";
import creator4Photo from "@/assets/demo/creator-4-aaliyah.png";
import creator5Photo from "@/assets/demo/creator-5-kabelo.png";
import creator6Photo from "@/assets/demo/creator-6-jessica.png";
import creator7Photo from "@/assets/demo/creator-7-mbali.png";
import creator8Photo from "@/assets/demo/creator-8-riaan.png";
import creator9Photo from "@/assets/demo/creator-9-zinhle.png";
import creator10Photo from "@/assets/demo/creator-10-rebecca.png";
import creator11Photo from "@/assets/demo/creator-11-jaden.png";
import creator12Photo from "@/assets/demo/creator-12-refiloe.png";

export const demoBrand = {
  id: "demo-brand-1",
  name: "Demo Brand",
  status: "approved" as const,
  category: "Health & Beauty",
  description:
    "A premium South African beauty and wellness brand crafting clean, locally-sourced skincare. We partner with creators who share our love for botanical ingredients and considered routines.",
  logo_url: null as string | null,
  hero_image_url: null as string | null,
  website_url: "https://demobrand.co.za",
  instagram_url: "https://instagram.com/demobrand.za",
  tiktok_url: "https://tiktok.com/@demobrand",
  commission_percent: 15,
  refund_buffer_days: 30,
  tracking_status: "connected",
  shop_domain: "demobrand.myshopify.com",
  woocommerce_site_url: "https://demobrand.co.za",
  shopify_connected: true,
  woocommerce_connected: false,
  api_key_masked: "msk_••••••••••••••••a4f2",
  shopify_last_postback_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
};

export interface DemoCreator {
  id: string;
  display_name: string;
  username: string;
  photo_url: string | null;
  bio: string;
  location_tags: string[];
  niche_tags: string[];
  attribute_tags: string[];
  instagram_connected: boolean;
  instagram_username: string;
  follower_count: number;
  following_count: number;
  engagement_rate: number;
  avg_likes: number;
  avg_comments: number;
  post_count: number;
  tier: "Insider" | "Featured" | "Tastemaker";
}

export const demoCreators: DemoCreator[] = [
  {
    id: "creator-1",
    display_name: "Lerato Mokoena",
    username: "leratostyles",
    photo_url: creator1Photo,
    bio: "Cape Town based beauty editor sharing minimalist skincare and clean beauty discoveries.",
    location_tags: ["Cape Town"],
    niche_tags: ["Beauty", "Skincare", "Lifestyle"],
    attribute_tags: ["Editorial", "Minimalist"],
    instagram_connected: true,
    instagram_username: "leratostyles",
    follower_count: 48200,
    following_count: 612,
    engagement_rate: 4.8,
    avg_likes: 2150,
    avg_comments: 165,
    post_count: 312,
    tier: "Tastemaker",
  },
  {
    id: "creator-2",
    display_name: "Sam Solomons",
    username: "samwellness",
    photo_url: creator2Photo,
    bio: "Durban-based wellness creator sharing daily routines, plant-based finds and the products I actually use.",
    location_tags: ["Durban"],
    niche_tags: ["Wellness", "Fitness", "Food"],
    attribute_tags: ["Authentic", "Calming"],
    instagram_connected: true,
    instagram_username: "sam.wellness",
    follower_count: 22400,
    following_count: 410,
    engagement_rate: 6.2,
    avg_likes: 1380,
    avg_comments: 102,
    post_count: 198,
    tier: "Featured",
  },
  {
    id: "creator-3",
    display_name: "Sipho Khumalo",
    username: "siphofit",
    photo_url: creator3Photo,
    bio: "Joburg-based fitness coach. Strength training, recovery, and supplements that actually work.",
    location_tags: ["Johannesburg"],
    niche_tags: ["Fitness", "Wellness"],
    attribute_tags: ["Energetic", "Educational"],
    instagram_connected: true,
    instagram_username: "siphofit",
    follower_count: 71300,
    following_count: 824,
    engagement_rate: 3.9,
    avg_likes: 2780,
    avg_comments: 198,
    post_count: 421,
    tier: "Tastemaker",
  },
  {
    id: "creator-4",
    display_name: "Aaliyah Patel",
    username: "aaliyahbeauty",
    photo_url: creator4Photo,
    bio: "Pretoria. Makeup artist & content creator. Tutorials, reviews, and South African beauty edits.",
    location_tags: ["Pretoria"],
    niche_tags: ["Beauty", "Makeup"],
    attribute_tags: ["Tutorials", "Reviews"],
    instagram_connected: true,
    instagram_username: "aaliyah.beauty",
    follower_count: 18700,
    following_count: 295,
    engagement_rate: 7.1,
    avg_likes: 1190,
    avg_comments: 138,
    post_count: 156,
    tier: "Featured",
  },
  {
    id: "creator-5",
    display_name: "Kabelo Dlamini",
    username: "kabelolifestyle",
    photo_url: creator5Photo,
    bio: "Lifestyle and travel - exploring SA one weekend at a time.",
    location_tags: ["Cape Town", "Stellenbosch"],
    niche_tags: ["Lifestyle", "Travel"],
    attribute_tags: ["Aspirational", "Outdoor"],
    instagram_connected: true,
    instagram_username: "kabelo.lifestyle",
    follower_count: 35600,
    following_count: 532,
    engagement_rate: 4.4,
    avg_likes: 1620,
    avg_comments: 124,
    post_count: 287,
    tier: "Featured",
  },
  {
    id: "creator-6",
    display_name: "Jessica Williams",
    username: "jessicamoms",
    photo_url: creator6Photo,
    bio: "Mom of two in Bloem. Family-friendly beauty, baby skincare, and home routines.",
    location_tags: ["Bloemfontein"],
    niche_tags: ["Parenting", "Beauty", "Lifestyle"],
    attribute_tags: ["Relatable", "Family"],
    instagram_connected: true,
    instagram_username: "jessica.moms",
    follower_count: 14200,
    following_count: 388,
    engagement_rate: 5.9,
    avg_likes: 720,
    avg_comments: 89,
    post_count: 142,
    tier: "Featured",
  },
  {
    id: "creator-7",
    display_name: "Mbali Zulu",
    username: "mbaliedits",
    photo_url: creator7Photo,
    bio: "Editorial beauty creator. Bold colour, soft skin, big ideas. Based in Sandton.",
    location_tags: ["Johannesburg"],
    niche_tags: ["Beauty", "Fashion"],
    attribute_tags: ["Editorial", "Bold"],
    instagram_connected: true,
    instagram_username: "mbali.edits",
    follower_count: 56800,
    following_count: 478,
    engagement_rate: 5.1,
    avg_likes: 2410,
    avg_comments: 188,
    post_count: 234,
    tier: "Tastemaker",
  },
  {
    id: "creator-8",
    display_name: "Riaan de Jager",
    username: "riaanwellness",
    photo_url: creator8Photo,
    bio: "Men's wellness, grooming, and adventure in the Western Cape.",
    location_tags: ["Cape Town"],
    niche_tags: ["Wellness", "Men's Grooming"],
    attribute_tags: ["Adventurous", "Practical"],
    instagram_connected: false,
    instagram_username: "riaan.wellness",
    follower_count: 9800,
    following_count: 220,
    engagement_rate: 6.4,
    avg_likes: 510,
    avg_comments: 64,
    post_count: 98,
    tier: "Insider",
  },
  {
    id: "creator-9",
    display_name: "Zinhle Mthembu",
    username: "zinhlebeauty",
    photo_url: creator9Photo,
    bio: "Soft glam, brown skin beauty, and routines that work in the African sun.",
    location_tags: ["Durban"],
    niche_tags: ["Beauty", "Skincare"],
    attribute_tags: ["Soft", "Inclusive"],
    instagram_connected: true,
    instagram_username: "zinhle.beauty",
    follower_count: 32100,
    following_count: 405,
    engagement_rate: 5.6,
    avg_likes: 1680,
    avg_comments: 142,
    post_count: 211,
    tier: "Featured",
  },
  {
    id: "creator-10",
    display_name: "Rebecca Carter",
    username: "rebeccalife",
    photo_url: creator10Photo,
    bio: "Lifestyle, food, and slow Sundays. Joburg-based. ",
    location_tags: ["Johannesburg"],
    niche_tags: ["Lifestyle", "Food"],
    attribute_tags: ["Cosy", "Authentic"],
    instagram_connected: true,
    instagram_username: "rebecca.life",
    follower_count: 27500,
    following_count: 612,
    engagement_rate: 4.7,
    avg_likes: 1230,
    avg_comments: 108,
    post_count: 178,
    tier: "Featured",
  },
  {
    id: "creator-11",
    display_name: "Jaden Pillay",
    username: "jadenfit",
    photo_url: creator11Photo,
    bio: "Calisthenics, mobility, and supplements. PT in Durban.",
    location_tags: ["Durban"],
    niche_tags: ["Fitness"],
    attribute_tags: ["Performance", "Educational"],
    instagram_connected: true,
    instagram_username: "jaden.fit",
    follower_count: 41800,
    following_count: 388,
    engagement_rate: 4.2,
    avg_likes: 1750,
    avg_comments: 142,
    post_count: 256,
    tier: "Featured",
  },
  {
    id: "creator-12",
    display_name: "Refiloe Sithole",
    username: "refiloeglow",
    photo_url: creator12Photo,
    bio: "Newer voice in SA tech. Affordable finds, honest reviews. ",
    location_tags: ["Johannesburg"],
    niche_tags: ["Beauty"],
    attribute_tags: ["Honest", "Affordable"],
    instagram_connected: true,
    instagram_username: "refiloe.glow",
    follower_count: 8400,
    following_count: 512,
    engagement_rate: 8.1,
    avg_likes: 620,
    avg_comments: 82,
    post_count: 112,
    tier: "Insider",
  },
];

export const demoSavedLists = [
  {
    id: "list-1",
    name: "Beauty A-list",
    creator_ids: ["creator-1", "creator-7", "creator-9", "creator-4"],
  },
  {
    id: "list-2",
    name: "Wellness shortlist",
    creator_ids: ["creator-2", "creator-3", "creator-8"],
  },
];

// ===== ANALYTICS =====

const today = new Date();
function daysAgo(n: number): Date {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d;
}

// Generate ~40 orders spread over 90 days
const orderSeed: Array<{ creator: string; product: string; total: number; daysBack: number }> = [
  { creator: "creator-1", product: "Botanical Serum", total: 745, daysBack: 1 },
  { creator: "creator-3", product: "Recovery Cream", total: 480, daysBack: 2 },
  { creator: "creator-7", product: "Glow Oil Set", total: 1290, daysBack: 2 },
  { creator: "creator-2", product: "Calm Tea Bundle", total: 360, daysBack: 3 },
  { creator: "creator-1", product: "Cleansing Balm", total: 295, daysBack: 4 },
  { creator: "creator-9", product: "Tinted Sunscreen", total: 410, daysBack: 5 },
  { creator: "creator-3", product: "Protein Stack", total: 920, daysBack: 5 },
  { creator: "creator-7", product: "Botanical Serum", total: 745, daysBack: 6 },
  { creator: "creator-11", product: "Recovery Cream", total: 480, daysBack: 7 },
  { creator: "creator-1", product: "Glow Oil Set", total: 1290, daysBack: 8 },
  { creator: "creator-4", product: "Tinted Sunscreen", total: 410, daysBack: 9 },
  { creator: "creator-1", product: "Botanical Serum", total: 745, daysBack: 10 },
  { creator: "creator-7", product: "Cleansing Balm", total: 295, daysBack: 11 },
  { creator: "creator-5", product: "Calm Tea Bundle", total: 360, daysBack: 12 },
  { creator: "creator-2", product: "Yoga Recovery Set", total: 680, daysBack: 13 },
  { creator: "creator-3", product: "Protein Stack", total: 920, daysBack: 14 },
  { creator: "creator-1", product: "Glow Oil Set", total: 1290, daysBack: 15 },
  { creator: "creator-9", product: "Botanical Serum", total: 745, daysBack: 17 },
  { creator: "creator-7", product: "Tinted Sunscreen", total: 410, daysBack: 18 },
  { creator: "creator-10", product: "Calm Tea Bundle", total: 360, daysBack: 19 },
  { creator: "creator-1", product: "Cleansing Balm", total: 295, daysBack: 21 },
  { creator: "creator-3", product: "Recovery Cream", total: 480, daysBack: 23 },
  { creator: "creator-7", product: "Botanical Serum", total: 745, daysBack: 25 },
  { creator: "creator-2", product: "Yoga Recovery Set", total: 680, daysBack: 27 },
  { creator: "creator-1", product: "Glow Oil Set", total: 1290, daysBack: 29 },
  { creator: "creator-11", product: "Protein Stack", total: 920, daysBack: 32 },
  { creator: "creator-4", product: "Tinted Sunscreen", total: 410, daysBack: 35 },
  { creator: "creator-9", product: "Cleansing Balm", total: 295, daysBack: 38 },
  { creator: "creator-1", product: "Botanical Serum", total: 745, daysBack: 41 },
  { creator: "creator-7", product: "Glow Oil Set", total: 1290, daysBack: 44 },
  { creator: "creator-3", product: "Recovery Cream", total: 480, daysBack: 47 },
  { creator: "creator-2", product: "Calm Tea Bundle", total: 360, daysBack: 50 },
  { creator: "creator-10", product: "Cleansing Balm", total: 295, daysBack: 54 },
  { creator: "creator-1", product: "Tinted Sunscreen", total: 410, daysBack: 58 },
  { creator: "creator-7", product: "Botanical Serum", total: 745, daysBack: 62 },
  { creator: "creator-3", product: "Protein Stack", total: 920, daysBack: 67 },
  { creator: "creator-1", product: "Glow Oil Set", total: 1290, daysBack: 71 },
  { creator: "creator-9", product: "Botanical Serum", total: 745, daysBack: 76 },
  { creator: "creator-2", product: "Yoga Recovery Set", total: 680, daysBack: 81 },
  { creator: "creator-7", product: "Cleansing Balm", total: 295, daysBack: 86 },
];

export const demoOrders = orderSeed.map((o, i) => ({
  id: `order-${i + 1}`,
  order_id: `MS${String(20480 + i).padStart(6, "0")}`,
  creator_id: o.creator,
  product_name: o.product,
  order_total: o.total,
  commission_amount: Math.round(o.total * 0.15 * 100) / 100,
  status: i < 3 ? "pending" : i % 11 === 0 ? "refunded" : "confirmed",
  currency: "ZAR",
  created_at: daysAgo(o.daysBack).toISOString(),
}));

// Clicks: ~5x orders, distributed similarly
export const demoClicks = (() => {
  const clicks: Array<{ id: string; creator_id: string; created_at: string }> = [];
  let id = 1;
  orderSeed.forEach((o) => {
    const clicksForOrder = 4 + Math.floor(Math.random() * 4);
    for (let j = 0; j < clicksForOrder; j++) {
      clicks.push({
        id: `click-${id++}`,
        creator_id: o.creator,
        created_at: daysAgo(o.daysBack + Math.floor(Math.random() * 2)).toISOString(),
      });
    }
  });
  return clicks;
})();

// ===== MESSAGES =====

export interface DemoMessage {
  id: string;
  sender: "brand" | "creator";
  content: string;
  message_type: "text" | "brief" | "gift_offer" | "discount_code" | "mention_request";
  created_at: string;
  meta?: any;
}

export interface DemoConversation {
  id: string;
  creator_id: string;
  unread: number;
  last_message_at: string;
  messages: DemoMessage[];
}

export const demoConversations: DemoConversation[] = [
  {
    id: "conv-1",
    creator_id: "creator-1",
    unread: 2,
    last_message_at: daysAgo(0).toISOString(),
    messages: [
      {
        id: "m-1-1",
        sender: "brand",
        content: "Hi Lerato, we love your editorial style and would love to partner on our Botanical Serum launch.",
        message_type: "text",
        created_at: daysAgo(3).toISOString(),
      },
      {
        id: "m-1-2",
        sender: "creator",
        content: "Hi! Thanks for reaching out — I'd love to hear more. What did you have in mind?",
        message_type: "text",
        created_at: daysAgo(3).toISOString(),
      },
      {
        id: "m-1-3",
        sender: "brand",
        content: "Sending over a brief now.",
        message_type: "text",
        created_at: daysAgo(2).toISOString(),
      },
      {
        id: "m-1-4",
        sender: "brand",
        content: "Botanical Serum Launch — Editorial Story",
        message_type: "brief",
        created_at: daysAgo(2).toISOString(),
        meta: {
          title: "Botanical Serum Launch",
          deliverables: "1 Reel + 2 Stories",
          fee: 4500,
          deadline: "2 weeks",
          status: "accepted",
        },
      },
      {
        id: "m-1-5",
        sender: "creator",
        content: "Accepted! Excited to shoot this weekend.",
        message_type: "text",
        created_at: daysAgo(1).toISOString(),
      },
      {
        id: "m-1-6",
        sender: "creator",
        content: "Quick question — do you have any specific shade preferences for the bottle in shot?",
        message_type: "text",
        created_at: daysAgo(0).toISOString(),
      },
    ],
  },
  {
    id: "conv-2",
    creator_id: "creator-3",
    unread: 0,
    last_message_at: daysAgo(1).toISOString(),
    messages: [
      {
        id: "m-2-1",
        sender: "brand",
        content: "Hey Sipho — interested in our Recovery Cream for your audience?",
        message_type: "text",
        created_at: daysAgo(5).toISOString(),
      },
      {
        id: "m-2-2",
        sender: "brand",
        content: "Recovery Cream — PR Send",
        message_type: "gift_offer",
        created_at: daysAgo(5).toISOString(),
        meta: {
          campaign: "Recovery Cream PR",
          product: "Recovery Cream 100ml",
          value: 480,
          status: "shipped",
        },
      },
      {
        id: "m-2-3",
        sender: "creator",
        content: "Received — looks amazing. Will post Sunday.",
        message_type: "text",
        created_at: daysAgo(2).toISOString(),
      },
      {
        id: "m-2-4",
        sender: "creator",
        content: "Posted! Tagged you, story link incoming.",
        message_type: "text",
        created_at: daysAgo(1).toISOString(),
      },
    ],
  },
  {
    id: "conv-3",
    creator_id: "creator-7",
    unread: 1,
    last_message_at: daysAgo(0).toISOString(),
    messages: [
      {
        id: "m-3-1",
        sender: "brand",
        content: "Mbali — sending you a unique discount code for your audience.",
        message_type: "text",
        created_at: daysAgo(2).toISOString(),
      },
      {
        id: "m-3-2",
        sender: "brand",
        content: "Discount code MBALI20",
        message_type: "discount_code",
        created_at: daysAgo(2).toISOString(),
        meta: {
          code: "MBALI20",
          discount_type: "percentage",
          discount_value: 20,
          expiry: "2026-06-30",
          status: "active",
        },
      },
      {
        id: "m-3-3",
        sender: "creator",
        content: "Love it! Will share in stories tomorrow.",
        message_type: "text",
        created_at: daysAgo(1).toISOString(),
      },
      {
        id: "m-3-4",
        sender: "creator",
        content: "By the way, code is performing well — already 12 redemptions 🙌",
        message_type: "text",
        created_at: daysAgo(0).toISOString(),
      },
    ],
  },
  {
    id: "conv-4",
    creator_id: "creator-9",
    unread: 0,
    last_message_at: daysAgo(7).toISOString(),
    messages: [
      {
        id: "m-4-1",
        sender: "brand",
        content: "Hi Zinhle, thanks for the tag last week — clicks are up 30% from your audience.",
        message_type: "text",
        created_at: daysAgo(8).toISOString(),
      },
      {
        id: "m-4-2",
        sender: "creator",
        content: "Amazing! Happy to do another collab — let me know what's launching next.",
        message_type: "text",
        created_at: daysAgo(7).toISOString(),
      },
    ],
  },
  {
    id: "conv-5",
    creator_id: "creator-2",
    unread: 0,
    last_message_at: daysAgo(12).toISOString(),
    messages: [
      {
        id: "m-5-1",
        sender: "brand",
        content: "Sam — would you be open to a wellness mention campaign?",
        message_type: "text",
        created_at: daysAgo(15).toISOString(),
      },
      {
        id: "m-5-2",
        sender: "brand",
        content: "Mention request — Calm Tea Bundle",
        message_type: "mention_request",
        created_at: daysAgo(15).toISOString(),
        meta: {
          deliverable: "1 Story mention + 1 Feed Reel",
          fee: 2200,
          deadline: "2026-05-15",
          status: "in_progress",
        },
      },
      {
        id: "m-5-3",
        sender: "creator",
        content: "Working on it — will share draft Monday.",
        message_type: "text",
        created_at: daysAgo(12).toISOString(),
      },
    ],
  },
];

export const demoMessageRequests = [
  {
    id: "req-1",
    creator_id: "creator-12",
    message:
      "Hi! I'm Refiloe — newer creator but my engagement is strong. I'd love to feature your Tinted Sunscreen for an honest review on my channel.",
    created_at: daysAgo(1).toISOString(),
  },
  {
    id: "req-2",
    creator_id: "creator-5",
    message:
      "Hey, big fan of Demo Brand. I host travel content across SA — would your products fit a weekend skincare routine series?",
    created_at: daysAgo(4).toISOString(),
  },
];

// ===== MENTIONS =====

export const demoMentionCampaigns = [
  {
    id: "mention-1",
    title: "Botanical Serum Launch — Editorial Story",
    description: "Single Reel showcasing the serum in a natural light editorial setting. SA aesthetic preferred.",
    deliverable_type: "Reel",
    deliverable_description: "1 Reel (15-30s), product clearly visible, mention @demobrand.za",
    fee_amount: 4500,
    revision_rounds: 2,
    content_deadline: "2026-05-10",
    max_creators: 5,
    status: "active",
    requests_count: 3,
    accepted_count: 2,
  },
  {
    id: "mention-2",
    title: "Calm Tea Bundle — Wellness Mentions",
    description: "Story-only mention featuring our wellness tea bundle in a creator's morning routine.",
    deliverable_type: "Story",
    deliverable_description: "2 Stories with product tag and swipe-up",
    fee_amount: 1800,
    revision_rounds: 1,
    content_deadline: "2026-05-20",
    max_creators: 8,
    status: "active",
    requests_count: 6,
    accepted_count: 4,
  },
  {
    id: "mention-3",
    title: "Recovery Cream — Athlete Edit",
    description: "Reel showing the recovery cream as part of a fitness recovery routine.",
    deliverable_type: "Reel",
    deliverable_description: "1 Reel (30-60s) with workout context",
    fee_amount: 3200,
    revision_rounds: 2,
    content_deadline: "2026-06-01",
    max_creators: 4,
    status: "draft",
    requests_count: 0,
    accepted_count: 0,
  },
];

// ===== GIFTING =====

export const demoGiftCampaigns = [
  {
    id: "gift-1",
    title: "Botanical Serum — Spring PR Send",
    product_name: "Botanical Serum 30ml",
    description: "Our hero product, sent in a custom-printed PR box with a handwritten note.",
    product_value: 745,
    status: "active",
    requests: [
      { id: "gr-1", creator_id: "creator-1", status: "shipped", tracking: "FXSA-9821", created_at: daysAgo(4).toISOString() },
      { id: "gr-2", creator_id: "creator-7", status: "posted", tracking: "FXSA-9822", created_at: daysAgo(8).toISOString(), post_url: "https://instagram.com/p/demo1" },
      { id: "gr-3", creator_id: "creator-4", status: "approved", tracking: null, created_at: daysAgo(2).toISOString() },
      { id: "gr-4", creator_id: "creator-9", status: "pending", tracking: null, created_at: daysAgo(1).toISOString() },
    ],
  },
  {
    id: "gift-2",
    title: "Recovery Cream — Athlete Send",
    product_name: "Recovery Cream 100ml",
    description: "Sent to fitness creators with a printed recovery routine card.",
    product_value: 480,
    status: "active",
    requests: [
      { id: "gr-5", creator_id: "creator-3", status: "posted", tracking: "FXSA-9830", created_at: daysAgo(10).toISOString(), post_url: "https://instagram.com/p/demo2" },
      { id: "gr-6", creator_id: "creator-11", status: "shipped", tracking: "FXSA-9831", created_at: daysAgo(5).toISOString() },
      { id: "gr-7", creator_id: "creator-8", status: "pending", tracking: null, created_at: daysAgo(2).toISOString() },
    ],
  },
];

// ===== DISCOUNT CODES =====

export const demoDiscountCodes = [
  { id: "dc-1", code: "LERATO20", creator_id: "creator-1", discount_type: "percentage", discount_value: 20, usage_count: 47, usage_limit: 200, is_active: true, expiry_date: "2026-06-30", synced: true },
  { id: "dc-2", code: "MBALI20", creator_id: "creator-7", discount_type: "percentage", discount_value: 20, usage_count: 31, usage_limit: 200, is_active: true, expiry_date: "2026-06-30", synced: true },
  { id: "dc-3", code: "SIPHO15", creator_id: "creator-3", discount_type: "percentage", discount_value: 15, usage_count: 18, usage_limit: 150, is_active: true, expiry_date: "2026-05-31", synced: true },
  { id: "dc-4", code: "WELCOME50", creator_id: null, discount_type: "fixed", discount_value: 50, usage_count: 124, usage_limit: 500, is_active: true, expiry_date: null, synced: true },
  { id: "dc-5", code: "AUTUMN10", creator_id: null, discount_type: "percentage", discount_value: 10, usage_count: 8, usage_limit: 100, is_active: true, expiry_date: "2026-05-15", synced: true },
  { id: "dc-6", code: "AALIYAH25", creator_id: "creator-4", discount_type: "percentage", discount_value: 25, usage_count: 0, usage_limit: 100, is_active: false, expiry_date: "2026-07-31", synced: false },
];

// ===== PAYMENTS =====

export const demoPayments = [
  {
    id: "pay-1",
    period_start: "2026-04-01",
    period_end: "2026-04-30",
    label: "April 2026",
    amount: 6250,
    status: "due",
    proof_url: null,
    admin_note: null,
    created_at: null,
    total_sales: 62500,
    commission_owed: 6250,
    order_count: 18,
  },
  {
    id: "pay-2",
    period_start: "2026-03-01",
    period_end: "2026-03-31",
    label: "March 2026",
    amount: 9420,
    status: "submitted",
    proof_url: "https://example.com/proof.pdf",
    admin_note: null,
    created_at: daysAgo(8).toISOString(),
    total_sales: 94200,
    commission_owed: 9420,
    order_count: 27,
  },
  {
    id: "pay-3",
    period_start: "2026-02-01",
    period_end: "2026-02-28",
    label: "February 2026",
    amount: 7180,
    status: "verified",
    proof_url: "https://example.com/proof2.pdf",
    admin_note: "Received and verified.",
    created_at: daysAgo(45).toISOString(),
    total_sales: 71800,
    commission_owed: 7180,
    order_count: 22,
  },
  {
    id: "pay-4",
    period_start: "2026-01-01",
    period_end: "2026-01-31",
    label: "January 2026",
    amount: 5240,
    status: "verified",
    proof_url: "https://example.com/proof3.pdf",
    admin_note: "Received and verified.",
    created_at: daysAgo(75).toISOString(),
    total_sales: 52400,
    commission_owed: 5240,
    order_count: 16,
  },
];

// ===== HELPERS =====

export function getCreator(id: string): DemoCreator | undefined {
  return demoCreators.find((c) => c.id === id);
}

export function formatZAR(v: number): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(v);
}
