// Seed catalog the indexer (bun run index) reads from.
// `text` is what gets embedded for semantic search; price/stock stay structured
// columns in Supabase so they can be updated without re-embedding.
// Some items intentionally have stock=0 to demonstrate the in-stock filter.

export interface Product {
  id: number;
  name: string;
  text: string;
  price: number;
  stock: number;
}

export const products: Product[] = [
  // --- Men's tops (1-12) ---
  { id: 1,  name: 'Classic Oxford Button-Down',     text: 'crisp white cotton oxford shirt, button-down collar, smart casual office wear', price: 45,  stock: 18 },
  { id: 2,  name: 'Heather Grey Crewneck Tee',      text: 'soft combed cotton short-sleeve t-shirt, everyday basic, comfortable and breathable',  price: 18,  stock: 42 },
  { id: 3,  name: 'Navy Slim-Fit Polo',             text: 'pique cotton polo shirt, slim fit, weekend brunch or golf course',                     price: 38,  stock: 25 },
  { id: 4,  name: 'Black Henley Long Sleeve',       text: 'three-button henley shirt, layering essential for autumn and cool spring days',        price: 32,  stock: 0  },
  { id: 5,  name: 'Plaid Flannel Shirt',            text: 'heavyweight brushed cotton flannel in red and black plaid, warm for cool weekends',    price: 52,  stock: 14 },
  { id: 6,  name: 'White Linen Camp Shirt',         text: 'short-sleeve relaxed-fit linen shirt, breezy and airy for hot summer days',            price: 48,  stock: 22 },
  { id: 7,  name: 'Charcoal Merino Wool Sweater',   text: 'fine-gauge merino pullover, warm and lightweight for winter layering',                 price: 89,  stock: 9  },
  { id: 8,  name: 'Striped Breton Tee',             text: 'French-inspired navy and white striped long-sleeve tee, classic nautical look',        price: 28,  stock: 30 },
  { id: 9,  name: 'Olive Cargo Work Shirt',         text: 'durable cotton-twill utility shirt with chest pockets, rugged everyday wear',          price: 58,  stock: 11 },
  { id: 10, name: 'Performance Tech Polo',          text: 'moisture-wicking polo for golf and active days, quick-dry stretch fabric',             price: 42,  stock: 0  },
  { id: 11, name: 'Forest Green Pullover Hoodie',   text: 'heavyweight fleece hoodie, cozy and warm for cold weather and casual wear',            price: 54,  stock: 28 },
  { id: 12, name: 'Burgundy Cable-Knit Cardigan',   text: 'chunky cable-knit cardigan, layer over shirts in cold autumn weather',                 price: 76,  stock: 7  },

  // --- Women's tops (13-24) ---
  { id: 13, name: 'Silk Camisole Tank',             text: 'flowy mulberry silk camisole with adjustable straps, elegant for evenings',            price: 68,  stock: 12 },
  { id: 14, name: 'White Ribbed Tank Top',          text: 'fitted ribbed cotton tank, essential summer basic, breathable and lightweight',        price: 16,  stock: 50 },
  { id: 15, name: 'Cream Cashmere Sweater',         text: 'buttery soft pure cashmere pullover, luxurious warmth for winter',                     price: 145, stock: 0  },
  { id: 16, name: 'Floral Print Blouse',            text: 'flowing rayon blouse with botanical floral print, spring and summer staple',           price: 52,  stock: 19 },
  { id: 17, name: 'Black Long-Sleeve Bodysuit',     text: 'sleek snap-bottom bodysuit, smooth layering must-have under jackets',                  price: 34,  stock: 26 },
  { id: 18, name: 'Oversized Linen Shirt',          text: 'breezy oversized linen button-up shirt for hot weather and beach days',                price: 58,  stock: 15 },
  { id: 19, name: 'Pink Cropped Cardigan',          text: 'soft cotton-blend short cardigan, light layering for spring evenings',                 price: 42,  stock: 22 },
  { id: 20, name: 'Striped Boatneck Long Sleeve',   text: 'Parisian-style striped boatneck top, timeless casual chic',                            price: 32,  stock: 35 },
  { id: 21, name: 'Burgundy Wrap Top',              text: 'flattering V-neck wrap top with tie waist, work-appropriate elegant top',              price: 48,  stock: 14 },
  { id: 22, name: 'Sage Green Mock Neck',           text: 'fitted ribbed mock-neck top, cool weather staple under blazers',                       price: 36,  stock: 24 },
  { id: 23, name: 'Black Velvet Camisole',          text: 'luxe velvet camisole, evening wear or layering for parties',                           price: 44,  stock: 0  },
  { id: 24, name: 'Mustard Yellow Turtleneck',      text: 'fine-knit turtleneck sweater, warm fall and winter layering',                          price: 42,  stock: 11 },

  // --- Bottoms (25-38) ---
  { id: 25, name: 'Classic Blue Slim Jeans',        text: 'mid-rise straight-leg denim jeans in indigo wash, everyday essential',                 price: 68,  stock: 32 },
  { id: 26, name: 'Black Skinny Jeans',             text: 'high-rise stretch skinny jeans, versatile dark wash for any occasion',                 price: 72,  stock: 28 },
  { id: 27, name: 'Beige Cotton Chinos',            text: 'slim-fit cotton chino pants for smart-casual office wear',                             price: 58,  stock: 0  },
  { id: 28, name: 'Olive Cargo Pants',              text: 'relaxed-fit utility cargo pants with side pockets, rugged everyday',                   price: 74,  stock: 18 },
  { id: 29, name: 'Light Wash Boyfriend Jeans',     text: 'relaxed slouchy mom-fit jeans, weekend comfort and casual style',                      price: 78,  stock: 15 },
  { id: 30, name: 'White Wide-Leg Trousers',        text: 'flowing high-waisted wide-leg trousers, elegant for warm weather',                     price: 84,  stock: 12 },
  { id: 31, name: 'Black Pleated Midi Skirt',       text: 'flowing pleated A-line midi skirt, office or weekend wear',                            price: 62,  stock: 20 },
  { id: 32, name: 'Denim Mini Skirt',               text: 'classic blue denim short mini skirt with five pockets, summer staple',                 price: 48,  stock: 25 },
  { id: 33, name: 'Khaki Bermuda Shorts',           text: 'relaxed knee-length cotton bermuda shorts, summer essential',                          price: 42,  stock: 31 },
  { id: 34, name: 'Navy Linen Drawstring Shorts',   text: 'breezy drawstring shorts in light linen, beach or tropical vacation',                  price: 38,  stock: 0  },
  { id: 35, name: 'Black Tailored Dress Pants',     text: 'slim straight-leg dress trousers for office and formal occasions',                     price: 88,  stock: 16 },
  { id: 36, name: 'Grey Fleece Joggers',            text: 'fleece-lined cuffed jogger pants, lounge and casual weekends',                         price: 52,  stock: 24 },
  { id: 37, name: 'Floral Print Maxi Skirt',        text: 'flowing ankle-length maxi skirt with botanical print, summer evenings',                price: 66,  stock: 9  },
  { id: 38, name: 'Brown Corduroy Pants',           text: 'wide-wale corduroy trousers, warm autumn and winter pants',                            price: 72,  stock: 13 },

  // --- Dresses (39-46) ---
  { id: 39, name: 'Little Black Dress',             text: 'fitted sheath dress at knee length, classic cocktail and evening attire',              price: 98,  stock: 14 },
  { id: 40, name: 'Floral Strappy Sundress',        text: 'flowy strappy summer sundress with vibrant floral print, light and airy',              price: 62,  stock: 22 },
  { id: 41, name: 'Burgundy V-Neck Wrap Dress',     text: 'flattering V-neck wrap dress, suitable for work or dinner',                            price: 88,  stock: 17 },
  { id: 42, name: 'White Linen Shift Dress',        text: 'relaxed shift dress in pure linen, hot-weather staple',                                price: 76,  stock: 0  },
  { id: 43, name: 'Sage Green Maxi Dress',          text: 'long flowing maxi dress with thin straps, beach vacation and resort wear',             price: 82,  stock: 19 },
  { id: 44, name: 'Black Knit Bodycon Dress',       text: 'fitted long-sleeve knit dress, cool weather evenings',                                 price: 74,  stock: 16 },
  { id: 45, name: 'Champagne Sequin Mini Dress',    text: 'sparkly sequined party dress, celebrations and new year nights',                       price: 128, stock: 8  },
  { id: 46, name: 'Denim Shirt Dress',              text: 'collared button-front denim midi shirt dress, casual chic everyday',                   price: 84,  stock: 21 },

  // --- Outerwear (47-58) ---
  { id: 47, name: 'Camel Wool Overcoat',            text: 'classic single-breasted long wool coat, formal winter outerwear',                      price: 245, stock: 6  },
  { id: 48, name: 'Black Leather Biker Jacket',     text: 'fitted moto jacket with asymmetric zip, edgy leather staple',                          price: 228, stock: 11 },
  { id: 49, name: 'Olive Utility Field Jacket',     text: 'military-inspired cotton field jacket, transitional weather layer',                    price: 112, stock: 18 },
  { id: 50, name: 'Navy Quilted Puffer Vest',       text: 'lightweight insulated puffer vest, layering for cool days',                            price: 68,  stock: 24 },
  { id: 51, name: 'Tan Trench Coat',                text: 'classic belted double-breasted trench coat, rainy spring weather',                     price: 185, stock: 9  },
  { id: 52, name: 'Forest Green Parka',             text: 'insulated hooded parka with faux-fur trim, deep winter coat very warm',                price: 215, stock: 0  },
  { id: 53, name: 'Denim Trucker Jacket',           text: 'classic blue denim jacket with button front, all-season casual layer',                 price: 78,  stock: 27 },
  { id: 54, name: 'Grey Wool Pea Coat',             text: 'double-breasted short wool pea coat, smart winter outerwear',                          price: 168, stock: 13 },
  { id: 55, name: 'Black Down Puffer Jacket',       text: 'packable down-filled puffer jacket, very warm for cold weather and travel',            price: 148, stock: 19 },
  { id: 56, name: 'Beige Sherpa-Lined Coat',        text: 'corduroy coat with cozy sherpa lining, warm and casual winter',                        price: 135, stock: 8  },
  { id: 57, name: 'Yellow Rain Jacket',             text: 'waterproof hooded rain shell, rainy days and hiking in wet weather',                   price: 92,  stock: 14 },
  { id: 58, name: 'Cropped Satin Bomber Jacket',    text: 'satin bomber jacket with ribbed cuffs, lightweight and stylish',                       price: 88,  stock: 16 },

  // --- Activewear (59-68) ---
  { id: 59, name: 'Black High-Waist Leggings',      text: 'squat-proof compression leggings for yoga, gym, and pilates',                          price: 58,  stock: 35 },
  { id: 60, name: 'Medium-Support Sports Bra',      text: 'racerback compression sports bra for running and HIIT workouts',                       price: 42,  stock: 28 },
  { id: 61, name: 'Mens Running Shorts',            text: 'lightweight quick-dry running shorts with built-in liner, jogging and gym',            price: 36,  stock: 22 },
  { id: 62, name: 'Performance Running Tee',        text: 'moisture-wicking athletic tee, breathable for jogging and training',                   price: 32,  stock: 30 },
  { id: 63, name: 'Yoga Strappy Tank',              text: 'flowy strappy yoga tank with built-in shelf bra, hot yoga and pilates',                price: 38,  stock: 26 },
  { id: 64, name: 'Compression Base Layer Top',     text: 'thermal long-sleeve base layer for cold-weather workouts and skiing',                  price: 48,  stock: 14 },
  { id: 65, name: 'Cycling Bib Shorts',             text: 'padded lycra bib shorts for road cycling and long rides',                              price: 98,  stock: 0  },
  { id: 66, name: 'Two-Stripe Track Pants',         text: 'classic athletic track pants with side stripes, retro sportswear',                     price: 54,  stock: 20 },
  { id: 67, name: 'Sweat-Wicking Golf Polo',        text: 'technical performance polo for golf, breathable and lightweight',                      price: 48,  stock: 18 },
  { id: 68, name: 'Hooded Windbreaker',             text: 'lightweight packable windbreaker jacket, runs and outdoor activity in wind',           price: 72,  stock: 15 },

  // --- Sleepwear & lounge (69-74) ---
  { id: 69, name: 'Cotton Pajama Set',              text: 'soft cotton-poplin button-up pajama shirt and pants set, sleepwear',                   price: 58,  stock: 19 },
  { id: 70, name: 'Long Silk Robe',                 text: 'floor-length mulberry silk robe with kimono sleeves, luxurious loungewear',            price: 138, stock: 7  },
  { id: 71, name: 'Fleece Lounge Pants',            text: 'soft cozy fleece pants for cold evenings at home, ultra-comfortable',                  price: 38,  stock: 28 },
  { id: 72, name: 'Cashmere-Blend Lounge Sweater',  text: 'soft pullover sweater for relaxed home days, warm and snug',                           price: 98,  stock: 0  },
  { id: 73, name: 'Modal Sleep Shirt',              text: 'long-sleeve oversized modal sleep shirt, lightweight nightwear',                       price: 42,  stock: 22 },
  { id: 74, name: 'Plush Terry Bathrobe',           text: 'thick terry-cotton bathrobe for post-shower comfort',                                  price: 74,  stock: 16 },

  // --- Footwear (75-86) ---
  { id: 75, name: 'White Leather Court Sneakers',   text: 'minimalist white leather court sneakers, everyday casual style',                       price: 89,  stock: 24 },
  { id: 76, name: 'Black Cushioned Running Shoes',  text: 'cushioned mesh running shoes for jogging, gym, and daily runs',                        price: 112, stock: 18 },
  { id: 77, name: 'Brown Leather Chelsea Boots',    text: 'pull-on leather Chelsea ankle boots, smart-casual all year round',                     price: 158, stock: 13 },
  { id: 78, name: 'Tan Suede Desert Boots',         text: 'classic crepe-sole suede desert boots, autumn and winter staple',                      price: 128, stock: 11 },
  { id: 79, name: 'Black Pointed-Toe Pumps',        text: '3-inch heel pumps in black leather, office and evening wear',                          price: 98,  stock: 15 },
  { id: 80, name: 'Strappy Block-Heel Sandals',     text: 'block-heel strappy evening sandals, dressy summer occasions',                          price: 76,  stock: 0  },
  { id: 81, name: 'Brown Leather Slide Sandals',    text: 'flat leather slide sandals for vacation and beach days',                               price: 58,  stock: 22 },
  { id: 82, name: 'Black Combat Boots',             text: 'chunky lug-sole combat boots, edgy fall and winter style',                             price: 148, stock: 17 },
  { id: 83, name: 'Slip-On Canvas Shoes',           text: 'easy lightweight canvas slip-on shoes, summer everyday wear',                          price: 48,  stock: 28 },
  { id: 84, name: 'Waterproof Hiking Boots',        text: 'rugged waterproof ankle hiking boots for trails and outdoor adventure',                price: 178, stock: 9  },
  { id: 85, name: 'Wool-Lined Snow Boots',          text: 'insulated waterproof snow boots for very cold winter, warm and grippy',                price: 168, stock: 0  },
  { id: 86, name: 'Black Ballet Flats',             text: 'classic round-toe ballet flats in black leather, work or weekend',                     price: 62,  stock: 19 },

  // --- Accessories (87-96) ---
  { id: 87, name: 'Brown Leather Belt',             text: 'classic 1.5-inch full-grain leather belt with brushed buckle',                         price: 42,  stock: 30 },
  { id: 88, name: 'Charcoal Wool Beanie',           text: 'chunky knit ribbed wool beanie hat for cold weather',                                  price: 24,  stock: 35 },
  { id: 89, name: 'Camel Cashmere Scarf',           text: 'long soft cashmere scarf for winter, luxurious warmth',                                price: 78,  stock: 14 },
  { id: 90, name: 'Gold Aviator Sunglasses',        text: 'metal-frame aviator sunglasses with brown gradient lenses',                            price: 58,  stock: 22 },
  { id: 91, name: 'Natural Canvas Tote Bag',        text: 'sturdy everyday canvas tote bag with leather straps, work or shopping',                price: 48,  stock: 26 },
  { id: 92, name: 'Black Leather Crossbody Bag',    text: 'small leather crossbody bag, evenings and dinners',                                    price: 128, stock: 11 },
  { id: 93, name: 'Printed Silk Pocket Square',     text: 'printed silk pocket square accessory for suit jackets',                                price: 24,  stock: 18 },
  { id: 94, name: 'Touchscreen Knit Gloves',        text: 'soft knit winter gloves with touchscreen-compatible fingertips',                       price: 22,  stock: 0  },
  { id: 95, name: 'Wide-Brim Straw Sun Hat',        text: 'packable wide-brim straw sun hat for beach and travel',                                price: 44,  stock: 17 },
  { id: 96, name: 'Navy Patterned Silk Tie',        text: 'woven silk neck tie in navy pattern for formal occasions',                             price: 52,  stock: 14 },

  // --- Underwear & socks (97-100) ---
  { id: 97, name: 'Mens Cotton Boxer Briefs 3-Pack',text: 'soft stretch-cotton boxer briefs three-pack, everyday underwear',                      price: 32,  stock: 40 },
  { id: 98, name: 'Womens Seamless Bralette',       text: 'wireless soft-cup seamless bralette, lounge and layering',                             price: 28,  stock: 32 },
  { id: 99, name: 'Merino Wool Hiking Socks',       text: 'cushioned merino wool moisture-wicking socks for hiking and trails',                   price: 18,  stock: 25 },
  { id: 100,name: 'No-Show Cotton Socks 6-Pack',    text: 'invisible no-show cotton socks six-pack for sneakers and loafers',                     price: 22,  stock: 38 },
];
