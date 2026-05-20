import i18n from 'i18next';

export const PRODUCT_NAMES = {
  'Orange Juice': 'ብርቱካን ጭማቂ',
  'Muffin': 'ማፊን',
  'Baguette': 'ባጌት',
  'Croissant': 'ክሮይሳንት',
  'Burger Buns': 'በርገር በንስ',
  'Hot Dog Buns': 'ሆት ዶግ በንስ',
  'Arabic Bread': 'ዓረብኛ ዳቦ',
  'Fetire': 'ፈቲረ',
  'Fetire Special': 'ፈቲረ ስፔሻል',
  'Fetire with Honey': 'ፈቲረ በሚስጥር',
  'Fetire with Cheese': 'ፈቲረ በአስማሚ',
  'Bread': 'ዳቦ',
  'Sweet Bread': 'ጣፋጭ ዳቦ',
  'Milk Bread': 'ወተት ዳቦ',
  'Brown Bread': 'ቡናማ ዳቦ',
  'Donut': 'ዶናት',
  'Cinnamon Roll': 'ቄንሚት ሮል',
  'Cookie': 'ኩኪ',
  'Chocolate Cookie': 'ቸኮሌት ኩኪ',
  'Butter Cookie': 'በርተር ኩኪ',
  'Cake': 'ኬክ',
  'Chocolate Cake': 'ቸኮሌት ኬክ',
  'Vanilla Cake': 'ቫኒላ ኬክ',
  'Carrot Cake': 'ካሮት ኬክ',
  'Cheesecake': 'ቺዝ ኬክ',
  'Baklava': 'ባክላቫ',
  'Kunafa': 'ቁናፋ',
  'Basbousa': 'ባስቦሳ',
  'Water - Small': 'ውሃ - ትንሽ',
  'Water - Large': 'ውሃ - ትልቅ',
  'Soft Drink - Cola': 'ኮላ ሶፍት ድርንክ',
  'Soft Drink - Lemon': 'ለሞን ሶፍት ድርንክ',
  'Fruit Cake': 'ፍራፍት ኬክ',
  'Chocolate Mousse': 'ቸኮሌት ሙስ',
  'Swiss Roll': 'ስዊስ ሮል',
  'Brownie': 'ብራውኒ',
  'Cupcake': 'ኩፕኬክ',
  'Tiramisu': 'ተሪማሱ',
  'Pancake': 'ፓንኬክ',
  'Waffle': 'ዋፍል',
  'Sufgania': 'ሱፋኒያ',
  'Eclairs': 'ኤክሌር',
  'Profiterole': 'ፕሮፊተሮል',
  'Marble Cake': 'ማርቤል ኬክ',
  'Red Velvet': 'ርድ ቨልቬት',
  'Pound Cake': 'ፓውንድ ኬክ',
  'Sponge Cake': 'ስፖንጅ ኬክ',
  'Choc Chip Cookie': 'ቸኮችፕ ኩኪ',
  'Oatmeal Cookie': 'ኦትሚል ኩኪ',
  'Macaron': 'ማካሮን',
  'Babka': 'ባብካ',
  'Sticky Bun': 'ስቲኪ ባን',
  'Cinnamon Bun': 'ቄንሚት ባን',
  'Croissant': 'ክሮይሳንት',
  'Palmier': 'ፓልሚየር',
  'Danish': 'ዴኒሽ',
};

export const BRANCH_NAMES = {
  'Main Branch': 'ዋና ቅርንጫፍ',
  'Branch 2': 'ቅርንጫፍ 2',
  'Branch 3': 'ቅርንጫፍ 3',
  'Branch 33': 'ቅርንጫፍ 33',
  'Branch 4': 'ቅርንጫፍ 4',
  'Branch 5': 'ቅርንጫፍ 5',
};

export const getLocalizedName = (item, language) => {
  const lang = language || i18n.language || localStorage.getItem('language') || 'en';
  if (lang === 'am' && item?.name_am) return item.name_am;
  if (lang === 'am' && item?.name && PRODUCT_NAMES[item.name]) return PRODUCT_NAMES[item.name];
  if (lang === 'am' && item?.name && BRANCH_NAMES[item.name]) return BRANCH_NAMES[item.name];
  return item?.name || '';
};