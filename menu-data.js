/* Меню кафе «Вкус Мира». Этот файл — исходные данные меню:
   сайт использует его, если сервер недоступен, а сервер заполняет из него базу при первом запуске. */
/* layout "list" — раздел в виде меню-доски с одним общим фото */
var CATS = [
  { id: "breakfast", name: "Завтраки" },
  { id: "combo", name: "Комбо-обеды" },
  { id: "pies", name: "Осетинские пироги", prefix: "Осетинский пирог", layout: "list", img: "osetin", note: "<b>M</b> — большой пирог, <b>S</b> — маленький" },
  { id: "kutab", name: "Азербайджанские кутабы", prefix: "Кутаб", layout: "list", img: "kutab", note: "Тонкое тесто, жарятся на сковороде, подаются с соусом" },
  { id: "noodles", name: "Лапша" },
  { id: "hot", name: "Горячие блюда" },
  { id: "beef12", name: "Бургеры и конвертики" },
  { id: "sandwich", name: "Сэндвичи", prefix: "Сэндвич", layout: "list", img: "sandwich", note: "<b>M</b> — большой сэндвич, <b>S</b> — маленький" },
  { id: "salads", name: "Салаты и поке" },
  { id: "soups", name: "Супы" },
];

var MS = (m, s) => [["M", m], ["S", s]];
/* что можно выбрать в комбо */
var CHOICE = {
  SOUP: { label: "Суп", list: ["Говяжий суп", "Говяжьи фрикадельки", "Куриный суп", "Куриные фрикадельки", "Борщ", "Чечевичный с курицей"] },
  SALAD: { label: "Салат", list: ["Цезарь с курицей", "Греческий", "Овощной", "Острый с курицей"] },
  KUTAB: { label: "Кутаб", list: ["С мясом и сыром", "С курицей и сыром", "С сыром", "С картошкой и сыром", "Со шпинатом, жусаем и сыром"] },
};
var MENU = [
  // Завтраки
  { id: "eggs-veg", cat: "breakfast", img: "eggs-veg", name: "Яичница с курицей и овощами на гриле", price: 350, desc: "Два яйца, куриное филе, кабачок, перец и томат на гриле, хлеб, соус" },
  { id: "omelet", cat: "breakfast", img: "omelet", name: "Омлет с курицей, овощами и сыром", price: 300, desc: "С гренками, свежими томатами и зеленью" },
  { id: "eggs-greek", cat: "breakfast", img: "eggs-greek", name: "Яичница с курицей на гриле и греческий салат", price: 350, desc: "Два яйца, куриное филе, салат, хлеб, соус" },
  { id: "shakshuka", cat: "breakfast", img: "shakshuka", name: "Шакшука", price: 290, desc: "Яйца в томатном соусе с овощами, гренки" },

  // Комбо
  { id: "combo1", cat: "combo", img: "combo1", name: "Комбо 1", price: 650, desc: "Суп, салат и кутаб на выбор", choices: "SOUP SALAD KUTAB" },
  { id: "combo2", cat: "combo", img: "combo2", name: "Комбо 2", price: 500, desc: "Суп и кутаб на выбор", choices: "SOUP KUTAB" },
  { id: "combo3", cat: "combo", img: "combo3", name: "Комбо 3", price: 450, desc: "Суп и салат на выбор", choices: "SOUP SALAD" },

  // Осетинские пироги
  { id: "pie-potato", cat: "pies", img: "osetin", name: "С картошкой и сыром", variants: MS(500, 250) },
  { id: "pie-chicken", cat: "pies", img: "osetin", name: "С курицей и сыром", variants: MS(700, 350) },
  { id: "pie-chicken-mush", cat: "pies", img: "osetin", name: "С курицей, сыром, грибами и сливками", variants: MS(720, 370) },
  { id: "pie-meat", cat: "pies", img: "osetin", name: "С мясом и сыром", variants: MS(800, 370) },
  { id: "pie-cheese", cat: "pies", img: "osetin", name: "С сыром", variants: MS(750, 370) },
  { id: "pie-spinach", cat: "pies", img: "osetin", name: "Со шпинатом, дюсаем и сыром", variants: MS(700, 350) },

  // Кутабы
  { id: "kutab-potato", cat: "kutab", img: "kutab", name: "С картошкой и сыром", price: 150 },
  { id: "kutab-chicken", cat: "kutab", img: "kutab", name: "С курицей и сыром", price: 200 },
  { id: "kutab-chicken-mush", cat: "kutab", img: "kutab", name: "С курицей, сыром, грибами и сливками", price: 220 },
  { id: "kutab-cheese", cat: "kutab", img: "kutab", name: "С сыром", price: 200 },
  { id: "kutab-meat", cat: "kutab", img: "kutab", name: "С мясом и сыром", price: 250 },
  { id: "kutab-spinach", cat: "kutab", img: "kutab", name: "Со шпинатом, гисаем и сыром", price: 200 },

  // Лапша (во всех вариантах с овощами)
  { id: "udon", cat: "noodles", img: "udon", name: "Удон", desc: "Подаётся с овощами", variants: [["С курицей", 350], ["С говядиной", 400], ["С креветками", 450], ["С форелью", 500]] },
  { id: "noodle-rice", cat: "noodles", img: "noodle-rice", name: "Рисовая лапша", desc: "Подаётся с овощами", variants: [["С курицей", 400], ["С говядиной", 450], ["С креветками", 480], ["С форелью", 550]] },
  { id: "noodle-soba", cat: "noodles", img: "noodle-soba", name: "Гречневая лапша", desc: "Подаётся с овощами", variants: [["С курицей", 350], ["С говядиной", 400], ["С креветками", 450], ["С форелью", 500]] },
  { id: "chapche", cat: "noodles", img: "chapche", name: "Чапче", desc: "Подаётся с овощами", variants: [["С курицей", 350], ["С говядиной", 400], ["С креветками", 450], ["С форелью", 500]] },
  { id: "rapokki", cat: "noodles", img: "rapokki", name: "Рапокки", desc: "Токпокки и рамен в соусе", variants: [["Томатный соус, курица", 380], ["Томатный соус, говядина", 399], ["Сливочный соус, курица", 399]] },

  // Горячие блюда
  { id: "beef-veg", cat: "hot", img: "beef-veg", name: "Говядина с овощами и рисом", price: 400 },
  { id: "chicken-veg", cat: "hot", img: "chicken-veg", name: "Курица с овощами и рисом", price: 350 },
  { id: "chicken-french", cat: "hot", img: "chicken-french", name: "Курица по-французски", price: 380, desc: "С рисом" },
  { id: "hearts", cat: "hot", img: "hearts", name: "Куриные сердечки", price: 300, desc: "Со свежим салатом и рисом" },
  { id: "dolma", cat: "hot", img: "dolma", name: "Долма", price: 360, desc: "С соусом, зеленью и лимоном" },

  // Бургеры и конвертики
  { id: "burger12", cat: "beef12", img: "burger", name: "Бургер из запечённой говядины 12 часов", variants: [["Размер M", 570], ["Размер S", 400]], desc: "Томлёная говядина, расплавленный сыр, томаты, салат" },
  { id: "baked-burger", cat: "beef12", img: "baked-burger", name: "Запечённый бургер", variants: [["С говядиной 12 часов", 500], ["С курицей", 350]], desc: "Закрытая запечённая булочка с начинкой, свежие овощи, соус" },
  { id: "konvert", cat: "beef12", img: "konvert", name: "Конвертик", variants: [["С говядиной 12 часов", 250], ["С курицей", 140]], desc: "Запечённый в лаваше с сыром, с соусом и зеленью" },
  { id: "chicken-roll", cat: "beef12", img: "roll", name: "Курица Roll", price: 300, desc: "С картофелем фри и чесночным соусом" },

  // Сэндвичи
  { id: "sw-beef", cat: "sandwich", img: "sandwich", name: "С запечённой говядиной (12 часов)", variants: MS(450, 300) },
  { id: "sw-chicken", cat: "sandwich", img: "sandwich", name: "С курицей", variants: MS(250, 170) },
  { id: "sw-caesar", cat: "sandwich", img: "sandwich", name: "Цезарь", variants: MS(300, 200) },

  // Салаты и поке
  { id: "greek", cat: "salads", sub: "Салаты", img: "greek", name: "Греческий салат", price: 280 },
  { id: "caesar-shrimp", cat: "salads", sub: "Салаты", img: "caesar-shrimp", name: "Цезарь с креветками", price: 380 },
  { id: "caesar-chicken", cat: "salads", sub: "Салаты", img: "caesar-chicken", name: "Цезарь с курицей", price: 300 },
  { id: "eggplant", cat: "salads", sub: "Салаты", img: "eggplant", name: "Хрустящий баклажан в кисло-сладком соусе", price: 300 },
  { id: "veg-poached", cat: "salads", sub: "Салаты", img: "veg-poached", name: "Овощной салат с яйцом пашот", price: 280 },
  { id: "veg-shrimp", cat: "salads", sub: "Салаты", img: "veg-shrimp", name: "Овощной салат с яйцом пашот и креветками", price: 450 },
  { id: "veg-trout", cat: "salads", sub: "Салаты", img: "veg-trout", name: "Овощной салат с яйцом пашот и форелью", price: 480 },
  { id: "spicy-chicken", cat: "salads", sub: "Салаты", img: "spicy-chicken", name: "Острый салат с курицей", price: 280 },
  { id: "spicy-beef", cat: "salads", sub: "Салаты", img: "spicy-beef", name: "Острый салат с говядиной", price: 330 },
  { id: "enoki", cat: "salads", sub: "Грибы эноки", img: ["enoki-sweet", "enoki-spicy"], name: "Грибы эноки", variants: [["В кисло-сладком соусе", 320], ["В остром соусе", 330]] },
  { id: "poke-chicken", cat: "salads", sub: "Поке", img: "poke-chicken", name: "Поке с курицей", price: 350 },
  { id: "poke-shrimp", cat: "salads", sub: "Поке", img: "poke-shrimp", name: "Поке с креветками", price: 450 },
  { id: "poke-trout", cat: "salads", sub: "Поке", img: "poke-trout", name: "Поке с форелью", price: 480 },

  // Супы
  { id: "pho-beef", cat: "soups", sub: "Азиатские супы", img: "pho", name: "Фо-бо с говядиной", price: 599 },
  { id: "pho-chicken", cat: "soups", sub: "Азиатские супы", img: "pho-chicken", name: "Фо-бо с курицей", price: 450 },
  { id: "malatang", cat: "soups", sub: "Азиатские супы", img: "malatan", name: "Малатан", variants: [["С морепродуктами", 750], ["С говядиной", 570], ["С курицей", 400]] },
  { id: "beef-soup", cat: "soups", sub: "Домашние супы", img: "beef-soup", name: "Говяжий суп", price: 300, desc: "С лапшой или рисом" },
  { id: "beef-meatball", cat: "soups", sub: "Домашние супы", img: "beef-meatball", name: "Суп с говяжьими фрикадельками", price: 300, desc: "С лапшой или рисом" },
  { id: "chicken-meatball", cat: "soups", sub: "Домашние супы", img: "chicken-meatball", name: "Суп с куриными фрикадельками", price: 260, desc: "С лапшой или рисом" },
  { id: "chicken-soup", cat: "soups", sub: "Домашние супы", img: "chicken-soup", name: "Куриный суп", price: 260, desc: "С лапшой или рисом" },
  { id: "borsch", cat: "soups", sub: "Домашние супы", img: "borsch", name: "Борщ с говядиной", price: 300 },
  { id: "lentil", cat: "soups", sub: "Домашние супы", img: "lentil", name: "Чечевичный суп с курицей", price: 260 },
];
