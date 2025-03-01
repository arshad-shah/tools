import { ColorMap, Element } from "../../types/PeriodicTableTypes";

  // Element data (full periodic table)
  const elements: Element[]  = [
    // Row 1
    { symbol: 'H', name: 'Hydrogen', number: 1, group: 'nonmetal', period: 1, column: 1, electrons: '1', mass: 1.008, description: 'Colorless, odorless, tasteless, non-toxic, highly combustible gas' },
    { symbol: 'He', name: 'Helium', number: 2, group: 'noble', period: 1, column: 18, electrons: '2', mass: 4.0026, description: 'Colorless, odorless, tasteless, non-toxic, inert monatomic gas' },
    
    // Row 2
    { symbol: 'Li', name: 'Lithium', number: 3, group: 'alkali', period: 2, column: 1, electrons: '2,1', mass: 6.94, description: 'Soft, silvery-white alkali metal, highly reactive and flammable' },
    { symbol: 'Be', name: 'Beryllium', number: 4, group: 'alkaline', period: 2, column: 2, electrons: '2,2', mass: 9.0122, description: 'Relatively hard, steel-gray, strong, lightweight, brittle alkaline earth metal' },
    { symbol: 'B', name: 'Boron', number: 5, group: 'metalloid', period: 2, column: 13, electrons: '2,3', mass: 10.81, description: 'Semiconductor with high melting point and low density' },
    { symbol: 'C', name: 'Carbon', number: 6, group: 'nonmetal', period: 2, column: 14, electrons: '2,4', mass: 12.011, description: 'Basis for all known life, exists in various forms including diamond and graphite' },
    { symbol: 'N', name: 'Nitrogen', number: 7, group: 'nonmetal', period: 2, column: 15, electrons: '2,5', mass: 14.007, description: 'Colorless, odorless, tasteless gas that makes up 78% of Earth\'s atmosphere' },
    { symbol: 'O', name: 'Oxygen', number: 8, group: 'nonmetal', period: 2, column: 16, electrons: '2,6', mass: 15.999, description: 'Highly reactive nonmetal that forms compounds with virtually all elements' },
    { symbol: 'F', name: 'Fluorine', number: 9, group: 'halogen', period: 2, column: 17, electrons: '2,7', mass: 18.998, description: 'Extremely reactive pale yellow diatomic gas, most electronegative element' },
    { symbol: 'Ne', name: 'Neon', number: 10, group: 'noble', period: 2, column: 18, electrons: '2,8', mass: 20.180, description: 'Colorless, odorless noble gas used in neon signs with distinct reddish-orange glow' },
    
    // Row 3
    { symbol: 'Na', name: 'Sodium', number: 11, group: 'alkali', period: 3, column: 1, electrons: '2,8,1', mass: 22.990, description: 'Soft, silvery-white, highly reactive metal, essential for animal life' },
    { symbol: 'Mg', name: 'Magnesium', number: 12, group: 'alkaline', period: 3, column: 2, electrons: '2,8,2', mass: 24.305, description: 'Shiny gray solid, relatively strong and lightweight metal' },
    { symbol: 'Al', name: 'Aluminum', number: 13, group: 'post-transition', period: 3, column: 13, electrons: '2,8,3', mass: 26.982, description: 'Silvery-white, soft, non-magnetic, ductile metal with low density' },
    { symbol: 'Si', name: 'Silicon', number: 14, group: 'metalloid', period: 3, column: 14, electrons: '2,8,4', mass: 28.085, description: 'Hard, brittle crystalline solid with a blue-grey metallic luster' },
    { symbol: 'P', name: 'Phosphorus', number: 15, group: 'nonmetal', period: 3, column: 15, electrons: '2,8,5', mass: 30.974, description: 'Multivalent nonmetal essential for life, exists in several allotropes' },
    { symbol: 'S', name: 'Sulfur', number: 16, group: 'nonmetal', period: 3, column: 16, electrons: '2,8,6', mass: 32.06, description: 'Abundant, multivalent nonmetal with distinctive yellow appearance' },
    { symbol: 'Cl', name: 'Chlorine', number: 17, group: 'halogen', period: 3, column: 17, electrons: '2,8,7', mass: 35.45, description: 'Yellow-green gas, highly reactive halogen and strong oxidizing agent' },
    { symbol: 'Ar', name: 'Argon', number: 18, group: 'noble', period: 3, column: 18, electrons: '2,8,8', mass: 39.948, description: 'Colorless, odorless noble gas, third most abundant gas in Earth\'s atmosphere' },

    // Row 4
    { symbol: 'K', name: 'Potassium', number: 19, group: 'alkali', period: 4, column: 1, electrons: '2,8,8,1', mass: 39.098, description: 'Soft, silvery-white alkali metal that reacts rapidly with air' },
    { symbol: 'Ca', name: 'Calcium', number: 20, group: 'alkaline', period: 4, column: 2, electrons: '2,8,8,2', mass: 40.078, description: 'Soft, alkaline earth metal essential for living organisms' },
    { symbol: 'Sc', name: 'Scandium', number: 21, group: 'transition', period: 4, column: 3, electrons: '2,8,9,2', mass: 44.956, description: 'Silvery-white metallic element that develops a yellowish or pinkish cast when oxidized' },
    { symbol: 'Ti', name: 'Titanium', number: 22, group: 'transition', period: 4, column: 4, electrons: '2,8,10,2', mass: 47.867, description: 'Lustrous transition metal with low density and high strength' },
    { symbol: 'V', name: 'Vanadium', number: 23, group: 'transition', period: 4, column: 5, electrons: '2,8,11,2', mass: 50.942, description: 'Hard, silvery-gray, ductile, malleable transition metal' },
    { symbol: 'Cr', name: 'Chromium', number: 24, group: 'transition', period: 4, column: 6, electrons: '2,8,13,1', mass: 51.996, description: 'Steely-grey, lustrous, hard metal that takes a high polish' },
    { symbol: 'Mn', name: 'Manganese', number: 25, group: 'transition', period: 4, column: 7, electrons: '2,8,13,2', mass: 54.938, description: 'Silvery-gray metal that resembles iron and is hard and very brittle' },
    { symbol: 'Fe', name: 'Iron', number: 26, group: 'transition', period: 4, column: 8, electrons: '2,8,14,2', mass: 55.845, description: 'Most common element on Earth by mass, forms much of Earth\'s core' },
    { symbol: 'Co', name: 'Cobalt', number: 27, group: 'transition', period: 4, column: 9, electrons: '2,8,15,2', mass: 58.933, description: 'Hard, lustrous, silver-gray transition metal with a bluish tinge' },
    { symbol: 'Ni', name: 'Nickel', number: 28, group: 'transition', period: 4, column: 10, electrons: '2,8,16,2', mass: 58.693, description: 'Silvery-white lustrous metal with a slight golden tinge' },
    { symbol: 'Cu', name: 'Copper', number: 29, group: 'transition', period: 4, column: 11, electrons: '2,8,18,1', mass: 63.546, description: 'Ductile metal with high thermal and electrical conductivity' },
    { symbol: 'Zn', name: 'Zinc', number: 30, group: 'transition', period: 4, column: 12, electrons: '2,8,18,2', mass: 65.38, description: 'Brittle, crystalline, bluish-white transition metal' },
    { symbol: 'Ga', name: 'Gallium', number: 31, group: 'post-transition', period: 4, column: 13, electrons: '2,8,18,3', mass: 69.723, description: 'Soft, silvery metal that melts near room temperature' },
    { symbol: 'Ge', name: 'Germanium', number: 32, group: 'metalloid', period: 4, column: 14, electrons: '2,8,18,4', mass: 72.630, description: 'Lustrous, hard-brittle, grayish-white metalloid' },
    { symbol: 'As', name: 'Arsenic', number: 33, group: 'metalloid', period: 4, column: 15, electrons: '2,8,18,5', mass: 74.922, description: 'Metalloid that exists in many allotropes, notorious for its toxicity' },
    { symbol: 'Se', name: 'Selenium', number: 34, group: 'nonmetal', period: 4, column: 16, electrons: '2,8,18,6', mass: 78.971, description: 'Nonmetal with properties between sulfur and tellurium' },
    { symbol: 'Br', name: 'Bromine', number: 35, group: 'halogen', period: 4, column: 17, electrons: '2,8,18,7', mass: 79.904, description: 'Red-brown liquid at room temperature, only nonmetal that is liquid at room temperature' },
    { symbol: 'Kr', name: 'Krypton', number: 36, group: 'noble', period: 4, column: 18, electrons: '2,8,18,8', mass: 83.798, description: 'Colorless, odorless, tasteless noble gas' },
    
    // Row 5
    { symbol: 'Rb', name: 'Rubidium', number: 37, group: 'alkali', period: 5, column: 1, electrons: '2,8,18,8,1', mass: 85.468, description: 'Soft, silvery-white metallic element, highly reactive' },
    { symbol: 'Sr', name: 'Strontium', number: 38, group: 'alkaline', period: 5, column: 2, electrons: '2,8,18,8,2', mass: 87.62, description: 'Soft, silvery, alkaline earth metal that quickly oxidizes in air' },
    { symbol: 'Y', name: 'Yttrium', number: 39, group: 'transition', period: 5, column: 3, electrons: '2,8,18,9,2', mass: 88.906, description: 'Silvery-metallic transition metal chemically similar to lanthanides' },
    { symbol: 'Zr', name: 'Zirconium', number: 40, group: 'transition', period: 5, column: 4, electrons: '2,8,18,10,2', mass: 91.224, description: 'Silvery, very strong transition metal resistant to corrosion' },
    { symbol: 'Nb', name: 'Niobium', number: 41, group: 'transition', period: 5, column: 5, electrons: '2,8,18,12,1', mass: 92.906, description: 'Soft, ductile, transition metal with high corrosion resistance' },
    { symbol: 'Mo', name: 'Molybdenum', number: 42, group: 'transition', period: 5, column: 6, electrons: '2,8,18,13,1', mass: 95.95, description: 'Silvery metal with a gray cast, has the sixth-highest melting point' },
    { symbol: 'Tc', name: 'Technetium', number: 43, group: 'transition', period: 5, column: 7, electrons: '2,8,18,13,2', mass: 98, description: 'Silvery-gray radioactive metal, first synthetically produced element' },
    { symbol: 'Ru', name: 'Ruthenium', number: 44, group: 'transition', period: 5, column: 8, electrons: '2,8,18,15,1', mass: 101.07, description: 'Rare transition metal of the platinum group, hard and brittle' },
    { symbol: 'Rh', name: 'Rhodium', number: 45, group: 'transition', period: 5, column: 9, electrons: '2,8,18,16,1', mass: 102.91, description: 'Rare, silvery-white, hard, corrosion-resistant, and chemically inert transition metal' },
    { symbol: 'Pd', name: 'Palladium', number: 46, group: 'transition', period: 5, column: 10, electrons: '2,8,18,18', mass: 106.42, description: 'Rare and lustrous silvery-white metal, chemically resembles platinum' },
    { symbol: 'Ag', name: 'Silver', number: 47, group: 'transition', period: 5, column: 11, electrons: '2,8,18,18,1', mass: 107.87, description: 'Soft, white, lustrous transition metal with highest thermal conductivity' },
    { symbol: 'Cd', name: 'Cadmium', number: 48, group: 'transition', period: 5, column: 12, electrons: '2,8,18,18,2', mass: 112.41, description: 'Soft, bluish-white metal, highly toxic and used in batteries' },
    { symbol: 'In', name: 'Indium', number: 49, group: 'post-transition', period: 5, column: 13, electrons: '2,8,18,18,3', mass: 114.82, description: 'Soft, malleable post-transition metal with a bright luster' },
    { symbol: 'Sn', name: 'Tin', number: 50, group: 'post-transition', period: 5, column: 14, electrons: '2,8,18,18,4', mass: 118.71, description: 'Malleable, ductile, highly crystalline, silvery-white metal' },
    { symbol: 'Sb', name: 'Antimony', number: 51, group: 'metalloid', period: 5, column: 15, electrons: '2,8,18,18,5', mass: 121.76, description: 'Lustrous gray metalloid, sometimes found free in nature' },
    { symbol: 'Te', name: 'Tellurium', number: 52, group: 'metalloid', period: 5, column: 16, electrons: '2,8,18,18,6', mass: 127.60, description: 'Brittle, mildly toxic, rare, silvery-white metalloid' },
    { symbol: 'I', name: 'Iodine', number: 53, group: 'halogen', period: 5, column: 17, electrons: '2,8,18,18,7', mass: 126.90, description: 'Heaviest essential mineral nutrient, purple-black solid that sublimes to a violet gas' },
    { symbol: 'Xe', name: 'Xenon', number: 54, group: 'noble', period: 5, column: 18, electrons: '2,8,18,18,8', mass: 131.29, description: 'Colorless, heavy, odorless noble gas, used in lighting and medical applications' },
    
    // Row 6 (main group elements)
    { symbol: 'Cs', name: 'Cesium', number: 55, group: 'alkali', period: 6, column: 1, electrons: '2,8,18,18,8,1', mass: 132.91, description: 'Soft, silvery-gold alkali metal, highly reactive and pyrophoric' },
    { symbol: 'Ba', name: 'Barium', number: 56, group: 'alkaline', period: 6, column: 2, electrons: '2,8,18,18,8,2', mass: 137.33, description: 'Soft, silvery alkaline earth metal, oxidizes rapidly in air' },
    
    // Lanthanides (shown separately in periodic table)
    { symbol: 'La', name: 'Lanthanum', number: 57, group: 'lanthanide', period: 8, column: 3, electrons: '2,8,18,18,9,2', mass: 138.91, description: 'Soft, ductile, silvery-white metal that tarnishes rapidly in air' },
    { symbol: 'Ce', name: 'Cerium', number: 58, group: 'lanthanide', period: 8, column: 4, electrons: '2,8,18,19,9,2', mass: 140.12, description: 'Soft, silvery, ductile metal that oxidizes readily in air' },
    { symbol: 'Pr', name: 'Praseodymium', number: 59, group: 'lanthanide', period: 8, column: 5, electrons: '2,8,18,21,8,2', mass: 140.91, description: 'Soft, silvery, malleable and ductile metal, develops green oxide coating when exposed to air' },
    { symbol: 'Nd', name: 'Neodymium', number: 60, group: 'lanthanide', period: 8, column: 6, electrons: '2,8,18,22,8,2', mass: 144.24, description: 'Soft, silvery metal that oxidizes quickly in air, used in powerful permanent magnets' },
    { symbol: 'Pm', name: 'Promethium', number: 61, group: 'lanthanide', period: 8, column: 7, electrons: '2,8,18,23,8,2', mass: 145, description: 'Radioactive metallic element, all isotopes are radioactive' },
    { symbol: 'Sm', name: 'Samarium', number: 62, group: 'lanthanide', period: 8, column: 8, electrons: '2,8,18,24,8,2', mass: 150.36, description: 'Silvery-white metallic element, moderately hard and reactive' },
    { symbol: 'Eu', name: 'Europium', number: 63, group: 'lanthanide', period: 8, column: 9, electrons: '2,8,18,25,8,2', mass: 151.96, description: 'Soft silvery metal, most reactive of the rare earth elements' },
    { symbol: 'Gd', name: 'Gadolinium', number: 64, group: 'lanthanide', period: 8, column: 10, electrons: '2,8,18,25,9,2', mass: 157.25, description: 'Silvery-white, malleable and ductile rare earth metal' },
    { symbol: 'Tb', name: 'Terbium', number: 65, group: 'lanthanide', period: 8, column: 11, electrons: '2,8,18,27,8,2', mass: 158.93, description: 'Silvery-white, rare earth metal that is malleable, ductile, and soft' },
    { symbol: 'Dy', name: 'Dysprosium', number: 66, group: 'lanthanide', period: 8, column: 12, electrons: '2,8,18,28,8,2', mass: 162.50, description: 'Silvery-white, relatively hard metal with a bright, metallic luster' },
    { symbol: 'Ho', name: 'Holmium', number: 67, group: 'lanthanide', period: 8, column: 13, electrons: '2,8,18,29,8,2', mass: 164.93, description: 'Relatively soft and malleable silvery-white metal' },
    { symbol: 'Er', name: 'Erbium', number: 68, group: 'lanthanide', period: 8, column: 14, electrons: '2,8,18,30,8,2', mass: 167.26, description: 'Silvery-white solid metal when artificially isolated, natural ores contain pink erbium' },
    { symbol: 'Tm', name: 'Thulium', number: 69, group: 'lanthanide', period: 8, column: 15, electrons: '2,8,18,31,8,2', mass: 168.93, description: 'Silvery-gray, soft metal that is easily workable and tarnishes in air' },
    { symbol: 'Yb', name: 'Ytterbium', number: 70, group: 'lanthanide', period: 8, column: 16, electrons: '2,8,18,32,8,2', mass: 173.05, description: 'Soft, malleable and ductile chemical element, bright silvery luster' },
    { symbol: 'Lu', name: 'Lutetium', number: 71, group: 'lanthanide', period: 8, column: 17, electrons: '2,8,18,32,9,2', mass: 174.97, description: 'Silvery white metal, last element in the lanthanide series' },
    
    // Continuation of Row 6 after lanthanides
    { symbol: 'Hf', name: 'Hafnium', number: 72, group: 'transition', period: 6, column: 4, electrons: '2,8,18,32,10,2', mass: 178.49, description: 'Shiny, silvery, corrosion-resistant metal, chemically similar to zirconium' },
    { symbol: 'Ta', name: 'Tantalum', number: 73, group: 'transition', period: 6, column: 5, electrons: '2,8,18,32,11,2', mass: 180.95, description: 'Blue-gray, dense, very hard, and highly corrosion-resistant metal' },
    { symbol: 'W', name: 'Tungsten', number: 74, group: 'transition', period: 6, column: 6, electrons: '2,8,18,32,12,2', mass: 183.84, description: 'Steel-gray to tin-white metal, extremely high melting point' },
    { symbol: 'Re', name: 'Rhenium', number: 75, group: 'transition', period: 6, column: 7, electrons: '2,8,18,32,13,2', mass: 186.21, description: 'Silvery-white, heavy, third-row transition metal with one of the highest melting points' },
    { symbol: 'Os', name: 'Osmium', number: 76, group: 'transition', period: 6, column: 8, electrons: '2,8,18,32,14,2', mass: 190.23, description: 'Bluish-white, lustrous, hard transition metal, densest natural element' },
    { symbol: 'Ir', name: 'Iridium', number: 77, group: 'transition', period: 6, column: 9, electrons: '2,8,18,32,15,2', mass: 192.22, description: 'Very hard, brittle, silvery-white transition metal, most corrosion-resistant metal' },
    { symbol: 'Pt', name: 'Platinum', number: 78, group: 'transition', period: 6, column: 10, electrons: '2,8,18,32,17,1', mass: 195.08, description: 'Dense, malleable, ductile, highly unreactive, grayish-white transition metal' },
    { symbol: 'Au', name: 'Gold', number: 79, group: 'transition', period: 6, column: 11, electrons: '2,8,18,32,18,1', mass: 196.97, description: 'Bright, slightly reddish yellow, dense, soft, malleable, and ductile metal' },
    { symbol: 'Hg', name: 'Mercury', number: 80, group: 'transition', period: 6, column: 12, electrons: '2,8,18,32,18,2', mass: 200.59, description: 'Heavy, silvery-white liquid metal, only metal liquid at room temperature' },
    { symbol: 'Tl', name: 'Thallium', number: 81, group: 'post-transition', period: 6, column: 13, electrons: '2,8,18,32,18,3', mass: 204.38, description: 'Soft, malleable post-transition metal with a bluish-white tint' },
    { symbol: 'Pb', name: 'Lead', number: 82, group: 'post-transition', period: 6, column: 14, electrons: '2,8,18,32,18,4', mass: 207.2, description: 'Soft, malleable, heavy post-transition metal with low melting point' },
    { symbol: 'Bi', name: 'Bismuth', number: 83, group: 'post-transition', period: 6, column: 15, electrons: '2,8,18,32,18,5', mass: 208.98, description: 'Brittle metal with a silvery-white appearance and pink tinge' },
    { symbol: 'Po', name: 'Polonium', number: 84, group: 'post-transition', period: 6, column: 16, electrons: '2,8,18,32,18,6', mass: 209, description: 'Radioactive, rare metal, found in uranium ores' },
    { symbol: 'At', name: 'Astatine', number: 85, group: 'halogen', period: 6, column: 17, electrons: '2,8,18,32,18,7', mass: 210, description: 'Rarest naturally occurring element in Earth\'s crust, all isotopes are radioactive' },
    { symbol: 'Rn', name: 'Radon', number: 86, group: 'noble', period: 6, column: 18, electrons: '2,8,18,32,18,8', mass: 222, description: 'Radioactive, colorless, odorless, tasteless noble gas' },
    
    // Row 7
    { symbol: 'Fr', name: 'Francium', number: 87, group: 'alkali', period: 7, column: 1, electrons: '2,8,18,32,18,8,1', mass: 223, description: 'Highly radioactive alkali metal, extremely rare in nature' },
    { symbol: 'Ra', name: 'Radium', number: 88, group: 'alkaline', period: 7, column: 2, electrons: '2,8,18,32,18,8,2', mass: 226, description: 'Radioactive, luminous, alkaline earth metal' },
    
    // Actinides (shown separately in periodic table)
    { symbol: 'Ac', name: 'Actinium', number: 89, group: 'actinide', period: 9, column: 3, electrons: '2,8,18,32,18,9,2', mass: 227, description: 'Soft, silvery-white radioactive metal' },
    { symbol: 'Th', name: 'Thorium', number: 90, group: 'actinide', period: 9, column: 4, electrons: '2,8,18,32,18,10,2', mass: 232.04, description: 'Silvery, often black or gray, radioactive actinide metal' },
    { symbol: 'Pa', name: 'Protactinium', number: 91, group: 'actinide', period: 9, column: 5, electrons: '2,8,18,32,20,9,2', mass: 231.04, description: 'Dense, silvery-gray radioactive actinide metal' },
    { symbol: 'U', name: 'Uranium', number: 92, group: 'actinide', period: 9, column: 6, electrons: '2,8,18,32,21,9,2', mass: 238.03, description: 'Silvery-white metal, weakly radioactive, used in nuclear applications' },
    { symbol: 'Np', name: 'Neptunium', number: 93, group: 'actinide', period: 9, column: 7, electrons: '2,8,18,32,22,9,2', mass: 237, description: 'Silvery radioactive actinide metal, first transuranic element' },
    { symbol: 'Pu', name: 'Plutonium', number: 94, group: 'actinide', period: 9, column: 8, electrons: '2,8,18,32,24,8,2', mass: 244, description: 'Radioactive, silvery-white actinide metal, warm to the touch due to radioactive decay' },
    { symbol: 'Am', name: 'Americium', number: 95, group: 'actinide', period: 9, column: 9, electrons: '2,8,18,32,25,8,2', mass: 243, description: 'Synthetic radioactive metallic element, silvery-white' },
    { symbol: 'Cm', name: 'Curium', number: 96, group: 'actinide', period: 9, column: 10, electrons: '2,8,18,32,25,9,2', mass: 247, description: 'Hard, dense, silvery radioactive actinide metal' },
    { symbol: 'Bk', name: 'Berkelium', number: 97, group: 'actinide', period: 9, column: 11, electrons: '2,8,18,32,27,8,2', mass: 247, description: 'Radioactive actinide element, soft, silvery-white metal' },
    { symbol: 'Cf', name: 'Californium', number: 98, group: 'actinide', period: 9, column: 12, electrons: '2,8,18,32,28,8,2', mass: 251, description: 'Radioactive actinide element, second-heaviest element found in measurable quantities in nature' },
    { symbol: 'Es', name: 'Einsteinium', number: 99, group: 'actinide', period: 9, column: 13, electrons: '2,8,18,32,29,8,2', mass: 252, description: 'Synthetic element, soft, silvery, paramagnetic metal' },
    { symbol: 'Fm', name: 'Fermium', number: 100, group: 'actinide', period: 9, column: 14, electrons: '2,8,18,32,30,8,2', mass: 257, description: 'Synthetic, extremely radioactive element, metallic and silver in color' },
    { symbol: 'Md', name: 'Mendelevium', number: 101, group: 'actinide', period: 9, column: 15, electrons: '2,8,18,32,31,8,2', mass: 258, description: 'Synthetic, radioactive metal, first created in 1955' },
    { symbol: 'No', name: 'Nobelium', number: 102, group: 'actinide', period: 9, column: 16, electrons: '2,8,18,32,32,8,2', mass: 259, description: 'Synthetic, radioactive actinide, named after Alfred Nobel' },
    { symbol: 'Lr', name: 'Lawrencium', number: 103, group: 'actinide', period: 9, column: 17, electrons: '2,8,18,32,32,8,3', mass: 266, description: 'Synthetic, radioactive metal, last element in the actinide series' },
    
    // Continuation of Row 7 after actinides
    { symbol: 'Rf', name: 'Rutherfordium', number: 104, group: 'transition', period: 7, column: 4, electrons: '2,8,18,32,32,10,2', mass: 267, description: 'Synthetic, radioactive transition metal' },
    { symbol: 'Db', name: 'Dubnium', number: 105, group: 'transition', period: 7, column: 5, electrons: '2,8,18,32,32,11,2', mass: 268, description: 'Synthetic, radioactive transition metal named after the city of Dubna' },
    { symbol: 'Sg', name: 'Seaborgium', number: 106, group: 'transition', period: 7, column: 6, electrons: '2,8,18,32,32,12,2', mass: 269, description: 'Synthetic, radioactive transition metal named after Glenn T. Seaborg' },
    { symbol: 'Bh', name: 'Bohrium', number: 107, group: 'transition', period: 7, column: 7, electrons: '2,8,18,32,32,13,2', mass: 270, description: 'Synthetic, radioactive transition metal named after Niels Bohr' },
    { symbol: 'Hs', name: 'Hassium', number: 108, group: 'transition', period: 7, column: 8, electrons: '2,8,18,32,32,14,2', mass: 277, description: 'Synthetic, highly radioactive metal' },
    { symbol: 'Mt', name: 'Meitnerium', number: 109, group: 'transition', period: 7, column: 9, electrons: '2,8,18,32,32,15,2', mass: 278, description: 'Synthetic, highly radioactive metal named after Lise Meitner' },
    { symbol: 'Ds', name: 'Darmstadtium', number: 110, group: 'transition', period: 7, column: 10, electrons: '2,8,18,32,32,17,1', mass: 281, description: 'Synthetic, radioactive transition metal named after Darmstadt, Germany' },
    { symbol: 'Rg', name: 'Roentgenium', number: 111, group: 'transition', period: 7, column: 11, electrons: '2,8,18,32,32,18,1', mass: 282, description: 'Synthetic, radioactive metal named after Wilhelm Röntgen' },
    { symbol: 'Cn', name: 'Copernicium', number: 112, group: 'transition', period: 7, column: 12, electrons: '2,8,18,32,32,18,2', mass: 285, description: 'Synthetic, radioactive transition metal named after Nicolaus Copernicus' },
    { symbol: 'Nh', name: 'Nihonium', number: 113, group: 'post-transition', period: 7, column: 13, electrons: '2,8,18,32,32,18,3', mass: 286, description: 'Synthetic, radioactive element named after Japan (Nihon)' },
    { symbol: 'Fl', name: 'Flerovium', number: 114, group: 'post-transition', period: 7, column: 14, electrons: '2,8,18,32,32,18,4', mass: 289, description: 'Synthetic, radioactive element named after the Flerov Laboratory' },
    { symbol: 'Mc', name: 'Moscovium', number: 115, group: 'post-transition', period: 7, column: 15, electrons: '2,8,18,32,32,18,5', mass: 290, description: 'Synthetic, radioactive element named after Moscow region' },
    { symbol: 'Lv', name: 'Livermorium', number: 116, group: 'post-transition', period: 7, column: 16, electrons: '2,8,18,32,32,18,6', mass: 293, description: 'Synthetic, radioactive element named after Lawrence Livermore National Laboratory' },
    { symbol: 'Ts', name: 'Tennessine', number: 117, group: 'halogen', period: 7, column: 17, electrons: '2,8,18,32,32,18,7', mass: 294, description: 'Synthetic, radioactive element named after Tennessee' },
    { symbol: 'Og', name: 'Oganesson', number: 118, group: 'noble', period: 7, column: 18, electrons: '2,8,18,32,32,18,8', mass: 294, description: 'Synthetic, radioactive element named after Yuri Oganessian' }
  ];

  // Color mapping for element groups
  const colorMap: ColorMap = {
    alkali: "#ff8a65", // Orange-red
    alkaline: "#ffb74d", // Orange-yellow
    transition: "#64b5f6", // Blue
    "post-transition": "#4db6ac", // Teal
    metalloid: "#81c784", // Green
    nonmetal: "#fff176", // Yellow
    halogen: "#9575cd", // Purple
    noble: "#f06292", // Pink
    lanthanide: "#8ec5ff", // Indigo
    actinide: "#c27aff", // Cyan
  };


  export { elements, colorMap };