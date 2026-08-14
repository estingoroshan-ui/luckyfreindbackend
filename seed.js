import { run, getOne, query } from './db.js';

export const seedData = async () => {
  console.log('Seeding default settings...');
  const defaultSettings = [
    ['app_name', 'Lucky Friends'],
    ['app_logo', '/logo.png'],
    ['primary_color', '#ec4899'],
    ['accent_color', '#8b5cf6'],
    ['currency_symbol', '₹'],
    ['platform_commission_pct', '30'],
    ['tax_pct', '0'],
    ['audio_rate_min', '10'],
    ['audio_rate_max', '50'],
    ['video_rate_min', '20'],
    ['video_rate_max', '100'],
    ['free_chat_limit', '5'],
    ['min_withdrawal_amount', '500'],
    ['female_auto_approve', '1'],
  ];

  for (const [key, value] of defaultSettings) {
    await run(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);`, [key, value]);
  }

  // Seed CMS pages
  console.log('Seeding CMS pages...');
  const cmsPages = [
    ['terms', 'Terms & Conditions', 'Welcome to Friendly Dating. Users must be 18+ to register. Audio/video calls are billed per minute from wallet balances. Female creators earn revenue minus platform commissions.'],
    ['privacy', 'Privacy Policy', 'We value your privacy. Personal phone numbers, real names, bank account details, and KYC documents are kept strictly confidential and never publicly disclosed.'],
    ['refund', 'Refund Policy', 'Wallet recharges are non-refundable once credited. Unspent wallet balances remain in the account. Disputed calls can be reported to support for manual review.'],
    ['safety', 'Safety Guidelines', 'Be respectful to all members. Harassment, nudity, adult content, spam, and underage access are strictly forbidden and will result in permanent suspension.'],
    ['faq', 'Frequently Asked Questions', 'Q: How do calls work? A: Male users pay per minute from their wallet. Female users earn per minute from answered calls. Q: What is the minimum withdrawal? A: Female creators can withdraw once their available balance reaches ₹500.'],
    ['about', 'About Friendly Dating', 'Friendly Dating connects people across India for genuine friendship, interactive chat, and paid 1-on-1 audio/video calls with verified creators.']
  ];

  for (const [slug, title, content] of cmsPages) {
    await run(`INSERT OR REPLACE INTO cms_pages (slug, title, content) VALUES (?, ?, ?);`, [slug, title, content]);
  }

  // Seed Virtual Gifts
  console.log('Seeding Virtual Gifts...');
  const gifts = [
    ['Rose 🌹', 10, 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=100&auto=format&fit=crop&q=80', 70],
    ['Red Heart ❤️', 25, 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=100&auto=format&fit=crop&q=80', 70],
    ['Coffee Cup ☕', 50, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=100&auto=format&fit=crop&q=80', 75],
    ['Chocolate Box 🍫', 100, 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=100&auto=format&fit=crop&q=80', 75],
    ['Royal Crown 👑', 250, 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=100&auto=format&fit=crop&q=80', 80],
    ['Sparkling Diamond 💎', 500, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=100&auto=format&fit=crop&q=80', 80]
  ];

  const existingGifts = await query(`SELECT COUNT(*) as count FROM gifts`);
  if (existingGifts[0].count === 0) {
    for (const [name, price, icon, female_share_pct] of gifts) {
      await run(`INSERT INTO gifts (name, price, icon, female_share_pct) VALUES (?, ?, ?, ?);`, [name, price, icon, female_share_pct]);
    }
  }

  // Seed Admin user
  const adminCheck = await getOne(`SELECT * FROM users WHERE email = 'admin@friendlydating.com'`);
  if (!adminCheck) {
    await run(`
      INSERT INTO users (full_name, email, mobile, password, gender, dob, city, role, status)
      VALUES ('Super Admin', 'admin@friendlydating.com', '9999999999', 'admin123', 'other', '1990-01-01', 'Mumbai', 'admin', 'active');
    `);
  }

  // Seed Male Users (15 users)
  console.log('Seeding Male Users...');
  const maleUsersData = [
    { name: 'Rohan Sharma', email: 'rohan@gmail.com', mobile: '9876543210', city: 'Delhi', balance: 850 },
    { name: 'Aarav Mehta', email: 'aarav@gmail.com', mobile: '9876543211', city: 'Mumbai', balance: 1420 },
    { name: 'Vikram Singh', email: 'vikram@gmail.com', mobile: '9876543212', city: 'Bangalore', balance: 350 },
    { name: 'Kabir Kapoor', email: 'kabir@gmail.com', mobile: '9876543213', city: 'Pune', balance: 2100 },
    { name: 'Aditya Verma', email: 'aditya@gmail.com', mobile: '9876543214', city: 'Hyderabad', balance: 50 },
    { name: 'Siddharth Rao', email: 'siddharth@gmail.com', mobile: '9876543215', city: 'Chennai', balance: 670 },
    { name: 'Karan Joshi', email: 'karan@gmail.com', mobile: '9876543216', city: 'Ahmedabad', balance: 1990 },
    { name: 'Dev Malhotra', email: 'dev@gmail.com', mobile: '9876543217', city: 'Kolkata', balance: 420 },
    { name: 'Varun Nair', email: 'varun@gmail.com', mobile: '9876543218', city: 'Kochi', balance: 120 },
    { name: 'Aryan Gupta', email: 'aryan@gmail.com', mobile: '9876543219', city: 'Jaipur', balance: 950 },
    { name: 'Manish Pandey', email: 'manish@gmail.com', mobile: '9876543220', city: 'Lucknow', balance: 310 },
    { name: 'Rahul Roy', email: 'rahul@gmail.com', mobile: '9876543221', city: 'Chandigarh', balance: 1550 },
    { name: 'Harsh Saxena', email: 'harsh@gmail.com', mobile: '9876543222', city: 'Indore', balance: 280 },
    { name: 'Rishi Chopra', email: 'rishi@gmail.com', mobile: '9876543223', city: 'Nagpur', balance: 740 },
    { name: 'Priyauday Das', email: 'priyauday@gmail.com', mobile: '9876543224', city: 'Bhubaneswar', balance: 180 }
  ];

  for (let i = 0; i < maleUsersData.length; i++) {
    const m = maleUsersData[i];
    let user = await getOne(`SELECT * FROM users WHERE email = ?`, [m.email]);
    if (!user) {
      const res = await run(`
        INSERT INTO users (full_name, email, mobile, password, gender, dob, city, role, referral_code, status)
        VALUES (?, ?, ?, 'password123', 'male', '1996-05-12', ?, 'male', ?, 'active');
      `, [m.name, m.email, m.mobile, m.city, `MALE${100 + i}`]);

      const userId = res.lastID;
      await run(`
        INSERT INTO wallets (user_id, balance, promo_balance, total_recharged, total_spent)
        VALUES (?, ?, 50, ?, ?);
      `, [userId, m.balance, m.balance + 300, 300]);

      await run(`
        INSERT INTO wallet_transactions (user_id, type, amount, bonus_amount, gateway_ref, payment_method, status, description)
        VALUES (?, 'recharge', 499, 50, 'PAY_982312', 'UPI', 'success', 'Wallet Recharge Tier ₹499');
      `, [userId]);
    }
  }

  // Seed Female Creator Profiles (30 Female Profiles)
  console.log('Seeding Female Creator Profiles...');
  const femaleData = [
    {
      displayName: 'Priya Sharma', realName: 'Priya Kumari Sharma', city: 'Mumbai', languages: 'Hindi, English',
      about: 'Loves deep conversations, acoustic music, and coffee dates. Talk to me anytime! ✨',
      interests: 'Music, Travel, Photography, Cooking', audioRate: 15, videoRate: 30, online: 'online', verified: 1, featured: 1, rec: 1,
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Ananya Roy', realName: 'Ananya Devi Roy', city: 'Kolkata', languages: 'Bengali, Hindi, English',
      about: 'Passionate dancer & bookworm. Looking for friendly chats and good vibes 🌸',
      interests: 'Dancing, Books, Movies, Art', audioRate: 20, videoRate: 35, online: 'online', verified: 1, featured: 1, rec: 1,
      photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Sneha Patel', realName: 'Sneha Jayesh Patel', city: 'Ahmedabad', languages: 'Gujarati, Hindi, English',
      about: 'Fashion enthusiast and tech lover. Friendly and cheerful host!',
      interests: 'Fashion, Shopping, Fitness', audioRate: 12, videoRate: 25, online: 'online', verified: 1, featured: 0, rec: 1,
      photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Riya Verma', realName: 'Riya Ramesh Verma', city: 'Delhi', languages: 'Hindi, Punjabi, English',
      about: 'Bubbly personality with a smile that brightens your day! Call me for a chat 💛',
      interests: 'Foodie, Stand-up Comedy, Pets', audioRate: 15, videoRate: 30, online: 'online', verified: 1, featured: 1, rec: 1,
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Kavya Nair', realName: 'Kavya Unnikrishnan Nair', city: 'Bangalore', languages: 'Malayalam, English, Tamil',
      about: 'Software engineer by day, friendly host by night. Let us share stories!',
      interests: 'Coding, Trekking, Podcasts', audioRate: 18, videoRate: 40, online: 'online', verified: 1, featured: 0, rec: 1,
      photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Neha Gupta', realName: 'Neha Shivam Gupta', city: 'Pune', languages: 'Hindi, Marathi, English',
      about: 'Fitness lover, yoga practitioner. Positive mindset always!',
      interests: 'Yoga, Gym, Wellness, Travel', audioRate: 15, videoRate: 28, online: 'online', verified: 1, featured: 1, rec: 0,
      photo: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Isha Reddy', realName: 'Isha Venkat Reddy', city: 'Hyderabad', languages: 'Telugu, Hindi, English',
      about: 'Charming and fun-loving! Always ready for engaging discussions.',
      interests: 'Cinema, Gaming, Cooking', audioRate: 20, videoRate: 35, online: 'online', verified: 1, featured: 0, rec: 1,
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Divya Sen', realName: 'Divya Subhash Sen', city: 'Jaipur', languages: 'Hindi, English',
      about: 'Royal city vibes with a warm heart. Let us talk about culture and travel!',
      interests: 'Heritage, Art, Painting', audioRate: 10, videoRate: 20, online: 'online', verified: 1, featured: 0, rec: 0,
      photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Simran Gill', realName: 'Simranjit Kaur Gill', city: 'Chandigarh', languages: 'Punjabi, Hindi, English',
      about: 'Full of life, love music and late-night calls 🌙',
      interests: 'Bhangra, Music, Vlogging', audioRate: 15, videoRate: 32, online: 'online', verified: 1, featured: 1, rec: 1,
      photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Meera Deshmukh', realName: 'Meera Anand Deshmukh', city: 'Nagpur', languages: 'Marathi, Hindi, English',
      about: 'Teacher by passion, listener by nature. Come pour your heart out!',
      interests: 'Teaching, Poetry, Gardening', audioRate: 12, videoRate: 25, online: 'offline', verified: 1, featured: 0, rec: 0,
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Pooja Saxena', realName: 'Pooja Prakash Saxena', city: 'Lucknow', languages: 'Hindi, Urdu, English',
      about: 'Adab and sweetness from Lucknow. Let us have soulful conversations.',
      interests: 'Ghazals, Food, History', audioRate: 15, videoRate: 30, online: 'online', verified: 1, featured: 0, rec: 1,
      photo: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Tanvi Joshi', realName: 'Tanvi Dinesh Joshi', city: 'Indore', languages: 'Hindi, English',
      about: 'Food fanatic and night owl. Love making new friends online!',
      interests: 'Street Food, Movies, Memes', audioRate: 14, videoRate: 28, online: 'busy', verified: 1, featured: 0, rec: 0,
      photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Shreya Menon', realName: 'Shreya Haridas Menon', city: 'Kochi', languages: 'Malayalam, English',
      about: 'Nature lover from God\'s Own Country. Peaceful & sweet personality.',
      interests: 'Beaches, Photography, Tea', audioRate: 18, videoRate: 35, online: 'online', verified: 1, featured: 1, rec: 1,
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Kriti Banerjee', realName: 'Kriti Somnath Banerjee', city: 'Kolkata', languages: 'Bengali, Hindi, English',
      about: 'Classical singer & content creator. Let us talk music and life 🎶',
      interests: 'Singing, Classical Music, Theater', audioRate: 20, videoRate: 40, online: 'online', verified: 1, featured: 0, rec: 1,
      photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Nisha Choudhary', realName: 'Nisha Mohan Choudhary', city: 'Bhopal', languages: 'Hindi, English',
      about: 'Quiet yet engaging listener. Feel free to talk about your day!',
      interests: 'Psychology, Books, Meditation', audioRate: 12, videoRate: 22, online: 'offline', verified: 1, featured: 0, rec: 0,
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Swati Agarwal', realName: 'Swati Pawan Agarwal', city: 'Kanpur', languages: 'Hindi, English',
      about: 'Charming, sweet, and fun-loving friend. Call or chat anytime!',
      interests: 'Fashion, Crafts, Cooking', audioRate: 10, videoRate: 20, online: 'online', verified: 1, featured: 0, rec: 0,
      photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Aditi Kulkarni', realName: 'Aditi Prasad Kulkarni', city: 'Nashik', languages: 'Marathi, Hindi, English',
      about: 'Winery tour guide & nature addict. Excited to meet new people!',
      interests: 'Wine Tasting, Trekking, Pets', audioRate: 16, videoRate: 30, online: 'online', verified: 1, featured: 0, rec: 1,
      photo: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Bhavna Tiwari', realName: 'Bhavna Shashi Tiwari', city: 'Varanasi', languages: 'Hindi, English',
      about: 'Traditional values with modern thoughts. Spiritual & peaceful conversations.',
      interests: 'Yoga, Temples, Classical Art', audioRate: 10, videoRate: 20, online: 'online', verified: 1, featured: 0, rec: 0,
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Aarti Sharma', realName: 'Aarti Girish Sharma', city: 'Surat', languages: 'Gujarati, Hindi, English',
      about: 'Diamond city girl with a sparkling heart! Always online to chat.',
      interests: 'Shopping, Jewelry, Events', audioRate: 15, videoRate: 28, online: 'online', verified: 1, featured: 1, rec: 1,
      photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Monika Roy', realName: 'Monika Bikash Roy', city: 'Siliguri', languages: 'Bengali, Nepali, Hindi',
      about: 'Hilly tea garden host. Love cold weather, hot tea, and deep chats ☕',
      interests: 'Mountains, Tea, Travel', audioRate: 12, videoRate: 25, online: 'busy', verified: 1, featured: 0, rec: 0,
      photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Payal Kapoor', realName: 'Payal Suraj Kapoor', city: 'Dehradun', languages: 'Hindi, English',
      about: 'Doon valley girl who loves guitar and acoustic jams.',
      interests: 'Guitar, Camping, Dogs', audioRate: 15, videoRate: 32, online: 'online', verified: 1, featured: 0, rec: 1,
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Radhika Bhatt', realName: 'Radhika Bipin Bhatt', city: 'Vadodara', languages: 'Gujarati, Hindi, English',
      about: 'Graphic designer who loves aesthetics and friendly banter.',
      interests: 'Design, Animation, Coffee', audioRate: 18, videoRate: 35, online: 'online', verified: 1, featured: 1, rec: 1,
      photo: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Sonali Mishra', realName: 'Sonali Rajesh Mishra', city: 'Patna', languages: 'Hindi, Maithili, English',
      about: 'Law student with a great sense of humor. Talk to me about anything!',
      interests: 'Debating, History, Movies', audioRate: 10, videoRate: 20, online: 'online', verified: 1, featured: 0, rec: 0,
      photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Tanya Singh', realName: 'Tanya Vikram Singh', city: 'Gwalior', languages: 'Hindi, English',
      about: 'Warm, empathetic, and sweet host.',
      interests: 'Music, Gardening, Cooking', audioRate: 12, videoRate: 24, online: 'offline', verified: 1, featured: 0, rec: 0,
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Urvi Shah', realName: 'Urvi Chirag Shah', city: 'Rajkot', languages: 'Gujarati, Hindi, English',
      about: 'Cheerful girl with lots of energy. Let us connect!',
      interests: 'Dance, Shopping, Socializing', audioRate: 15, videoRate: 30, online: 'online', verified: 1, featured: 0, rec: 1,
      photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Varsha Pillai', realName: 'Varsha Murugan Pillai', city: 'Trivandrum', languages: 'Tamil, Malayalam, English',
      about: 'Soft spoken and caring host from Kerala.',
      interests: 'Reading, Beaches, classical Dance', audioRate: 14, videoRate: 28, online: 'online', verified: 1, featured: 0, rec: 0,
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Yamini Das', realName: 'Yamini Tarun Das', city: 'Guwahati', languages: 'Assamese, Hindi, English',
      about: 'Northeast charm & warm hospitality. Looking forward to sweet talks.',
      interests: 'Nature, Music, Travel', audioRate: 15, videoRate: 30, online: 'online', verified: 1, featured: 1, rec: 1,
      photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Zoya Khan', realName: 'Zoya Tariq Khan', city: 'Srinagar', languages: 'Kashmiri, Urdu, Hindi, English',
      about: 'Kashmiri host with a love for poetry, snow, and warm tea ❄️',
      interests: 'Poetry, Snowboarding, Tea', audioRate: 25, videoRate: 50, online: 'online', verified: 1, featured: 1, rec: 1,
      photo: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Komal Rao', realName: 'Komal Nagesh Rao', city: 'Mangalore', languages: 'Kannada, Tulu, English',
      about: 'Coastal breeze and warm heart. Talk to me about food & beaches!',
      interests: 'Seafood, Beaches, Swimming', audioRate: 12, videoRate: 25, online: 'online', verified: 1, featured: 0, rec: 0,
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80'
    },
    {
      displayName: 'Deepika Thakur', realName: 'Deepika Hemant Thakur', city: 'Shimla', languages: 'Hindi, Pahari, English',
      about: 'Mountain lover who enjoys cozy fireside conversations 🏔️',
      interests: 'Trekking, Camping, Coffee', audioRate: 16, videoRate: 32, online: 'online', verified: 1, featured: 1, rec: 1,
      photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80'
    }
  ];

  for (let i = 0; i < femaleData.length; i++) {
    const f = femaleData[i];
    const email = `female${i + 1}@friendlydating.com`;
    const mobile = `98111111${i < 10 ? '0' + i : i}`;

    let user = await getOne(`SELECT * FROM users WHERE email = ?`, [email]);
    let userId;
    if (!user) {
      const res = await run(`
        INSERT INTO users (full_name, email, mobile, password, gender, dob, city, role, referral_code, status)
        VALUES (?, ?, ?, 'password123', 'female', '1998-08-20', ?, 'female', ?, 'active');
      `, [f.realName, email, mobile, f.city, `FEMALE${200 + i}`]);
      userId = res.lastID;
    } else {
      userId = user.id;
    }

    let profile = await getOne(`SELECT * FROM female_profiles WHERE user_id = ?`, [userId]);
    if (!profile) {
      await run(`
        INSERT INTO female_profiles (
          user_id, display_name, real_name, about, languages, interests, relationship_pref, photos,
          audio_rate, video_rate, online_status, is_verified, is_featured, is_recommended, approval_status,
          upi_id, bank_name, bank_account, account_holder, ifsc_code
        ) VALUES (?, ?, ?, ?, ?, ?, 'Friendship & Dating', ?, ?, ?, ?, ?, ?, ?, 'approved', ?, 'HDFC Bank', '987654321099', ?, 'HDFC0001234');
      `, [
        userId, f.displayName, f.realName, f.about, f.languages, f.interests, f.photo,
        f.audioRate, f.videoRate, f.online, f.verified, f.featured, f.rec,
        `${f.displayName.toLowerCase().replace(/\s+/g, '')}@upi`, f.realName
      ]);

      // Seed KYC status
      await run(`
        INSERT INTO kyc (user_id, doc_type, doc_number, doc_image, selfie_image, mobile_verified, email_verified, status)
        VALUES (?, 'Aadhaar Card', '998877665544', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=300&auto=format&fit=crop&q=80', ?, 1, 1, 'verified');
      `, [userId, f.photo]);

      // Seed Wallet
      const earnings = Math.floor(Math.random() * 4000) + 1200;
      await run(`
        INSERT INTO wallets (user_id, earnings_balance, pending_settlement, total_withdrawn)
        VALUES (?, ?, 300, 1500);
      `, [userId, earnings]);

      // Seed Withdrawal Request for first 3 female creators
      if (i < 3) {
        await run(`
          INSERT INTO withdrawals (female_user_id, amount, payout_method, upi_id, status, transaction_ref, admin_remarks)
          VALUES (?, 800, 'UPI', ?, 'paid', 'TXN_PAYOUT_9921', 'Approved and paid via Razorpay X');
        `, [userId, `${f.displayName.toLowerCase().replace(/\s+/g, '')}@upi`]);
        await run(`
          INSERT INTO withdrawals (female_user_id, amount, payout_method, upi_id, status)
          VALUES (?, 500, 'UPI', ?, 'requested');
        `, [userId, `${f.displayName.toLowerCase().replace(/\s+/g, '')}@upi`]);
      }
    }
  }

  // Seed Sample Calls
  console.log('Seeding Sample Call History...');
  const callsCheck = await getOne(`SELECT COUNT(*) as count FROM calls`);
  if (callsCheck.count === 0) {
    const males = await query(`SELECT id FROM users WHERE role = 'male' LIMIT 5`);
    const females = await query(`SELECT id FROM users WHERE role = 'female' LIMIT 5`);

    if (males.length > 0 && females.length > 0) {
      for (let i = 0; i < 8; i++) {
        const callerId = males[i % males.length].id;
        const receiverId = females[i % females.length].id;
        const isVideo = i % 2 === 0;
        const rate = isVideo ? 30 : 15;
        const durationSec = 180 + i * 60; // 3 to 10 mins
        const gross = (durationSec / 60) * rate;
        const commission = gross * 0.3;
        const femaleEarn = gross * 0.7;

        await run(`
          INSERT INTO calls (caller_id, receiver_id, call_type, rate_per_min, start_time, end_time, duration_seconds, gross_amount, platform_commission, female_earning, status)
          VALUES (?, ?, ?, ?, DATETIME('now', '-${i} hours'), DATETIME('now', '-${i} hours', '+${durationSec} seconds'), ?, ?, ?, ?, 'completed');
        `, [callerId, receiverId, isVideo ? 'video' : 'audio', rate, durationSec, gross, commission, femaleEarn]);
      }
    }
  }

  // Seed Sample Messages
  console.log('Seeding Sample Messages...');
  const msgCheck = await getOne(`SELECT COUNT(*) as count FROM messages`);
  if (msgCheck.count === 0) {
    const maleUser = await getOne(`SELECT id FROM users WHERE role = 'male' LIMIT 1`);
    const femaleUser = await getOne(`SELECT id FROM users WHERE role = 'female' LIMIT 1`);
    if (maleUser && femaleUser) {
      await run(`INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, 'Hey Priya! Loved your profile photo 😊');`, [maleUser.id, femaleUser.id]);
      await run(`INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, 'Thank you Rohan! How are you doing today?');`, [femaleUser.id, maleUser.id]);
      await run(`INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, 'I am great! Would love to get on a video call later.');`, [maleUser.id, femaleUser.id]);
      await run(`INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, 'Sure! Just hit the call button whenever you are ready 💕');`, [femaleUser.id, maleUser.id]);
    }
  }

  // Seed Subscription Plans
  console.log('Seeding Subscription Plans...');
  const planCheck = await getOne(`SELECT COUNT(*) as count FROM subscription_plans`);
  if (planCheck.count === 0) {
    const plans = [
      ['Weekly VIP Pass', 199, 7, 'POPULAR', 'Unlimited Super Likes, See Who Liked You, 5 Free Audio Call Mins, Verified Badge Access'],
      ['Monthly Gold Member', 599, 30, 'BEST VALUE', 'Unlimited Messages, Advanced Location Filters, 15 Free Call Mins, Profile Boost 2x/week, See Visitors'],
      ['Quarterly Royal VIP', 1499, 90, 'ROYAL', 'VIP Priority Match Badge, Direct Host Audio/Video Discount 20%, Unlimited Rewind & Incognito Mode']
    ];
    for (const [name, price, duration, badge, features] of plans) {
      await run(`INSERT INTO subscription_plans (name, price, duration_days, badge, features, status) VALUES (?, ?, ?, ?, ?, 'active');`, [name, price, duration, badge, features]);
    }
  }

  // Seed Sample Support Ticket
  const ticketCheck = await getOne(`SELECT COUNT(*) as count FROM support_tickets`);
  if (ticketCheck.count === 0) {
    const maleUser = await getOne(`SELECT id FROM users WHERE role = 'male' LIMIT 1`);
    if (maleUser) {
      const resT = await run(`INSERT INTO support_tickets (user_id, subject, category, priority, status) VALUES (?, 'Wallet Payment Confirmation', 'Billing & Wallet', 'normal', 'open');`, [maleUser.id]);
      await run(`INSERT INTO support_ticket_replies (ticket_id, sender_id, sender_role, message) VALUES (?, ?, 'male', 'Hi, I recharged ₹500 via UPI. Please confirm my promotional bonus credits.');`, [resT.lastID, maleUser.id]);
      await run(`INSERT INTO support_ticket_replies (ticket_id, sender_id, sender_role, message) VALUES (?, 1, 'admin', 'Hello! Your transaction has been verified and ₹50 bonus credits have been added to your wallet balance.');`, [resT.lastID]);
    }
  }

  console.log('Database seeding completed successfully!');
};

if (import.meta.url === `file://${process.argv[1]}` || (process.argv[1] && process.argv[1].includes('seed.js'))) {
  seedData().catch((err) => {
    console.error('Error seeding data:', err);
  });
}
