// const elements: Element[] = [
//   {
//     symbol: "H",
//     name: "Hydrogen",
//     number: 1,
//     group: "Nonmetal",               // Group (family): reactive nonmetal (diatomic gas)
//     period: 1,
//     column: 1,
//     electrons: "1",                 // 1 electron in the first shell
//     mass: 1.008,
//     description: "Hydrogen is a colorless, odorless diatomic gas and the lightest element.&#8203;:contentReference[oaicite:0]{index=0}",
//     density: 0.00008988,            // g/cm³ at STP
//     meltingPoint: 14.01,           // K
//     boilingPoint: 20.28,           // K
//     atomicRadius: 110,             // pm (van der Waals radius)&#8203;:contentReference[oaicite:1]{index=1}
//     electronegativity: 2.20,       // Pauling scale&#8203;:contentReference[oaicite:2]{index=2}
//     discoveryYear: 1766,
//     discoveredBy: "Henry Cavendish",  // Cavendish identified H2 as a discrete substance&#8203;:contentReference[oaicite:3]{index=3}
//     namedAfter: "Greek ‘hydro’ + ‘genes’ (water-forming)",  // from Greek words for “water-former”&#8203;:contentReference[oaicite:4]{index=4}
//     electronConfiguration: "1s1",
//     oxidationStates: "+1, -1",     // common oxidation states in compounds
//     electronShells: [1],
//     color: "colorless",
//     appearance: "colorless gas",
//     commonUses: ["lifting gas (balloons)", "ammonia production"],  // H2 for weather balloons; Haber process&#8203;:contentReference[oaicite:5]{index=5}
//     phase: "gas",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 1400,          // ppm in Earth's crust (approx.)
//     abundanceUniverse: 750000,     // ppm in universe (~75% of normal matter)
//     cpkColor: "#FFFFFF",           // CPK color (white for hydrogen)
//     iconColor: "#FFFFFF",
//     modelColor: "#FFFFFF",
//     modelRadius: 25
//   }, // Hydrogen&#8203;:contentReference[oaicite:6]{index=6}&#8203;:contentReference[oaicite:7]{index=7}

//   {
//     symbol: "He",
//     name: "Helium",
//     number: 2,
//     group: "Noble gas",
//     period: 1,
//     column: 18,
//     electrons: "2",
//     mass: 4.0026,
//     description: "Helium is an inert, colorless monatomic gas and the second lightest element.&#8203;:contentReference[oaicite:8]{index=8}",
//     density: 0.0001785,            // g/cm³ at STP&#8203;:contentReference[oaicite:9]{index=9}
//     meltingPoint: 0.95,           // K (Helium liquefies at ~4 K; solid at 0.95 K under pressure)
//     boilingPoint: 4.22,           // K (boiling point at 1 atm)&#8203;:contentReference[oaicite:10]{index=10}
//     atomicRadius: 140,            // pm (van der Waals radius)&#8203;:contentReference[oaicite:11]{index=11}
//     electronegativity: null,      // no electronegativity (does not form stable compounds)
//     discoveryYear: 1868,
//     discoveredBy: "Pierre Janssen & Norman Lockyer",  // independently observed in solar spectrum&#8203;:contentReference[oaicite:12]{index=12}
//     namedAfter: "Helios (Greek sun god)",  // named for the Sun (where first discovered during eclipse)
//     electronConfiguration: "1s2",
//     oxidationStates: "0",         // virtually no compounds
//     electronShells: [2],
//     color: "colorless",
//     appearance: "colorless gas",
//     commonUses: ["balloons and blimps", "cryogenic cooling (superconductors)"],  // lifting gas; liquid He for MRI coolants&#8203;:contentReference[oaicite:13]{index=13}
//     phase: "gas",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 0.008,        // ppm in Earth's crust (very scarce)
//     abundanceUniverse: 230000,    // ppm in universe (~23% of baryonic mass)
//     cpkColor: "#D9FFFF",          // CPK color (pale purple)
//     iconColor: "#D9FFFF",
//     modelColor: "#D9FFFF",
//     modelRadius: 25
//   }, // Helium&#8203;:contentReference[oaicite:14]{index=14}&#8203;:contentReference[oaicite:15]{index=15}

//   {
//     symbol: "Li",
//     name: "Lithium",
//     number: 3,
//     group: "Alkali metal",
//     period: 2,
//     column: 1,
//     electrons: "2, 1",
//     mass: 6.94,
//     description: "Lithium is a soft, silvery-white metal, the lightest solid element.&#8203;:contentReference[oaicite:16]{index=16}",
//     density: 0.534,               // g/cm³
//     meltingPoint: 453.65,        // K
//     boilingPoint: 1603,          // K
//     atomicRadius: 182,           // pm (metallic radius)
//     electronegativity: 0.98,
//     discoveryYear: 1817,
//     discoveredBy: "Johan August Arfwedson",  // discovered petalite ore containing lithium (1817)
//     namedAfter: "‘Lithos’ (Greek for stone)",  // named by Arfwedson from Greek "lithos"&#8203;:contentReference[oaicite:17]{index=17}
//     electronConfiguration: "[He] 2s1",
//     oxidationStates: "+1",
//     electronShells: [2, 1],
//     color: "silvery-white",
//     appearance: "soft silvery metal",
//     commonUses: ["rechargeable batteries", "aircraft alloys"],  // lithium-ion batteries; Li-Al alloys&#8203;:contentReference[oaicite:18]{index=18}
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 20,           // ppm in Earth's crust (approx.)
//     abundanceUniverse: 60,        // ppm in universe
//     cpkColor: "#CC80FF",          // CPK color (magenta)
//     iconColor: "#CC80FF",
//     modelColor: "#CC80FF",
//     modelRadius: 145
//   }, // Lithium&#8203;:contentReference[oaicite:19]{index=19}&#8203;:contentReference[oaicite:20]{index=20}

//   {
//     symbol: "Be",
//     name: "Beryllium",
//     number: 4,
//     group: "Alkaline earth metal",
//     period: 2,
//     column: 2,
//     electrons: "2, 2",
//     mass: 9.0122,
//     description: "Beryllium is a hard, gray-white metallic element with high stiffness and a high melting point&#8203;:contentReference[oaicite:21]{index=21}.",
//     density: 1.85,                // g/cm³
//     meltingPoint: 1560,          // K
//     boilingPoint: 2742,          // K
//     atomicRadius: 153,           // pm (metallic radius)
//     electronegativity: 1.57,
//     discoveryYear: 1798,
//     discoveredBy: "Louis-Nicolas Vauquelin",  // isolated in beryl and emerald (1798)&#8203;:contentReference[oaicite:22]{index=22}
//     namedAfter: "Beryl (mineral) – from Greek ‘beryllos’",  // named for beryl mineral (contains Be)
//     electronConfiguration: "[He] 2s2",
//     oxidationStates: "+2",
//     electronShells: [2, 2],
//     color: "steel gray",
//     appearance: "hard brittle gray metal",
//     commonUses: ["aerospace structural alloys", "X-ray windows"],  // Be-copper alloys in aircraft; Be foil for X-ray tubes&#8203;:contentReference[oaicite:23]{index=23}
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 2.8,         // ppm in Earth's crust
//     abundanceUniverse: 0.02,     // ppm in universe (very low)
//     cpkColor: "#C2FF00",         // CPK color (chartreuse)
//     iconColor: "#C2FF00",
//     modelColor: "#C2FF00",
//     modelRadius: 105
//   }, // Beryllium&#8203;:contentReference[oaicite:24]{index=24}

//   {
//     symbol: "B",
//     name: "Boron",
//     number: 5,
//     group: "Metalloid",
//     period: 2,
//     column: 13,
//     electrons: "2, 3",
//     mass: 10.81,
//     description: "Boron is a metalloid (semiconducting solid) that is hard and brown-black in its amorphous form.&#8203;:contentReference[oaicite:25]{index=25}",
//     density: 2.34,               // g/cm³
//     meltingPoint: 2349,         // K
//     boilingPoint: 4200,         // K
//     atomicRadius: 192,          // pm (approx. nonbonded radius)
//     electronegativity: 2.04,
//     discoveryYear: 1808,
//     discoveredBy: "Joseph-Louis Gay-Lussac & Louis Thénard (and H. Davy)",  // independently in 1808&#8203;:contentReference[oaicite:26]{index=26}
//     namedAfter: "Borah (Arabic for borax mineral)",  // from borax (tincal), via Arabic/Persian
//     electronConfiguration: "[He] 2s2 2p1",
//     oxidationStates: "+3, +1",
//     electronShells: [2, 3],
//     color: "black-brown",
//     appearance: "brown-black semimetal",
//     commonUses: ["borosilicate glass", "detergent (borax)"],  // boron in Pyrex glass; borax in cleaning agents&#8203;:contentReference[oaicite:27]{index=27}
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metalloid",
//     abundanceCrust: 10,          // ppm
//     abundanceUniverse: 0.6,      // ppm
//     cpkColor: "#FFB5B5",         // CPK color (salmon)
//     iconColor: "#FFB5B5",
//     modelColor: "#FFB5B5",
//     modelRadius: 85
//   }, // Boron&#8203;:contentReference[oaicite:28]{index=28}

//   {
//     symbol: "C",
//     name: "Carbon",
//     number: 6,
//     group: "Nonmetal",
//     period: 2,
//     column: 14,
//     electrons: "2, 4",
//     mass: 12.011,
//     description: "Carbon is a nonmetal that exists in various allotropes, including graphite (black) and diamond (clear).&#8203;:contentReference[oaicite:29]{index=29}",
//     density: 2.267,              // g/cm³ (graphite)
//     meltingPoint: 3823,         // K (sublimes ~4000 K)
//     boilingPoint: 4098,         // K (est. sublimation point)
//     atomicRadius: 170,          // pm (van der Waals radius for graphite)
//     electronegativity: 2.55,
//     discoveryYear: null,
//     discoveredBy: null,         // Known since prehistoric times&#8203;:contentReference[oaicite:30]{index=30}
//     namedAfter: "Latin ‘carbo’ (charcoal)",
//     electronConfiguration: "[He] 2s2 2p2",
//     oxidationStates: "+4, +2, -4",
//     electronShells: [2, 4],
//     color: "varies (black or clear)",
//     appearance: "black (graphite) or transparent (diamond) solid",
//     commonUses: ["steel production (coke)", "jewelry (diamonds)", "carbon fibers"],  // graphite in steelmaking; diamond gemstones&#8203;:contentReference[oaicite:31]{index=31}
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 200,        // ppm (as carbon in compounds)
//     abundanceUniverse: 5000,    // ppm
//     cpkColor: "#909090",        // CPK color (dark gray)
//     iconColor: "#909090",
//     modelColor: "#909090",
//     modelRadius: 70
//   }, // Carbon&#8203;:contentReference[oaicite:32]{index=32}&#8203;:contentReference[oaicite:33]{index=33}

//   {
//     symbol: "N",
//     name: "Nitrogen",
//     number: 7,
//     group: "Nonmetal",
//     period: 2,
//     column: 15,
//     electrons: "2, 5",
//     mass: 14.007,
//     description: "Nitrogen is a colorless, odorless diatomic gas that makes up ~78% of Earth’s atmosphere.&#8203;:contentReference[oaicite:34]{index=34}",
//     density: 0.0012506,         // g/cm³ at STP
//     meltingPoint: 63.15,        // K
//     boilingPoint: 77.36,        // K
//     atomicRadius: 155,          // pm (van der Waals radius)
//     electronegativity: 3.04,
//     discoveryYear: 1772,
//     discoveredBy: "Daniel Rutherford",  // identified nitrogen as "noxious air" (1772)
//     namedAfter: "Greek ‘nitron’ (saltpetre) + ‘genes’ (forming)",  // meaning “nitre-forming” (from saltpeter)
//     electronConfiguration: "[He] 2s2 2p3",
//     oxidationStates: "+5, +4, +3, +2, +1, -1, -2, -3",  // wide range in compounds
//     electronShells: [2, 5],
//     color: "colorless",
//     appearance: "colorless gas",
//     commonUses: ["fertilizers (via ammonia)", "cryogenics (liquid N₂)"],  // NH3 for fertilizer; liquid N2 coolant&#8203;:contentReference[oaicite:35]{index=35}&#8203;:contentReference[oaicite:36]{index=36}
//     phase: "gas",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 19,         // ppm (as N in minerals)
//     abundanceUniverse: 1000,    // ppm
//     cpkColor: "#3050F8",        // CPK color (blue)
//     iconColor: "#3050F8",
//     modelColor: "#3050F8",
//     modelRadius: 65
//   }, // Nitrogen&#8203;:contentReference[oaicite:37]{index=37}

//   {
//     symbol: "O",
//     name: "Oxygen",
//     number: 8,
//     group: "Nonmetal",
//     period: 2,
//     column: 16,
//     electrons: "2, 6",
//     mass: 15.999,
//     description: "Oxygen is a reactive nonmetal gas that is colorless in air and essential for respiration.&#8203;:contentReference[oaicite:38]{index=38}",
//     density: 0.001429,          // g/cm³ at STP
//     meltingPoint: 54.36,        // K
//     boilingPoint: 90.20,        // K
//     atomicRadius: 152,          // pm (van der Waals radius)
//     electronegativity: 3.44,
//     discoveryYear: 1774,
//     discoveredBy: "Joseph Priestley & Carl Scheele",  // both independently in 1774
//     namedAfter: "Greek ‘oxy-genēs’ (acid-former)",  // thought to produce acids
//     electronConfiguration: "[He] 2s2 2p4",
//     oxidationStates: "-2 (most), -1, +2",  // common -2; -1 in peroxides; +2 in OF2
//     electronShells: [2, 6],
//     color: "colorless (gas)",
//     appearance: "colorless gas (pale blue as liquid)",
//     commonUses: ["steelmaking (blast furnaces)", "medical breathing oxygen"],  // O2 in steel manufacture; bottled O2 for medicine
//     phase: "gas",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 461000,     // ppm (~46.1% by mass, most abundant in crust)&#8203;:contentReference[oaicite:39]{index=39}
//     abundanceUniverse: 10000,   // ppm (~1% of universe by mass)
//     cpkColor: "#FF0D0D",        // CPK color (red)
//     iconColor: "#FF0D0D",
//     modelColor: "#FF0D0D",
//     modelRadius: 60
//   }, // Oxygen&#8203;:contentReference[oaicite:40]{index=40}

//   {
//     symbol: "F",
//     name: "Fluorine",
//     number: 9,
//     group: "Halogen",
//     period: 2,
//     column: 17,
//     electrons: "2, 7",
//     mass: 18.998,
//     description: "Fluorine is a pale yellow, highly reactive diatomic gas and the most electronegative element.&#8203;:contentReference[oaicite:41]{index=41}",
//     density: 0.001696,         // g/cm³ at STP&#8203;:contentReference[oaicite:42]{index=42}
//     meltingPoint: 53.53,       // K&#8203;:contentReference[oaicite:43]{index=43}
//     boilingPoint: 85.03,       // K&#8203;:contentReference[oaicite:44]{index=44}
//     atomicRadius: 135,         // pm (van der Waals)
//     electronegativity: 3.98,   // highest on Pauling scale&#8203;:contentReference[oaicite:45]{index=45}
//     discoveryYear: 1886,
//     discoveredBy: "Henri Moissan",  // isolated fluorine gas in 1886&#8203;:contentReference[oaicite:46]{index=46}
//     namedAfter: "Latin ‘fluere’ (to flow)",  // from fluorspar mineral (flux)
//     electronConfiguration: "[He] 2s2 2p5",
//     oxidationStates: "-1",
//     electronShells: [2, 7],
//     color: "pale yellow",
//     appearance: "pale yellow gas",
//     commonUses: ["refrigerants (CFCs, etc.)", "uranium hexafluoride (nuclear fuel)"],  // historically Freon; UF6 in uranium enrichment
//     phase: "gas",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 585,       // ppm
//     abundanceUniverse: 4,      // ppm
//     cpkColor: "#90E050",       // CPK color (green)
//     iconColor: "#90E050",
//     modelColor: "#90E050",
//     modelRadius: 50
//   }, // Fluorine&#8203;:contentReference[oaicite:47]{index=47}&#8203;:contentReference[oaicite:48]{index=48}

//   {
//     symbol: "Ne",
//     name: "Neon",
//     number: 10,
//     group: "Noble gas",
//     period: 2,
//     column: 18,
//     electrons: "2, 8",
//     mass: 20.180,
//     description: "Neon is an inert, colorless monatomic gas that emits a reddish-orange glow in vacuum tubes.&#8203;:contentReference[oaicite:49]{index=49}",
//     density: 0.0008999,        // g/cm³ at STP
//     meltingPoint: 24.56,       // K
//     boilingPoint: 27.07,       // K
//     atomicRadius: 154,         // pm (van der Waals)
//     electronegativity: null,
//     discoveryYear: 1898,
//     discoveredBy: "Sir William Ramsay & Morris Travers",  // discovered neon in air (1898)
//     namedAfter: "Greek ‘neos’ (new)",
//     electronConfiguration: "[He] 2s2 2p6",
//     oxidationStates: "0",
//     electronShells: [2, 8],
//     color: "colorless",
//     appearance: "colorless gas (glows reddish-orange in discharge)",
//     commonUses: ["neon advertising signs", "high-voltage indicators"],  // neon lamps/signs&#8203;:contentReference[oaicite:50]{index=50}
//     phase: "gas",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 0.005,     // ppm
//     abundanceUniverse: 1200,   // ppm
//     cpkColor: "#B3E3F5",       // CPK color (ice blue)
//     iconColor: "#B3E3F5",
//     modelColor: "#B3E3F5",
//     modelRadius: 38
//   }, // Neon&#8203;:contentReference[oaicite:51]{index=51}

//   {
//     symbol: "Na",
//     name: "Sodium",
//     number: 11,
//     group: "Alkali metal",
//     period: 3,
//     column: 1,
//     electrons: "2, 8, 1",
//     mass: 22.990,
//     description: "Sodium is a soft, highly reactive silvery-white metal that tarnishes quickly in air.&#8203;:contentReference[oaicite:52]{index=52}",
//     density: 0.971,            // g/cm³
//     meltingPoint: 370.94,      // K
//     boilingPoint: 1156,        // K
//     atomicRadius: 227,         // pm (metallic)
//     electronegativity: 0.93,
//     discoveryYear: 1807,
//     discoveredBy: "Sir Humphry Davy",  // isolated sodium by electrolysis (1807)&#8203;:contentReference[oaicite:53]{index=53}
//     namedAfter: "English ‘soda’ (sodium oxide) / Medieval ‘sodanum’ (headache remedy)",  // or Latin natrium (from Egyptian natron)
//     electronConfiguration: "[Ne] 3s1",
//     oxidationStates: "+1",
//     electronShells: [2, 8, 1],
//     color: "silvery-white",
//     appearance: "soft silvery metal",
//     commonUses: ["table salt (NaCl)", "street lighting (sodium vapor lamps)"],  // sodium compounds; Na vapor lamps emit yellow light
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 23600,     // ppm (2.36% as Na2O, etc.)
//     abundanceUniverse: 500,    // ppm
//     cpkColor: "#AB5CF2",       // CPK color (purple)
//     iconColor: "#AB5CF2",
//     modelColor: "#AB5CF2",
//     modelRadius: 180
//   }, // Sodium&#8203;:contentReference[oaicite:54]{index=54}

//   {
//     symbol: "Mg",
//     name: "Magnesium",
//     number: 12,
//     group: "Alkaline earth metal",
//     period: 3,
//     column: 2,
//     electrons: "2, 8, 2",
//     mass: 24.305,
//     description: "Magnesium is a shiny gray metal that is lightweight and burns with a bright white flame.&#8203;:contentReference[oaicite:55]{index=55}",
//     density: 1.738,           // g/cm³
//     meltingPoint: 923,        // K
//     boilingPoint: 1363,       // K
//     atomicRadius: 173,        // pm (metallic)
//     electronegativity: 1.31,
//     discoveryYear: 1808,
//     discoveredBy: "Sir Humphry Davy",  // isolated pure Mg in 1808
//     namedAfter: "Magnesia (district in Greece)",  // named for Magnesia in Thessaly
//     electronConfiguration: "[Ne] 3s2",
//     oxidationStates: "+2",
//     electronShells: [2, 8, 2],
//     color: "silvery-white",
//     appearance: "silvery white metal",
//     commonUses: ["lightweight alloys (aircraft)", "pyrotechnics (bright flares)"],  // Mg-Al alloys; flash powders/flares
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 23300,    // ppm (~2.33%)
//     abundanceUniverse: 600,   // ppm
//     cpkColor: "#8AFF00",      // CPK color (green)
//     iconColor: "#8AFF00",
//     modelColor: "#8AFF00",
//     modelRadius: 150
//   }, // Magnesium&#8203;:contentReference[oaicite:56]{index=56}

//   {
//     symbol: "Al",
//     name: "Aluminum",
//     number: 13,
//     group: "Post-transition metal",
//     period: 3,
//     column: 13,
//     electrons: "2, 8, 3",
//     mass: 26.982,
//     description: "Aluminum is a silvery-white lightweight metal, known for its high conductivity and malleability.&#8203;:contentReference[oaicite:57]{index=57}",
//     density: 2.70,            // g/cm³
//     meltingPoint: 933.47,     // K
//     boilingPoint: 2743,       // K
//     atomicRadius: 184,        // pm (metallic)
//     electronegativity: 1.61,
//     discoveryYear: 1825,
//     discoveredBy: "Hans Christian Ørsted",  // first isolated aluminum (1825)&#8203;:contentReference[oaicite:58]{index=58}
//     namedAfter: "Latin ‘alumen’ (alum)",   // from alum (the mineral)
//     electronConfiguration: "[Ne] 3s2 3p1",
//     oxidationStates: "+3",
//     electronShells: [2, 8, 3],
//     color: "silvery-white",
//     appearance: "silvery metallic solid",
//     commonUses: ["aircraft structures", "foil and food packaging"],  // strong light alloys; aluminum foil&#8203;:contentReference[oaicite:59]{index=59}
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 82300,    // ppm (~8.23%, most abundant metal in crust)
//     abundanceUniverse: 50,    // ppm
//     cpkColor: "#BFA6A6",      // CPK color (grey)
//     iconColor: "#BFA6A6",
//     modelColor: "#BFA6A6",
//     modelRadius: 125
//   }, // Aluminum&#8203;:contentReference[oaicite:60]{index=60}

//   {
//     symbol: "Si",
//     name: "Silicon",
//     number: 14,
//     group: "Metalloid",
//     period: 3,
//     column: 14,
//     electrons: "2, 8, 4",
//     mass: 28.085,
//     description: "Silicon is a hard, brittle crystalline solid with a blue-gray metallic luster; it’s a crucial semiconductor.&#8203;:contentReference[oaicite:61]{index=61}",
//     density: 2.3296,         // g/cm³
//     meltingPoint: 1687,      // K
//     boilingPoint: 3538,      // K
//     atomicRadius: 210,       // pm (covalent ~111 pm; van der Waals ~210 pm)
//     electronegativity: 1.90,
//     discoveryYear: 1824,
//     discoveredBy: "Jöns Jakob Berzelius",  // prepared amorphous silicon (1824)
//     namedAfter: "Latin ‘silex’ or ‘silicis’ (flint)",
//     electronConfiguration: "[Ne] 3s2 3p2",
//     oxidationStates: "+4, -4",
//     electronShells: [2, 8, 4],
//     color: "blue-gray",
//     appearance: "crystalline blue-gray solid",
//     commonUses: ["semiconductor chips", "glass (silica)"],  // integrated circuits; silicon dioxide in glass
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metalloid",
//     abundanceCrust: 282000,   // ppm (~28.2%, second most abundant element in crust)&#8203;:contentReference[oaicite:62]{index=62}
//     abundanceUniverse: 700,   // ppm
//     cpkColor: "#F0C8A0",      // CPK color (brownish)
//     iconColor: "#F0C8A0",
//     modelColor: "#F0C8A0",
//     modelRadius: 110
//   }, // Silicon&#8203;:contentReference[oaicite:63]{index=63}

//   {
//     symbol: "P",
//     name: "Phosphorus",
//     number: 15,
//     group: "Nonmetal",
//     period: 3,
//     column: 15,
//     electrons: "2, 8, 5",
//     mass: 30.974,
//     description: "Phosphorus is a reactive nonmetal that exists in several allotropes; white phosphorus is a waxy white solid that glows in air.&#8203;:contentReference[oaicite:64]{index=64}",
//     density: 1.823,           // g/cm³ (white P)
//     meltingPoint: 317.30,     // K (white P)
//     boilingPoint: 553.65,     // K (white P)
//     atomicRadius: 180,        // pm (van der Waals for P4 molecule)
//     electronegativity: 2.19,
//     discoveryYear: 1669,
//     discoveredBy: "Hennig Brand",  // discovered by distilling urine (1669)
//     namedAfter: "Greek ‘phosphoros’ (light-bearing)",  // for the glow of white phosphorus&#8203;:contentReference[oaicite:65]{index=65}
//     electronConfiguration: "[Ne] 3s2 3p3",
//     oxidationStates: "+5, +3, -3",
//     electronShells: [2, 8, 5],
//     color: "white or red (allotropes)",
//     appearance: "waxy white solid (white P), or red-brown powder (red P)",
//     commonUses: ["fertilizers (phosphates)", "matches (red phosphorus)"],  // agricultural fertilizers; matchbook striker surfaces&#8203;:contentReference[oaicite:66]{index=66}
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 1050,     // ppm (as phosphates)
//     abundanceUniverse: 70,    // ppm
//     cpkColor: "#FF8000",      // CPK color (orange)
//     iconColor: "#FF8000",
//     modelColor: "#FF8000",
//     modelRadius: 100
//   }, // Phosphorus&#8203;:contentReference[oaicite:67]{index=67}

//   {
//     symbol: "S",
//     name: "Sulfur",
//     number: 16,
//     group: "Nonmetal",
//     period: 3,
//     column: 16,
//     electrons: "2, 8, 6",
//     mass: 32.06,
//     description: "Sulfur is a yellow, brittle nonmetal solid. In its elemental form it commonly occurs as S₈ rings.&#8203;:contentReference[oaicite:68]{index=68}",
//     density: 2.067,           // g/cm³ (rhombic sulfur)
//     meltingPoint: 388.36,     // K
//     boilingPoint: 717.8,      // K
//     atomicRadius: 180,        // pm (van der Waals)
//     electronegativity: 2.58,
//     discoveryYear: null,
//     discoveredBy: null,       // known since antiquity (ancient)
//     namedAfter: "Sanskrit ‘sulvere’ or Latin ‘sulfur’ (brimstone)",
//     electronConfiguration: "[Ne] 3s2 3p4",
//     oxidationStates: "+6, +4, -2",
//     electronShells: [2, 8, 6],
//     color: "yellow",
//     appearance: "bright yellow crystalline solid",
//     commonUses: ["sulfuric acid production", "vulcanization of rubber"],  // major use in H2SO4 (industry); rubber cross-linking
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 350,      // ppm
//     abundanceUniverse: 500,   // ppm
//     cpkColor: "#FFFF30",      // CPK color (yellow)
//     iconColor: "#FFFF30",
//     modelColor: "#FFFF30",
//     modelRadius: 100
//   }, // Sulfur&#8203;:contentReference[oaicite:69]{index=69}

//   {
//     symbol: "Cl",
//     name: "Chlorine",
//     number: 17,
//     group: "Halogen",
//     period: 3,
//     column: 17,
//     electrons: "2, 8, 7",
//     mass: 35.45,
//     description: "Chlorine is a dense, greenish-yellow diatomic gas with a pungent odor. It is a highly reactive halogen.&#8203;:contentReference[oaicite:70]{index=70}",
//     density: 0.003214,         // g/cm³ at STP
//     meltingPoint: 171.6,       // K
//     boilingPoint: 239.11,      // K
//     atomicRadius: 175,         // pm (van der Waals)
//     electronegativity: 3.16,
//     discoveryYear: 1774,
//     discoveredBy: "Carl Wilhelm Scheele",  // discovered chlorine gas (1774)
//     namedAfter: "Greek ‘chloros’ (greenish-yellow)",
//     electronConfiguration: "[Ne] 3s2 3p5",
//     oxidationStates: "+7, +5, +3, +1, -1",
//     electronShells: [2, 8, 7],
//     color: "yellow-green",
//     appearance: "yellowish-green gas",
//     commonUses: ["water disinfection (chlorination)", "PVC plastic production"],  // chlorine gas for drinking water; polyvinyl chloride plastic
//     phase: "gas",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 130,       // ppm
//     abundanceUniverse: 40,     // ppm
//     cpkColor: "#1FF01F",       // CPK color (green)
//     iconColor: "#1FF01F",
//     modelColor: "#1FF01F",
//     modelRadius: 100
//   }, // Chlorine&#8203;:contentReference[oaicite:71]{index=71}

//   {
//     symbol: "Ar",
//     name: "Argon",
//     number: 18,
//     group: "Noble gas",
//     period: 3,
//     column: 18,
//     electrons: "2, 8, 8",
//     mass: 39.948,
//     description: "Argon is a colorless, odorless inert gas. It is the third most abundant gas in Earth’s atmosphere (~0.93%).",
//     density: 0.0017837,       // g/cm³ at STP
//     meltingPoint: 83.80,      // K
//     boilingPoint: 87.30,      // K
//     atomicRadius: 188,        // pm (van der Waals)
//     electronegativity: null,
//     discoveryYear: 1894,
//     discoveredBy: "Lord Rayleigh & Sir William Ramsay",  // discovered argon in air (1894)&#8203;:contentReference[oaicite:72]{index=72}
//     namedAfter: "Greek ‘argos’ (inactive)",
//     electronConfiguration: "[Ne] 3s2 3p6",
//     oxidationStates: "0",
//     electronShells: [2, 8, 8],
//     color: "colorless",
//     appearance: "colorless gas (emits violet glow in electric field)",
//     commonUses: ["shielding gas for welding", "fill gas in incandescent bulbs"],  // inert atmosphere for welding; light bulbs filled with argon
//     phase: "gas",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 1.2,      // ppm
//     abundanceUniverse: 30,    // ppm
//     cpkColor: "#80D1E3",      // CPK color (cyan)
//     iconColor: "#80D1E3",
//     modelColor: "#80D1E3",
//     modelRadius: 71
//   }, // Argon&#8203;:contentReference[oaicite:73]{index=73}

//   {
//     symbol: "K",
//     name: "Potassium",
//     number: 19,
//     group: "Alkali metal",
//     period: 4,
//     column: 1,
//     electrons: "2, 8, 8, 1",
//     mass: 39.098,
//     description: "Potassium is a very soft, silvery-white metal that reacts violently with water, producing a lilac flame.&#8203;:contentReference[oaicite:74]{index=74}",
//     density: 0.862,           // g/cm³
//     meltingPoint: 336.53,     // K
//     boilingPoint: 1032,       // K
//     atomicRadius: 275,        // pm (metallic)
//     electronegativity: 0.82,
//     discoveryYear: 1807,
//     discoveredBy: "Sir Humphry Davy",  // isolated by electrolysis of potash (1807)
//     namedAfter: "English ‘potash’ (potassium carbonate)",  // Latin name kalium from Arabic “al-qaliy”
//     electronConfiguration: "[Ar] 4s1",
//     oxidationStates: "+1",
//     electronShells: [2, 8, 8, 1],
//     color: "silvery-white",
//     appearance: "soft silvery metal (fresh surface)",
//     commonUses: ["fertilizers (potash)", "soap production"],  // potassium salts in fertilizer; KOH in soap making
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 20900,    // ppm (2.09%)
//     abundanceUniverse: 60,    // ppm
//     cpkColor: "#8F40D4",      // CPK color (violet)
//     iconColor: "#8F40D4",
//     modelColor: "#8F40D4",
//     modelRadius: 220
//   }, // Potassium&#8203;:contentReference[oaicite:75]{index=75}

//   {
//     symbol: "Ca",
//     name: "Calcium",
//     number: 20,
//     group: "Alkaline earth metal",
//     period: 4,
//     column: 2,
//     electrons: "2, 8, 8, 2",
//     mass: 40.078,
//     description: "Calcium is a dull gray, reactive metal that is an essential element for living organisms (bones, shells).&#8203;:contentReference[oaicite:76]{index=76}",
//     density: 1.54,            // g/cm³
//     meltingPoint: 1115,       // K
//     boilingPoint: 1757,       // K
//     atomicRadius: 231,        // pm (metallic)
//     electronegativity: 1.00,
//     discoveryYear: 1808,
//     discoveredBy: "Sir Humphry Davy",  // isolated by electrolysis of lime (1808)&#8203;:contentReference[oaicite:77]{index=77}
//     namedAfter: "Latin ‘calx’ (lime)",
//     electronConfiguration: "[Ar] 4s2",
//     oxidationStates: "+2",
//     electronShells: [2, 8, 8, 2],
//     color: "silvery-white",
//     appearance: "dull gray metal (oxidizes quickly)",
//     commonUses: ["cement and concrete (CaO, CaCO₃)", "reducing agent in metal production"],  // limestone in cement; Ca used to reduce U, Th from fluorides
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 41500,    // ppm (4.15%)
//     abundanceUniverse: 70,    // ppm
//     cpkColor: "#3DFF00",      // CPK color (green)
//     iconColor: "#3DFF00",
//     modelColor: "#3DFF00",
//     modelRadius: 180
//   }, // Calcium&#8203;:contentReference[oaicite:78]{index=78}

//   {
//     symbol: "Sc",
//     name: "Scandium",
//     number: 21,
//     group: "Transition metal",
//     period: 4,
//     column: 3,
//     electrons: "2, 8, 9, 2",
//     mass: 44.956,
//     description: "Scandium is a silvery-white, relatively soft transition metal. It is often classified as a rare earth element.&#8203;:contentReference[oaicite:79]{index=79}",
//     density: 2.99,            // g/cm³
//     meltingPoint: 1814,       // K
//     boilingPoint: 3109,       // K
//     atomicRadius: 211,        // pm (metallic)
//     electronegativity: 1.36,
//     discoveryYear: 1879,
//     discoveredBy: "Lars Fredrik Nilson",  // discovered in Scandinavian minerals (1879)
//     namedAfter: "Latin ‘Scandia’ (Scandinavia)",
//     electronConfiguration: "[Ar] 3d1 4s2",
//     oxidationStates: "+3",
//     electronShells: [2, 8, 9, 2],
//     color: "silvery-white",
//     appearance: "silvery metal",
//     commonUses: ["aluminum-scandium alloys (lighting, aerospace)", "metal-halide lamps"],  // Sc in high-intensity lamps; Al-Sc sports equipment
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 22,       // ppm
//     abundanceUniverse: 5,     // ppm
//     cpkColor: "#E6E6E6",      // CPK color (light gray)
//     iconColor: "#E6E6E6",
//     modelColor: "#E6E6E6",
//     modelRadius: 160
//   }, // Scandium&#8203;:contentReference[oaicite:80]{index=80}

//   {
//     symbol: "Ti",
//     name: "Titanium",
//     number: 22,
//     group: "Transition metal",
//     period: 4,
//     column: 4,
//     electrons: "2, 8, 10, 2",
//     mass: 47.867,
//     description: "Titanium is a strong, lustrous transition metal with a silver color. It is known for its high strength-to-weight ratio and corrosion resistance.&#8203;:contentReference[oaicite:81]{index=81}",
//     density: 4.54,            // g/cm³
//     meltingPoint: 1941,       // K
//     boilingPoint: 3560,       // K
//     atomicRadius: 200,        // pm (metallic)
//     electronegativity: 1.54,
//     discoveryYear: 1791,
//     discoveredBy: "William Gregor",  // discovered in mineral ilmenite (1791)
//     namedAfter: "Titans (Greek mythology)",
//     electronConfiguration: "[Ar] 3d2 4s2",
//     oxidationStates: "+4, +3, +2",
//     electronShells: [2, 8, 10, 2],
//     color: "silvery-gray",
//     appearance: "lustrous silvery metal",
//     commonUses: ["aerospace components", "medical implants"],  // Ti alloys for aircraft; bio-compatible implants
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 5650,     // ppm (0.565%)
//     abundanceUniverse: 40,    // ppm
//     cpkColor: "#BFC2C7",      // CPK color (gray)
//     iconColor: "#BFC2C7",
//     modelColor: "#BFC2C7",
//     modelRadius: 140
//   }, // Titanium&#8203;:contentReference[oaicite:82]{index=82}

//   {
//     symbol: "V",
//     name: "Vanadium",
//     number: 23,
//     group: "Transition metal",
//     period: 4,
//     column: 5,
//     electrons: "2, 8, 11, 2",
//     mass: 50.942,
//     description: "Vanadium is a hard, gray transition metal. It is ductile, corrosion-resistant, and commonly used to strengthen steel alloys.&#8203;:contentReference[oaicite:83]{index=83}",
//     density: 6.11,            // g/cm³
//     meltingPoint: 2183,       // K
//     boilingPoint: 3680,       // K
//     atomicRadius: 192,        // pm (metallic)
//     electronegativity: 1.63,
//     discoveryYear: 1801,
//     discoveredBy: "Andrés Manuel del Río",  // discovered in Mexico (1801), re-discovered by Nils Sefström 1830
//     namedAfter: "Vanadis (Norse goddess Freyja)",
//     electronConfiguration: "[Ar] 3d3 4s2",
//     oxidationStates: "+5, +4, +3, +2, +0",
//     electronShells: [2, 8, 11, 2],
//     color: "steel gray",
//     appearance: "bluish-gray metal",
//     commonUses: ["alloy steel (vanadium steel)", "catalysts (sulfuric acid production)"],  // vanadium in tool steels; V2O5 catalyst in contact process
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 120,      // ppm
//     abundanceUniverse: 1,     // ppm
//     cpkColor: "#A6A6AB",      // CPK color (gray)
//     iconColor: "#A6A6AB",
//     modelColor: "#A6A6AB",
//     modelRadius: 135
//   }, // Vanadium&#8203;:contentReference[oaicite:84]{index=84}

//   {
//     symbol: "Cr",
//     name: "Chromium",
//     number: 24,
//     group: "Transition metal",
//     period: 4,
//     column: 6,
//     electrons: "2, 8, 13, 1",
//     mass: 51.996,
//     description: "Chromium is a hard, shiny steel-gray metal known for its high polish (chrome plating) and resistance to tarnish.&#8203;:contentReference[oaicite:85]{index=85}",
//     density: 7.19,            // g/cm³
//     meltingPoint: 2180,       // K
//     boilingPoint: 2944,       // K
//     atomicRadius: 189,        // pm (metallic)
//     electronegativity: 1.66,
//     discoveryYear: 1797,
//     discoveredBy: "Louis Nicolas Vauquelin",  // discovered in crocoite ore (1797)
//     namedAfter: "Greek ‘chroma’ (color)",  // for the colorful compounds of chromium
//     electronConfiguration: "[Ar] 3d5 4s1",
//     oxidationStates: "+6, +3, +2",
//     electronShells: [2, 8, 13, 1],
//     color: "silvery metallic",
//     appearance: "lustrous steel-gray metal",
//     commonUses: ["stainless steel (chrome)", "chrome plating"],  // Cr in stainless alloys; decorative plating
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 102,      // ppm
//     abundanceUniverse: 0.3,   // ppm
//     cpkColor: "#8A99C7",      // CPK color (steel blue)
//     iconColor: "#8A99C7",
//     modelColor: "#8A99C7",
//     modelRadius: 140
//   }, // Chromium&#8203;:contentReference[oaicite:86]{index=86}

//   {
//     symbol: "Mn",
//     name: "Manganese",
//     number: 25,
//     group: "Transition metal",
//     period: 4,
//     column: 7,
//     electrons: "2, 8, 13, 2",
//     mass: 54.938,
//     description: "Manganese is a hard, brittle gray-white metal. It is an important alloying element in steel and has multiple oxidation states in compounds.&#8203;:contentReference[oaicite:87]{index=87}",
//     density: 7.21,            // g/cm³
//     meltingPoint: 1519,       // K
//     boilingPoint: 2334,       // K
//     atomicRadius: 197,        // pm (metallic)
//     electronegativity: 1.55,
//     discoveryYear: 1774,
//     discoveredBy: "Johan Gottlieb Gahn",  // isolated manganese metal (1774)
//     namedAfter: "Magnesia (region) via ‘magnes’ (lodestone); confusion with magnesium minerals",
//     electronConfiguration: "[Ar] 3d5 4s2",
//     oxidationStates: "+7, +4, +3, +2 (and others)",
//     electronShells: [2, 8, 13, 2],
//     color: "gray-white",
//     appearance: "grayish white metal",
//     commonUses: ["steel alloys (strengthening)", "alkaline batteries (MnO₂)"],  // ferromanganese in steel; MnO2 in dry cell batteries
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 950,      // ppm
//     abundanceUniverse: 1,     // ppm
//     cpkColor: "#9C7AC7",      // CPK color (lavender)
//     iconColor: "#9C7AC7",
//     modelColor: "#9C7AC7",
//     modelRadius: 140
//   }, // Manganese&#8203;:contentReference[oaicite:88]{index=88}

//   {
//     symbol: "Fe",
//     name: "Iron",
//     number: 26,
//     group: "Transition metal",
//     period: 4,
//     column: 8,
//     electrons: "2, 8, 14, 2",
//     mass: 55.845,
//     description: "Iron is a lustrous, grayish metal that is by far the most used metal, primarily in the form of steel. It is magnetic and rusts in moist air.&#8203;:contentReference[oaicite:89]{index=89}",
//     density: 7.874,          // g/cm³
//     meltingPoint: 1811,      // K
//     boilingPoint: 3134,      // K
//     atomicRadius: 194,       // pm (metallic)
//     electronegativity: 1.83,
//     discoveryYear: null,
//     discoveredBy: null,      // known since ancient times
//     namedAfter: "Anglo-Saxon ‘iren’, Latin ‘ferrum’",
//     electronConfiguration: "[Ar] 3d6 4s2",
//     oxidationStates: "+3, +2, +6, +4 (and others)",
//     electronShells: [2, 8, 14, 2],
//     color: "lustrous gray",
//     appearance: "shiny gray metal (freshly polished)",
//     commonUses: ["steel (construction, tools)", "hemoglobin (biological)"],  // structural steel; iron in blood (not a use but essential nutrient)
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 56300,    // ppm (~5.63%)
//     abundanceUniverse: 1100,  // ppm (one of the most abundant metals in universe)
//     cpkColor: "#E06633",      // CPK color (dark orange)
//     iconColor: "#E06633",
//     modelColor: "#E06633",
//     modelRadius: 140
//   }, // Iron&#8203;:contentReference[oaicite:90]{index=90}

//   {
//     symbol: "Co",
//     name: "Cobalt",
//     number: 27,
//     group: "Transition metal",
//     period: 4,
//     column: 9,
//     electrons: "2, 8, 15, 2",
//     mass: 58.933,
//     description: "Cobalt is a hard, lustrous, grayish metal. It is ferromagnetic and known for its blue-colored compounds used in glass and pigments.&#8203;:contentReference[oaicite:91]{index=91}",
//     density: 8.90,           // g/cm³
//     meltingPoint: 1768,      // K
//     boilingPoint: 3200,      // K
//     atomicRadius: 192,       // pm (metallic)
//     electronegativity: 1.88,
//     discoveryYear: 1735,
//     discoveredBy: "Georg Brandt",  // isolated a blue ‘kobold’ metal (1735)
//     namedAfter: "German ‘Kobold’ (goblin) – from miners’ nickname for the ore",
//     electronConfiguration: "[Ar] 3d7 4s2",
//     oxidationStates: "+2, +3",
//     electronShells: [2, 8, 15, 2],
//     color: "silvery-gray",
//     appearance: "hard lustrous gray metal",
//     commonUses: ["superalloys (jet turbines)", "permanent magnets (Alnico)"],  // high-temp alloys with Co; Co–Al–Ni magnets
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 25,      // ppm
//     abundanceUniverse: 3,    // ppm
//     cpkColor: "#F090A0",     // CPK color (pink)
//     iconColor: "#F090A0",
//     modelColor: "#F090A0",
//     modelRadius: 135
//   }, // Cobalt&#8203;:contentReference[oaicite:92]{index=92}

//   {
//     symbol: "Ni",
//     name: "Nickel",
//     number: 28,
//     group: "Transition metal",
//     period: 4,
//     column: 10,
//     electrons: "2, 8, 16, 2",
//     mass: 58.693,
//     description: "Nickel is a silvery-white metal with a slight golden tinge. It is malleable, ductile, and resists corrosion. Nickel is ferromagnetic and often used in alloys.&#8203;:contentReference[oaicite:93]{index=93}",
//     density: 8.90,           // g/cm³
//     meltingPoint: 1728,      // K
//     boilingPoint: 3186,      // K
//     atomicRadius: 184,       // pm (metallic)
//     electronegativity: 1.91,
//     discoveryYear: 1751,
//     discoveredBy: "Axel Fredrik Cronstedt",  // isolated nickel (1751)
//     namedAfter: "German ‘Kupfernickel’ (Devil’s copper ore)",
//     electronConfiguration: "[Ar] 3d8 4s2",
//     oxidationStates: "+2, +3",
//     electronShells: [2, 8, 16, 2],
//     color: "silvery-white",
//     appearance: "silvery metal with slight golden hue",
//     commonUses: ["stainless steel and alloys", "coins (nickel currency)"],  // Ni in stainless steel; coinage (e.g. US nickels)&#8203;:contentReference[oaicite:94]{index=94}
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 84,      // ppm
//     abundanceUniverse: 30,   // ppm
//     cpkColor: "#50D050",     // CPK color (green)
//     iconColor: "#50D050",
//     modelColor: "#50D050",
//     modelRadius: 135
//   }, // Nickel&#8203;:contentReference[oaicite:95]{index=95}

//   {
//     symbol: "Cu",
//     name: "Copper",
//     number: 29,
//     group: "Transition metal",
//     period: 4,
//     column: 11,
//     electrons: "2, 8, 18, 1",
//     mass: 63.546,
//     description: "Copper is a reddish-orange metal, highly ductile and conductive. It was one of the first metals used by humans and is essential in electrical wiring.&#8203;:contentReference[oaicite:96]{index=96}",
//     density: 8.96,           // g/cm³
//     meltingPoint: 1357.77,    // K
//     boilingPoint: 2835,      // K
//     atomicRadius: 128,       // pm (covalent; metallic radius ~128 pm)
//     electronegativity: 1.90,
//     discoveryYear: null,
//     discoveredBy: null,      // known to ancient civilizations&#8203;:contentReference[oaicite:97]{index=97}
//     namedAfter: "Latin ‘cuprum’ (from Cyprus)",
//     electronConfiguration: "[Ar] 3d10 4s1",
//     oxidationStates: "+2, +1",
//     electronShells: [2, 8, 18, 1],
//     color: "reddish-orange",
//     appearance: "shiny red-orange metal",
//     commonUses: ["electrical wiring", "coins and jewelry"],  // excellent conductor for wires; coinage metal&#8203;:contentReference[oaicite:98]{index=98}
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 60,      // ppm
//     abundanceUniverse: 0.6,  // ppm
//     cpkColor: "#C88033",     // CPK color (brown-orange)
//     iconColor: "#C88033",
//     modelColor: "#C88033",
//     modelRadius: 135
//   }, // Copper&#8203;:contentReference[oaicite:99]{index=99}&#8203;:contentReference[oaicite:100]{index=100}

//   {
//     symbol: "Zn",
//     name: "Zinc",
//     number: 30,
//     group: "Transition metal",
//     period: 4,
//     column: 12,
//     electrons: "2, 8, 18, 2",
//     mass: 65.38,
//     description: "Zinc is a bluish-silver metal that tarnishes in air. It is brittle at room temperature but malleable when heated, and is widely used for galvanizing steel.&#8203;:contentReference[oaicite:101]{index=101}",
//     density: 7.14,           // g/cm³
//     meltingPoint: 692.68,    // K
//     boilingPoint: 1180,      // K
//     atomicRadius: 134,       // pm (covalent ~131 pm; metallic ~134 pm)
//     electronegativity: 1.65,
//     discoveryYear: 1746,
//     discoveredBy: "Andreas Marggraf",  // credited for isolating zinc (1746)
//     namedAfter: "German ‘Zink’ (pointed, for its crystal form)",
//     electronConfiguration: "[Ar] 3d10 4s2",
//     oxidationStates: "+2",
//     electronShells: [2, 8, 18, 2],
//     color: "bluish-silver",
//     appearance: "bluish-silvery metal",
//     commonUses: ["galvanized steel (anti-corrosion coating)", "brass (copper-zinc alloy)"],  // Zn coating to prevent rust; brass alloy uses Zn&#8203;:contentReference[oaicite:102]{index=102}
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 70,      // ppm
//     abundanceUniverse: 0.4,  // ppm
//     cpkColor: "#7D80B0",     // CPK color (slate gray)
//     iconColor: "#7D80B0",
//     modelColor: "#7D80B0",
//     modelRadius: 135
//   }, // Zinc&#8203;:contentReference[oaicite:103]{index=103}

//   {
//     symbol: "Ga",
//     name: "Gallium",
//     number: 31,
//     group: "Post-transition metal",
//     period: 4,
//     column: 13,
//     electrons: "2, 8, 18, 3",
//     mass: 69.723,
//     description: "Gallium is a soft, silvery metal (understandard conditions) that melts at about 29.8 °C (just above room temperature).&#8203;:contentReference[oaicite:104]{index=104}",
//     density: 5.91,           // g/cm³ (at 25°C)
//     meltingPoint: 302.91,    // K (29.76 °C)
//     boilingPoint: 2477,      // K
//     atomicRadius: 187,       // pm (metallic)
//     electronegativity: 1.81,
//     discoveryYear: 1875,
//     discoveredBy: "Paul-Émile Lecoq de Boisbaudran",  // discovered via spectroscopy (1875)
//     namedAfter: "Latin ‘Gallia’ (France)",
//     electronConfiguration: "[Ar] 3d10 4s2 4p1",
//     oxidationStates: "+3, +1",
//     electronShells: [2, 8, 18, 3],
//     color: "silvery",
//     appearance: "soft silvery metal (liquid near room temp)",
//     commonUses: ["semiconductor doping (GaAs)", "thermometers (as liquid alloy)"],  // GaAs chips; Ga-In-Sn eutectic as mercury replacement
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 19,      // ppm
//     abundanceUniverse: 0.2,  // ppm
//     cpkColor: "#C28F8F",     // CPK color (light brown)
//     iconColor: "#C28F8F",
//     modelColor: "#C28F8F",
//     modelRadius: 130
//   }, // Gallium&#8203;:contentReference[oaicite:105]{index=105}

//   {
//     symbol: "Ge",
//     name: "Germanium",
//     number: 32,
//     group: "Metalloid",
//     period: 4,
//     column: 14,
//     electrons: "2, 8, 18, 4",
//     mass: 72.630,
//     description: "Germanium is a shiny, hard, gray-white metalloid that is brittle and has a diamond-like crystal structure. It’s an important semiconductor material.&#8203;:contentReference[oaicite:106]{index=106}",
//     density: 5.32,           // g/cm³
//     meltingPoint: 1211.40,   // K
//     boilingPoint: 3106,      // K
//     atomicRadius: 211,       // pm (covalent ~122 pm; van der Waals ~211 pm)
//     electronegativity: 2.01,
//     discoveryYear: 1886,
//     discoveredBy: "Clemens Winkler",  // discovered in argyrodite (1886)
//     namedAfter: "Latin ‘Germania’ (Germany)",
//     electronConfiguration: "[Ar] 3d10 4s2 4p2",
//     oxidationStates: "+4, +2",
//     electronShells: [2, 8, 18, 4],
//     color: "gray-white",
//     appearance: "lustrous gray-white metalloid",
//     commonUses: ["fiber optic cables", "infrared optics"],  // Ge in glass for fiber optics; Ge lenses in IR cameras
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metalloid",
//     abundanceCrust: 1.5,     // ppm
//     abundanceUniverse: 0.1,  // ppm
//     cpkColor: "#668F8F",     // CPK color (gray-green)
//     iconColor: "#668F8F",
//     modelColor: "#668F8F",
//     modelRadius: 125
//   }, // Germanium&#8203;:contentReference[oaicite:107]{index=107}

//   {
//     symbol: "As",
//     name: "Arsenic",
//     number: 33,
//     group: "Metalloid",
//     period: 4,
//     column: 15,
//     electrons: "2, 8, 18, 5",
//     mass: 74.922,
//     description: "Arsenic is a brittle, steel-gray semimetal (metalloid). It is infamous as a poison and is used in specialized alloys and semiconductors.&#8203;:contentReference[oaicite:108]{index=108}",
//     density: 5.72,           // g/cm³ (gray arsenic)
//     meltingPoint: 1090,      // K (sublimes at ~887 K, so 1090 K under pressure)
//     boilingPoint: 887,       // K (sublimes at 887 K at 1 atm)
//     atomicRadius: 185,       // pm (van der Waals)
//     electronegativity: 2.18,
//     discoveryYear: Ancient,  // known to ancients (isolated in medieval times ~1250 by Albertus Magnus)
//     discoveredBy: null,
//     namedAfter: "Greek ‘arsenikon’ (yellow orpiment pigment)",
//     electronConfiguration: "[Ar] 3d10 4s2 4p3",
//     oxidationStates: "+5, +3, -3",
//     electronShells: [2, 8, 18, 5],
//     color: "gray metallic",
//     appearance: "shiny gray brittle solid",
//     commonUses: ["lead alloys (strengthener)", "semiconductor doping (GaAs)"],  // small amounts in lead batteries; GaAs chips
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metalloid",
//     abundanceCrust: 1.8,     // ppm
//     abundanceUniverse: 0.03, // ppm
//     cpkColor: "#BD80E3",     // CPK color (purple)
//     iconColor: "#BD80E3",
//     modelColor: "#BD80E3",
//     modelRadius: 115
//   }, // Arsenic&#8203;:contentReference[oaicite:109]{index=109}

//   {
//     symbol: "Se",
//     name: "Selenium",
//     number: 34,
//     group: "Nonmetal",
//     period: 4,
//     column: 16,
//     electrons: "2, 8, 18, 6",
//     mass: 78.971,
//     description: "Selenium is a brittle, lustrous nonmetal that can appear red (amorphous) or gray (crystalline). It is chemically similar to sulfur.&#8203;:contentReference[oaicite:110]{index=110}",
//     density: 4.81,           // g/cm³ (gray Se)
//     meltingPoint: 494,       // K
//     boilingPoint: 958,       // K
//     atomicRadius: 190,       // pm (van der Waals)
//     electronegativity: 2.55,
//     discoveryYear: 1817,
//     discoveredBy: "Jöns Jakob Berzelius",  // discovered Selenium (1817)&#8203;:contentReference[oaicite:111]{index=111}
//     namedAfter: "Greek ‘selene’ (Moon)",
//     electronConfiguration: "[Ar] 3d10 4s2 4p4",
//     oxidationStates: "+6, +4, -2",
//     electronShells: [2, 8, 18, 6],
//     color: "gray or red",
//     appearance: "gray metallic-looking solid or red powder (allotropes)",
//     commonUses: ["glass additives (decolorizer)", "photocopier drums"],  // Se to remove color tints in glass; selenium photoconductors in xerography
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 0.05,    // ppm
//     abundanceUniverse: 0.3,  // ppm
//     cpkColor: "#FFA100",     // CPK color (orange)
//     iconColor: "#FFA100",
//     modelColor: "#FFA100",
//     modelRadius: 115
//   }, // Selenium&#8203;:contentReference[oaicite:112]{index=112}

//   {
//     symbol: "Br",
//     name: "Bromine",
//     number: 35,
//     group: "Halogen",
//     period: 4,
//     column: 17,
//     electrons: "2, 8, 18, 7",
//     mass: 79.904,
//     description: "Bromine is a red-brown liquid at room temperature (the only liquid nonmetal), evaporating to a similarly colored vapor with a pungent odor.&#8203;:contentReference[oaicite:113]{index=113}",
//     density: 3.12,           // g/cm³ (liquid at 20°C)
//     meltingPoint: 265.8,     // K
//     boilingPoint: 331.9,     // K
//     atomicRadius: 185,       // pm (van der Waals)
//     electronegativity: 2.96,
//     discoveryYear: 1826,
//     discoveredBy: "Antoine Jérôme Balard",  // discovered bromine (1826)&#8203;:contentReference[oaicite:114]{index=114}
//     namedAfter: "Greek ‘bromos’ (stench)",
//     electronConfiguration: "[Ar] 3d10 4s2 4p5",
//     oxidationStates: "+5, +1, -1",
//     electronShells: [2, 8, 18, 7],
//     color: "red-brown",
//     appearance: "reddish-brown liquid (fuming)",
//     commonUses: ["flame retardants (brominated compounds)", "water purification (bromine tablets)"],  // brominated flame retardants; pool/spa disinfection
//     phase: "liquid",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 2.5,     // ppm
//     abundanceUniverse: 0.3,  // ppm
//     cpkColor: "#A62929",     // CPK color (dark red)
//     iconColor: "#A62929",
//     modelColor: "#A62929",
//     modelRadius: 115
//   }, // Bromine&#8203;:contentReference[oaicite:115]{index=115}&#8203;:contentReference[oaicite:116]{index=116}

//   {
//     symbol: "Kr",
//     name: "Krypton",
//     number: 36,
//     group: "Noble gas",
//     period: 4,
//     column: 18,
//     electrons: "2, 8, 18, 8",
//     mass: 83.798,
//     description: "Krypton is a colorless, inert noble gas. When excited electrically, it emits a whitish glow and has spectral lines that were once used to define the meter.&#8203;:contentReference[oaicite:117]{index=117}",
//     density: 0.003733,       // g/cm³ at STP
//     meltingPoint: 115.79,    // K
//     boilingPoint: 119.93,    // K
//     atomicRadius: 202,       // pm (van der Waals)
//     electronegativity: 3.00, // (Pauling for Kr is approximate)
//     discoveryYear: 1898,
//     discoveredBy: "Sir William Ramsay & Morris Travers",  // co-discovered with neon and xenon (1898)
//     namedAfter: "Greek ‘kryptos’ (hidden)",
//     electronConfiguration: "[Ar] 3d10 4s2 4p6",
//     oxidationStates: "0, +2",
//     electronShells: [2, 8, 18, 8],
//     color: "colorless",
//     appearance: "colorless gas (whitish glow in electric field)",
//     commonUses: ["lighting (flash lamps, fluorescent bulbs)", "double-pane window insulation"],  // photographic flash lamps; insulating gas in windows
//     phase: "gas",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 0.0001,  // ppm (extremely low)
//     abundanceUniverse: 4,    // ppm
//     cpkColor: "#5CB8D1",     // CPK color (sky blue)
//     iconColor: "#5CB8D1",
//     modelColor: "#5CB8D1",
//     modelRadius: 88
//   }, // Krypton&#8203;:contentReference[oaicite:118]{index=118}

//   {
//     symbol: "Rb",
//     name: "Rubidium",
//     number: 37,
//     group: "Alkali metal",
//     period: 5,
//     column: 1,
//     electrons: "2, 8, 18, 8, 1",
//     mass: 85.468,
//     description: "Rubidium is a very soft, silvery-white alkali metal. It is highly reactive (ignites spontaneously in air) and imparts a crimson color to flames.&#8203;:contentReference[oaicite:119]{index=119}",
//     density: 1.532,          // g/cm³
//     meltingPoint: 312.46,    // K
//     boilingPoint: 961,       // K
//     atomicRadius: 303,       // pm (metallic)
//     electronegativity: 0.82,
//     discoveryYear: 1861,
//     discoveredBy: "Robert Bunsen & Gustav Kirchhoff",  // discovered via spectroscopy (1861)
//     namedAfter: "Latin ‘rubidus’ (deep red)",  // for the red spectral lines
//     electronConfiguration: "[Kr] 5s1",
//     oxidationStates: "+1",
//     electronShells: [2, 8, 18, 8, 1],
//     color: "silvery-white",
//     appearance: "very soft silvery metal",
//     commonUses: ["research and specialty glasses", "atomic clocks (vapor cells)"],  // few commercial uses; sometimes in photo-cells or specialty glass
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 90,      // ppm
//     abundanceUniverse: 1,    // ppm
//     cpkColor: "#702EB0",     // CPK color (dark purple)
//     iconColor: "#702EB0",
//     modelColor: "#702EB0",
//     modelRadius: 235
//   }, // Rubidium&#8203;:contentReference[oaicite:120]{index=120}

//   {
//     symbol: "Sr",
//     name: "Strontium",
//     number: 38,
//     group: "Alkaline earth metal",
//     period: 5,
//     column: 2,
//     electrons: "2, 8, 18, 8, 2",
//     mass: 87.62,
//     description: "Strontium is a soft, silvery metal that turns yellowish when oxidized. Strontium salts impart a bright red color to flames (e.g., in fireworks).&#8203;:contentReference[oaicite:121]{index=121}",
//     density: 2.64,           // g/cm³
//     meltingPoint: 1050,      // K
//     boilingPoint: 1655,      // K
//     atomicRadius: 249,       // pm (metallic)
//     electronegativity: 0.95,
//     discoveryYear: 1790,
//     discoveredBy: "Adair Crawford",  // identified new mineral (strontianite, 1790); metal isolated by Davy 1808
//     namedAfter: "Strontian (village in Scotland)",
//     electronConfiguration: "[Kr] 5s2",
//     oxidationStates: "+2",
//     electronShells: [2, 8, 18, 8, 2],
//     color: "silvery-white",
//     appearance: "soft silver-white metal (quickly oxidizes yellowish)",
//     commonUses: ["fireworks (red color from Sr salts)", "old CRT TV tubes (phosphor)"],  // strontium nitrate for red fireworks; SrO in cathode ray tubes
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 370,     // ppm
//     abundanceUniverse: 1,    // ppm
//     cpkColor: "#00FF00",     // CPK color (green)
//     iconColor: "#00FF00",
//     modelColor: "#00FF00",
//     modelRadius: 200
//   }, // Strontium&#8203;:contentReference[oaicite:122]{index=122}

//   {
//     symbol: "Y",
//     name: "Yttrium",
//     number: 39,
//     group: "Transition metal",
//     period: 5,
//     column: 3,
//     electrons: "2, 8, 18, 9, 2",
//     mass: 88.906,
//     description: "Yttrium is a silvery transition metal often classified as a rare-earth element. It is relatively stable in air and is used in phosphors and lasers.&#8203;:contentReference[oaicite:123]{index=123}",
//     density: 4.47,           // g/cm³
//     meltingPoint: 1799,      // K
//     boilingPoint: 3609,      // K
//     atomicRadius: 212,       // pm (metallic)
//     electronegativity: 1.22,
//     discoveryYear: 1794,
//     discoveredBy: "Johan Gadolin",  // discovered yttria (oxide) in gadolinite (1794)
//     namedAfter: "Ytterby (Sweden, site of discovery)",
//     electronConfiguration: "[Kr] 4d1 5s2",
//     oxidationStates: "+3",
//     electronShells: [2, 8, 18, 9, 2],
//     color: "silvery-white",
//     appearance: "silvery metallic solid",
//     commonUses: ["red phosphors (CRT displays)", "YAG lasers (Y-Al garnet)"],  // Y2O3:Eu phosphor for red color in old TVs; Nd:YAG lasers have Yttrium
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 33,      // ppm
//     abundanceUniverse: 0.1,  // ppm
//     cpkColor: "#94FFFF",     // CPK color (pale aqua)
//     iconColor: "#94FFFF",
//     modelColor: "#94FFFF",
//     modelRadius: 180
//   }, // Yttrium&#8203;:contentReference[oaicite:124]{index=124}

//   {
//     symbol: "Zr",
//     name: "Zirconium",
//     number: 40,
//     group: "Transition metal",
//     period: 5,
//     column: 4,
//     electrons: "2, 8, 18, 10, 2",
//     mass: 91.224,
//     description: "Zirconium is a strong, shiny gray-white transition metal. It is corrosion-resistant and commonly used in nuclear reactors due to its low neutron-capture cross-section.&#8203;:contentReference[oaicite:125]{index=125}",
//     density: 6.52,           // g/cm³
//     meltingPoint: 2128,      // K
//     boilingPoint: 4682,      // K
//     atomicRadius: 206,       // pm (metallic)
//     electronegativity: 1.33,
//     discoveryYear: 1789,
//     discoveredBy: "Martin Heinrich Klaproth",  // identified zirconium oxide (1789)
//     namedAfter: "Persian ‘zargun’ (gold-colored), from zircon gem",
//     electronConfiguration: "[Kr] 4d2 5s2",
//     oxidationStates: "+4",
//     electronShells: [2, 8, 18, 10, 2],
//     color: "silvery-gray",
//     appearance: "lustrous gray-white metal",
//     commonUses: ["nuclear reactor cladding", "ceramics (zirconia)"],  // zirconium alloys in fuel rods; ZrO2 in ceramic crowns and abrasives
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 165,     // ppm
//     abundanceUniverse: 0.3,  // ppm
//     cpkColor: "#94E0E0",     // CPK color (pale teal)
//     iconColor: "#94E0E0",
//     modelColor: "#94E0E0",
//     modelRadius: 155
//   }, // Zirconium&#8203;:contentReference[oaicite:126]{index=126}

//   {
//     symbol: "Nb",
//     name: "Niobium",
//     number: 41,
//     group: "Transition metal",
//     period: 5,
//     column: 5,
//     electrons: "2, 8, 18, 12, 1",
//     mass: 92.906,
//     description: "Niobium is a shiny, gray, ductile metal. It has a high melting point and is used in superconducting alloys and specialty steels (where it’s also known as columbium).&#8203;:contentReference[oaicite:127]{index=127}",
//     density: 8.57,           // g/cm³
//     meltingPoint: 2750,      // K
//     boilingPoint: 5017,      // K
//     atomicRadius: 198,       // pm (metallic)
//     electronegativity: 1.6,
//     discoveryYear: 1801,
//     discoveredBy: "Charles Hatchett",  // discovered “columbium” in ore (1801)
//     namedAfter: "Niobe (Greek myth), daughter of Tantalus (element 73)",
//     electronConfiguration: "[Kr] 4d4 5s1",
//     oxidationStates: "+5, +3",
//     electronShells: [2, 8, 18, 12, 1],
//     color: "gray",
//     appearance: "shiny gray metal",
//     commonUses: ["superalloys (jet engines)", "superconducting magnets (Nb-Ti)"],  // Niobium in high-temperature alloys; Nb-Ti wires for MRI magnets
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 20,      // ppm
//     abundanceUniverse: 0.07, // ppm
//     cpkColor: "#73C2C9",     // CPK color (light blue)
//     iconColor: "#73C2C9",
//     modelColor: "#73C2C9",
//     modelRadius: 145
//   }, // Niobium&#8203;:contentReference[oaicite:128]{index=128}

//   {
//     symbol: "Mo",
//     name: "Molybdenum",
//     number: 42,
//     group: "Transition metal",
//     period: 5,
//     column: 6,
//     electrons: "2, 8, 18, 13, 1",
//     mass: 95.95,
//     description: "Molybdenum is a hard, silvery-gray metal with one of the highest melting points. It is used to strengthen steel and as a catalyst in certain chemical reactions.&#8203;:contentReference[oaicite:129]{index=129}",
//     density: 10.28,          // g/cm³
//     meltingPoint: 2896,      // K
//     boilingPoint: 4912,      // K
//     atomicRadius: 190,       // pm (metallic)
//     electronegativity: 2.16,
//     discoveryYear: 1781,
//     discoveredBy: "Carl Wilhelm Scheele",  // recognized molybdenite as new element (1778); Hjelm isolated metal 1781
//     namedAfter: "Greek ‘molybdos’ (lead)",  // from molybdenite (thought to be lead ore)
//     electronConfiguration: "[Kr] 4d5 5s1",
//     oxidationStates: "+6, +4, +2, 0",
//     electronShells: [2, 8, 18, 13, 1],
//     color: "silvery-gray",
//     appearance: "silvery metal",
//     commonUses: ["steel alloys (Mo-steel)", "catalysts (petroleum refining)"],  // Mo in high-strength steel; MoS2 catalyst in hydrotreating
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 1.5,     // ppm
//     abundanceUniverse: 0.008, // ppm
//     cpkColor: "#54B5B5",     // CPK color (teal)
//     iconColor: "#54B5B5",
//     modelColor: "#54B5B5",
//     modelRadius: 145
//   }, // Molybdenum&#8203;:contentReference[oaicite:130]{index=130}

//   {
//     symbol: "Tc",
//     name: "Technetium",
//     number: 43,
//     group: "Transition metal",
//     period: 5,
//     column: 7,
//     electrons: "2, 8, 18, 13, 2",
//     mass: 98,
//     description: "Technetium is a silvery-gray radioactive metal—the lightest element with no stable isotopes. It is artificially produced (first synthetically created element).&#8203;:contentReference[oaicite:131]{index=131}",
//     density: 11.5,           // g/cm³ (estimated)
//     meltingPoint: 2430,      // K (estimated)
//     boilingPoint: 4538,      // K (estimated)
//     atomicRadius: 183,       // pm (metallic, estimated)
//     electronegativity: 1.9,
//     discoveryYear: 1937,
//     discoveredBy: "Carlo Perrier & Emilio Segrè",  // discovered in cyclotron by Segrè and Perrier (1937)
//     namedAfter: "Greek ‘technetos’ (artificial)",  // first artificially made element
//     electronConfiguration: "[Kr] 4d5 5s2",
//     oxidationStates: "+7, +5, +4, +3, +2, +1, 0, -1",
//     electronShells: [2, 8, 18, 13, 2],
//     color: "shiny gray",
//     appearance: "silvery metal (typically available as a powder)",
//     commonUses: ["medical diagnostic imaging (Tc-99m radioisotope)"],  // Tc-99m is widely used in nuclear medicine scans
//     phase: "solid",
//     radioactive: true,
//     natural: false,         // trace amounts occur in nature from fission, but essentially synthetic
//     metal: "metal",
//     abundanceCrust: ~0,      // (trace, ~10^-10 ppm from spontaneous fission)
//     abundanceUniverse: 0,    // (cosmically rare)
//     cpkColor: "#3B9E9E",     // CPK color (teal-green)
//     iconColor: "#3B9E9E",
//     modelColor: "#3B9E9E",
//     modelRadius: 135
//   }, // Technetium&#8203;:contentReference[oaicite:132]{index=132}

//   {
//     symbol: "Ru",
//     name: "Ruthenium",
//     number: 44,
//     group: "Transition metal",
//     period: 5,
//     column: 8,
//     electrons: "2, 8, 18, 15, 1",
//     mass: 101.07,
//     description: "Ruthenium is a hard, silvery-white transition metal in the platinum group. It is inert to most chemicals and is used in electrical contacts and catalysts.&#8203;:contentReference[oaicite:133]{index=133}",
//     density: 12.1,           // g/cm³
//     meltingPoint: 2607,      // K
//     boilingPoint: 4423,      // K
//     atomicRadius: 178,       // pm (metallic)
//     electronegativity: 2.2,
//     discoveryYear: 1844,
//     discoveredBy: "Karl Ernst Claus",  // confirmed discovery in 1844 (Sniadecki earlier 1807 report unclear)
//     namedAfter: "Latin ‘Ruthenia’ (Russia)",
//     electronConfiguration: "[Kr] 4d7 5s1",
//     oxidationStates: "+8, +6, +4, +3, +2, +0",
//     electronShells: [2, 8, 18, 15, 1],
//     color: "silvery-white",
//     appearance: "bright metallic solid",
//     commonUses: ["electrical contacts (wear-resistant alloys)", "chemical catalysts"],  // Ru added to platinum for electrodes; e.g. RuO2 in chlorine production
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.001,   // ppm
//     abundanceUniverse: 0.001,// ppm
//     cpkColor: "#248F8F",     // CPK color (dark teal)
//     iconColor: "#248F8F",
//     modelColor: "#248F8F",
//     modelRadius: 130
//   }, // Ruthenium&#8203;:contentReference[oaicite:134]{index=134}

//   {
//     symbol: "Rh",
//     name: "Rhodium",
//     number: 45,
//     group: "Transition metal",
//     period: 5,
//     column: 9,
//     electrons: "2, 8, 18, 16, 1",
//     mass: 102.91,
//     description: "Rhodium is a rare, silvery-white hard metal, one of the platinum group. It is highly reflective and is used in jewelry plating and automotive catalytic converters.&#8203;:contentReference[oaicite:135]{index=135}",
//     density: 12.4,           // g/cm³
//     meltingPoint: 2237,      // K
//     boilingPoint: 3968,      // K
//     atomicRadius: 173,       // pm (metallic)
//     electronegativity: 2.28,
//     discoveryYear: 1803,
//     discoveredBy: "William Hyde Wollaston",  // discovered rhodium in platinum ore (1803)
//     namedAfter: "Greek ‘rhodon’ (rose-colored)",  // rose color of rhodium salts
//     electronConfiguration: "[Kr] 4d8 5s1",
//     oxidationStates: "+3, +4, +2, +1, 0",
//     electronShells: [2, 8, 18, 16, 1],
//     color: "silvery-white",
//     appearance: "brilliant silvery metal",
//     commonUses: ["catalytic converters", "reflective jewelry plating"],  // Rh in three-way catalysts; rhodium plating for white gold jewelry
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.0001,  // ppm
//     abundanceUniverse: 0.0001,// ppm
//     cpkColor: "#0A7D8C",     // CPK color (dark teal-blue)
//     iconColor: "#0A7D8C",
//     modelColor: "#0A7D8C",
//     modelRadius: 135
//   }, // Rhodium&#8203;:contentReference[oaicite:136]{index=136}

//   {
//     symbol: "Pd",
//     name: "Palladium",
//     number: 46,
//     group: "Transition metal",
//     period: 5,
//     column: 10,
//     electrons: "2, 8, 18, 18",
//     mass: 106.42,
//     description: "Palladium is a silvery-white metal in the platinum group. It is soft and ductile when annealed and is a key component of automotive catalytic converters.&#8203;:contentReference[oaicite:137]{index=137}",
//     density: 12.0,           // g/cm³
//     meltingPoint: 1825,      // K
//     boilingPoint: 3236,      // K
//     atomicRadius: 169,       // pm (metallic)
//     electronegativity: 2.20,
//     discoveryYear: 1803,
//     discoveredBy: "William Hyde Wollaston",  // discovered palladium (1803)
//     namedAfter: "Pallas (asteroid), named for Greek goddess Athena (Pallas Athena)",
//     electronConfiguration: "[Kr] 4d10",  // (5s0 4d10)
//     oxidationStates: "+2, +4, 0",
//     electronShells: [2, 8, 18, 18],
//     color: "silvery-white",
//     appearance: "shiny white metal",
//     commonUses: ["catalytic converters", "electronics (plating contacts)"],  // auto catalysts; Pd plating in electronics
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.015,   // ppm
//     abundanceUniverse: 0.0007,// ppm
//     cpkColor: "#69858D",     // CPK color (steel blue-gray)
//     iconColor: "#69858D",
//     modelColor: "#69858D",
//     modelRadius: 140
//   }, // Palladium&#8203;:contentReference[oaicite:138]{index=138}

//   {
//     symbol: "Ag",
//     name: "Silver",
//     number: 47,
//     group: "Transition metal",
//     period: 5,
//     column: 11,
//     electrons: "2, 8, 18, 18, 1",
//     mass: 107.87,
//     description: "Silver is a shiny, white, very ductile metal known for the highest electrical and thermal conductivity of any element. It has been prized for coinage and jewelry for millennia.&#8203;:contentReference[oaicite:139]{index=139}",
//     density: 10.49,          // g/cm³
//     meltingPoint: 1234.93,   // K
//     boilingPoint: 2435,      // K
//     atomicRadius: 172,       // pm (metallic)
//     electronegativity: 1.93,
//     discoveryYear: null,
//     discoveredBy: null,      // known since ancient times (prehistoric)
//     namedAfter: "Anglo-Saxon ‘seolfor’; symbol from Latin ‘argentum’",
//     electronConfiguration: "[Kr] 4d10 5s1",
//     oxidationStates: "+1, +2",
//     electronShells: [2, 8, 18, 18, 1],
//     color: "silvery-white",
//     appearance: "brilliant white metal",
//     commonUses: ["jewelry and silverware", "electrical conductors"],  // ornamental uses; electrical contacts and conductors&#8203;:contentReference[oaicite:140]{index=140}
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.075,   // ppm
//     abundanceUniverse: 0.1,  // ppm
//     cpkColor: "#C0C0C0",     // CPK color (silver)
//     iconColor: "#C0C0C0",
//     modelColor: "#C0C0C0",
//     modelRadius: 160
//   }, // Silver&#8203;:contentReference[oaicite:141]{index=141}&#8203;:contentReference[oaicite:142]{index=142}

//   {
//     symbol: "Cd",
//     name: "Cadmium",
//     number: 48,
//     group: "Transition metal",
//     period: 5,
//     column: 12,
//     electrons: "2, 8, 18, 18, 2",
//     mass: 112.414,
//     description: "Cadmium is a soft, bluish-white metal chemically similar to zinc. It is toxic and primarily obtained as a byproduct of zinc refining.&#8203;:contentReference[oaicite:143]{index=143}",
//     density: 8.65,           // g/cm³
//     meltingPoint: 594.22,    // K
//     boilingPoint: 1040,      // K
//     atomicRadius: 158,       // pm (metallic)
//     electronegativity: 1.69,
//     discoveryYear: 1817,
//     discoveredBy: "Friedrich Stromeyer",  // discovered cadmium impurity in zinc carbonate (1817)
//     namedAfter: "Latin ‘cadmia’ (calamine, zinc ore)",
//     electronConfiguration: "[Kr] 4d10 5s2",
//     oxidationStates: "+2",
//     electronShells: [2, 8, 18, 18, 2],
//     color: "bluish-white",
//     appearance: "soft bluish-white metal",
//     commonUses: ["Nickel-cadmium (NiCd) batteries", "pigments (cadmium yellow)"],  // rechargeable batteries; CdS pigment
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.1,     // ppm
//     abundanceUniverse: 0.02, // ppm
//     cpkColor: "#FFD98F",     // CPK color (flesh)
//     iconColor: "#FFD98F",
//     modelColor: "#FFD98F",
//     modelRadius: 155
//   }, // Cadmium&#8203;:contentReference[oaicite:144]{index=144}

//   {
//     symbol: "In",
//     name: "Indium",
//     number: 49,
//     group: "Post-transition metal",
//     period: 5,
//     column: 13,
//     electrons: "2, 8, 18, 18, 3",
//     mass: 114.818,
//     description: "Indium is a very soft, silvery-white post-transition metal with a low melting point. It produces a high-pitched ‘cry’ when bent.&#8203;:contentReference[oaicite:145]{index=145}",
//     density: 7.31,           // g/cm³
//     meltingPoint: 429.75,    // K
//     boilingPoint: 2345,      // K
//     atomicRadius: 193,       // pm (metallic)
//     electronegativity: 1.78,
//     discoveryYear: 1863,
//     discoveredBy: "Ferdinand Reich & Hieronymous Richter",  // discovered by spectroscopy (1863)
//     namedAfter: "Indigo (indigo-blue spectral line)",
//     electronConfiguration: "[Kr] 4d10 5s2 5p1",
//     oxidationStates: "+3, +1",
//     electronShells: [2, 8, 18, 18, 3],
//     color: "silvery-white",
//     appearance: "very soft silvery metal",
//     commonUses: ["indium tin oxide (ITO) for touchscreens", "low-melting alloys"],  // ITO conductive coatings in displays; fusible alloys like Wood's metal
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.25,    // ppm
//     abundanceUniverse: 0.001,// ppm
//     cpkColor: "#A67573",     // CPK color (brownish)
//     iconColor: "#A67573",
//     modelColor: "#A67573",
//     modelRadius: 155
//   }, // Indium&#8203;:contentReference[oaicite:146]{index=146}

//   {
//     symbol: "Sn",
//     name: "Tin",
//     number: 50,
//     group: "Post-transition metal",
//     period: 5,
//     column: 14,
//     electrons: "2, 8, 18, 18, 4",
//     mass: 118.710,
//     description: "Tin is a soft, silvery-white metal that has been used since antiquity (e.g., bronze is an alloy of copper and tin). It has two main allotropes: silvery beta-tin (metallic) and gray alpha-tin (semiconductor) at low temperature.&#8203;:contentReference[oaicite:147]{index=147}",
//     density: 7.29,           // g/cm³ (white tin)
//     meltingPoint: 505.08,    // K
//     boilingPoint: 2875,      // K
//     atomicRadius: 217,       // pm (metallic)
//     electronegativity: 1.96,
//     discoveryYear: Ancient,
//     discoveredBy: null,      // known to ancients
//     namedAfter: "Anglo-Saxon ‘tin’; symbol from Latin ‘stannum’",
//     electronConfiguration: "[Kr] 4d10 5s2 5p2",
//     oxidationStates: "+4, +2",
//     electronShells: [2, 8, 18, 18, 4],
//     color: "silvery-white",
//     appearance: "lustrous white metal (beta form)",
//     commonUses: ["solder (tin-lead alloys)", "tin plating (corrosion protection)"],  // solder for electronics; tin coating on steel cans
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 2.3,     // ppm
//     abundanceUniverse: 0.009,// ppm
//     cpkColor: "#668080",     // CPK color (gray-blue)
//     iconColor: "#668080",
//     modelColor: "#668080",
//     modelRadius: 145
//   }, // Tin&#8203;:contentReference[oaicite:148]{index=148}

//   {
//     symbol: "Sb",
//     name: "Antimony",
//     number: 51,
//     group: "Metalloid",
//     period: 5,
//     column: 15,
//     electrons: "2, 8, 18, 18, 5",
//     mass: 121.760,
//     description: "Antimony is a lustrous gray metalloid. It is brittle and used in alloys (like pewter and battery lead) to improve hardness, and in flame-proofing compounds.&#8203;:contentReference[oaicite:149]{index=149}",
//     density: 6.68,           // g/cm³
//     meltingPoint: 903.78,    // K
//     boilingPoint: 1860,      // K
//     atomicRadius: 206,       // pm (van der Waals)
//     electronegativity: 2.05,
//     discoveryYear: Ancient,
//     discoveredBy: null,      // known since ancient times (used by alchemists)
//     namedAfter: "French ‘antimoine’ (origin uncertain), symbol from Latin ‘stibium’",
//     electronConfiguration: "[Kr] 4d10 5s2 5p3",
//     oxidationStates: "+5, +3, -3",
//     electronShells: [2, 8, 18, 18, 5],
//     color: "silvery-gray",
//     appearance: "bright silvery metalloid",
//     commonUses: ["flame retardants", "lead-acid batteries (hardening plates)"],  // Sb2O3 in flame-proofing plastics; antimonial lead in batteries&#8203;:contentReference[oaicite:150]{index=150}
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metalloid",
//     abundanceCrust: 0.2,     // ppm
//     abundanceUniverse: 0.0002,// ppm
//     cpkColor: "#9E63B5",     // CPK color (purple)
//     iconColor: "#9E63B5",
//     modelColor: "#9E63B5",
//     modelRadius: 145
//   }, // Antimony&#8203;:contentReference[oaicite:151]{index=151}

//   {
//     symbol: "Te",
//     name: "Tellurium",
//     number: 52,
//     group: "Metalloid",
//     period: 5,
//     column: 16,
//     electrons: "2, 8, 18, 18, 6",
//     mass: 127.60,
//     description: "Tellurium is a brittle, silvery-white metalloid (or considered a post-transition metal) with a crystalline appearance. It is a semiconductor and is used in alloys and electronics.&#8203;:contentReference[oaicite:152]{index=152}",
//     density: 6.24,           // g/cm³
//     meltingPoint: 722.66,    // K
//     boilingPoint: 1261,      // K
//     atomicRadius: 206,       // pm (van der Waals)
//     electronegativity: 2.1,
//     discoveryYear: 1782,
//     discoveredBy: "Franz-Joseph Müller von Reichenstein",  // discovered in Transylvania gold ore (1782)
//     namedAfter: "Latin ‘tellus’ (earth)",
//     electronConfiguration: "[Kr] 4d10 5s2 5p4",
//     oxidationStates: "+6, +4, -2",
//     electronShells: [2, 8, 18, 18, 6],
//     color: "silvery-white",
//     appearance: "shiny silvery-white brittle solid",
//     commonUses: ["thermoelectric devices (Bi₂Te₃)", "vulcanization of rubber"],  // bismuth telluride in Peltier coolers; accelerant in rubber processing
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metalloid",
//     abundanceCrust: 0.001,   // ppm
//     abundanceUniverse: 0.01, // ppm
//     cpkColor: "#D47A00",     // CPK color (orange-brown)
//     iconColor: "#D47A00",
//     modelColor: "#D47A00",
//     modelRadius: 140
//   }, // Tellurium&#8203;:contentReference[oaicite:153]{index=153}

//   {
//     symbol: "I",
//     name: "Iodine",
//     number: 53,
//     group: "Halogen",
//     period: 5,
//     column: 17,
//     electrons: "2, 8, 18, 18, 7",
//     mass: 126.904,
//     description: "Iodine is a lustrous, dark gray-purple solid at room temperature that sublimes to a violet vapor. It is the least reactive of the common halogens and essential in trace amounts for life (thyroid).&#8203;:contentReference[oaicite:154]{index=154}",
//     density: 4.93,           // g/cm³ (solid)
//     meltingPoint: 386.85,    // K
//     boilingPoint: 457.40,    // K
//     atomicRadius: 198,       // pm (van der Waals)
//     electronegativity: 2.66,
//     discoveryYear: 1811,
//     discoveredBy: "Bernard Courtois",  // discovered iodine from seaweed ash (1811)&#8203;:contentReference[oaicite:155]{index=155}
//     namedAfter: "Greek ‘iodes’ (violet-colored)",
//     electronConfiguration: "[Kr] 4d10 5s2 5p5",
//     oxidationStates: "+7, +5, +1, -1",
//     electronShells: [2, 8, 18, 18, 7],
//     color: "lustrous purple-black",
//     appearance: "shiny dark violet-gray solid",
//     commonUses: ["antiseptics (tincture of iodine)", "iodized salt (nutrient)"],  // disinfectant solution; added to table salt to prevent deficiency
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 0.45,    // ppm
//     abundanceUniverse: 0.009,// ppm
//     cpkColor: "#940094",     // CPK color (dark violet)
//     iconColor: "#940094",
//     modelColor: "#940094",
//     modelRadius: 133
//   }, // Iodine&#8203;:contentReference[oaicite:156]{index=156}&#8203;:contentReference[oaicite:157]{index=157}

//   {
//     symbol: "Xe",
//     name: "Xenon",
//     number: 54,
//     group: "Noble gas",
//     period: 5,
//     column: 18,
//     electrons: "2, 8, 18, 18, 8",
//     mass: 131.293,
//     description: "Xenon is a heavy, colorless noble gas. It is inert but can form a few compounds under special conditions. When excited electrically, xenon gas emits a blue glow.&#8203;:contentReference[oaicite:158]{index=158}",
//     density: 0.005887,       // g/cm³ at STP
//     meltingPoint: 161.36,    // K
//     boilingPoint: 165.03,    // K
//     atomicRadius: 216,       // pm (van der Waals)
//     electronegativity: 2.60, // (Pauling for Xe, estimated)
//     discoveryYear: 1898,
//     discoveredBy: "Sir William Ramsay & Morris Travers",  // discovered with krypton (1898)
//     namedAfter: "Greek ‘xenos’ (strange)",
//     electronConfiguration: "[Kr] 4d10 5s2 5p6",
//     oxidationStates: "0, +2, +4, +6, +8",
//     electronShells: [2, 8, 18, 18, 8],
//     color: "colorless",
//     appearance: "colorless gas (emits blue light in discharge)",
//     commonUses: ["high-intensity lamps (flash, strobe)", "general anesthesia (xenon gas)"],  // xenon flash lamps; anesthetic gas use (rare, expensive)
//     phase: "gas",
//     radioactive: false,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: 0.00003, // ppm
//     abundanceUniverse: 0.5,  // ppm
//     cpkColor: "#429EB0",     // CPK color (blue-gray)
//     iconColor: "#429EB0",
//     modelColor: "#429EB0",
//     modelRadius: 108
//   }, // Xenon&#8203;:contentReference[oaicite:159]{index=159}

//   {
//     symbol: "Cs",
//     name: "Cesium",
//     number: 55,
//     group: "Alkali metal",
//     period: 6,
//     column: 1,
//     electrons: "2, 8, 18, 18, 8, 1",
//     mass: 132.905,
//     description: "Cesium is a very soft, gold-colored alkali metal. It is extremely reactive (ignites explosively in water) and has one of the lowest melting points (28.5 °C, it liquefies in a warm room).&#8203;:contentReference[oaicite:160]{index=160}",
//     density: 1.87,           // g/cm³
//     meltingPoint: 301.59,    // K
//     boilingPoint: 944,       // K
//     atomicRadius: 343,       // pm (metallic)
//     electronegativity: 0.79,
//     discoveryYear: 1860,
//     discoveredBy: "Robert Bunsen & Gustav Kirchhoff",  // discovered via spectroscopy (1860)
//     namedAfter: "Latin ‘caesius’ (sky-blue)",  // for blue spectral lines
//     electronConfiguration: "[Xe] 6s1",
//     oxidationStates: "+1",
//     electronShells: [2, 8, 18, 18, 8, 1],
//     color: "pale gold",
//     appearance: "soft pale-gold metal",
//     commonUses: ["atomic clocks", "photoelectric cells"],  // Cs-133 standard for atomic time; Cs in photoemissive surfaces
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 3,       // ppm
//     abundanceUniverse: 0.02, // ppm
//     cpkColor: "#57178F",     // CPK color (deep purple)
//     iconColor: "#57178F",
//     modelColor: "#57178F",
//     modelRadius: 260
//   }, // Cesium&#8203;:contentReference[oaicite:161]{index=161}

//   {
//     symbol: "Ba",
//     name: "Barium",
//     number: 56,
//     group: "Alkaline earth metal",
//     period: 6,
//     column: 2,
//     electrons: "2, 8, 18, 18, 8, 2",
//     mass: 137.327,
//     description: "Barium is a soft, silvery alkaline earth metal. It oxidizes readily in air and reacts strongly with water. Barium compounds impart a green color to flames.&#8203;:contentReference[oaicite:162]{index=162}",
//     density: 3.59,           // g/cm³
//     meltingPoint: 1000,      // K
//     boilingPoint: 2170,      // K
//     atomicRadius: 268,       // pm (metallic)
//     electronegativity: 0.89,
//     discoveryYear: 1808,
//     discoveredBy: "Sir Humphry Davy",  // isolated barium metal (1808)
//     namedAfter: "Greek ‘barys’ (heavy)",
//     electronConfiguration: "[Xe] 6s2",
//     oxidationStates: "+2",
//     electronShells: [2, 8, 18, 18, 8, 2],
//     color: "silvery-white",
//     appearance: "silvery-white metal (quickly oxidizes)",
//     commonUses: ["drilling mud (barite, BaSO₄)", "fireworks (green color)"],  // barite for oil well drilling; barium nitrate for green fireworks
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 425,     // ppm
//     abundanceUniverse: 0.09, // ppm
//     cpkColor: "#00C900",     // CPK color (green)
//     iconColor: "#00C900",
//     modelColor: "#00C900",
//     modelRadius: 215
//   }, // Barium&#8203;:contentReference[oaicite:163]{index=163}

//   {
//     symbol: "La",
//     name: "Lanthanum",
//     number: 57,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 18, 9, 2",
//     mass: 138.905,
//     description: "Lanthanum is a soft, ductile, silvery-white rare-earth metal. It is the first element of the lanthanide series and oxidizes rapidly in air.&#8203;:contentReference[oaicite:164]{index=164}",
//     density: 6.15,           // g/cm³
//     meltingPoint: 1193,      // K
//     boilingPoint: 3737,      // K
//     atomicRadius: 240,       // pm (metallic)
//     electronegativity: 1.10,
//     discoveryYear: 1839,
//     discoveredBy: "Carl Gustaf Mosander",  // discovered lanthanum (1839)
//     namedAfter: "Greek ‘lanthanein’ (to lie hidden)",
//     electronConfiguration: "[Xe] 5d1 6s2",
//     oxidationStates: "+3",
//     electronShells: [2, 8, 18, 18, 9, 2],
//     color: "silvery-white",
//     appearance: "silvery-white metal",
//     commonUses: ["camera lenses (lanthanum glass)", "hybrid car batteries (nickel-metal hydride)"],  // La-added glass has high refractive index; LaNi5 in NiMH batteries
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 39,      // ppm
//     abundanceUniverse: 0.05, // ppm
//     cpkColor: "#70D4FF",     // CPK color (sky blue)
//     iconColor: "#70D4FF",
//     modelColor: "#70D4FF",
//     modelRadius: 195
//   }, // Lanthanum&#8203;:contentReference[oaicite:165]{index=165}

//   {
//     symbol: "Ce",
//     name: "Cerium",
//     number: 58,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 19, 9, 2",
//     mass: 140.116,
//     description: "Cerium is a silvery-gray metal and the most abundant of the rare-earth elements. It is somewhat reactive, tarnishing in air, and can ignite if scratched. Cerium can switch between +3 and +4 oxidation states easily.&#8203;:contentReference[oaicite:166]{index=166}",
//     density: 6.77,           // g/cm³
//     meltingPoint: 1068,      // K
//     boilingPoint: 3716,      // K
//     atomicRadius: 235,       // pm (metallic)
//     electronegativity: 1.12,
//     discoveryYear: 1803,
//     discoveredBy: "Jöns Jakob Berzelius & Wilhelm Hisinger (independently by Martin Klaproth)",  // co-discovered in 1803&#8203;:contentReference[oaicite:167]{index=167}
//     namedAfter: "Ceres (dwarf planet named after Roman goddess)",
//     electronConfiguration: "[Xe] 4f1 5d1 6s2",
//     oxidationStates: "+4, +3",
//     electronShells: [2, 8, 18, 19, 9, 2],
//     color: "silvery-gray",
//     appearance: "lustrous gray metal",
//     commonUses: ["catalytic converters (cerium oxide)", "flints for lighters (mischmetal)"],  // CeO2 helps in auto catalysts; mischmetal (Ce-rich alloy) sparks in flints
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 66.5,    // ppm (most abundant lanthanide)
//     abundanceUniverse: 0.02, // ppm
//     cpkColor: "#FFFFC7",     // CPK color (light yellow)
//     iconColor: "#FFFFC7",
//     modelColor: "#FFFFC7",
//     modelRadius: 185
//   }, // Cerium&#8203;:contentReference[oaicite:168]{index=168}

//   {
//     symbol: "Pr",
//     name: "Praseodymium",
//     number: 59,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 21, 8, 2",
//     mass: 140.908,
//     description: "Praseodymium is a soft, silvery rare-earth metal. It slowly oxidizes in air, forming a green oxide. It is used in specialty alloys and in making high-strength permanent magnets (with neodymium).&#8203;:contentReference[oaicite:169]{index=169}",
//     density: 6.77,           // g/cm³
//     meltingPoint: 1208,      // K
//     boilingPoint: 3793,      // K
//     atomicRadius: 239,       // pm (metallic)
//     electronegativity: 1.13,
//     discoveryYear: 1885,
//     discoveredBy: "Carl Auer von Welsbach",  // separated Pr from didymium (1885)
//     namedAfter: "Greek ‘prasios didymos’ (green twin)",
//     electronConfiguration: "[Xe] 4f3 6s2",
//     oxidationStates: "+3, +4",
//     electronShells: [2, 8, 18, 21, 8, 2],
//     color: "silvery-white",
//     appearance: "soft silvery metal (forms green oxide)",
//     commonUses: ["neodymium magnets (Pr-Nd alloy)", "studio lighting (carbon arc lamps)"],  // Pr in NdFeB magnets; praseodymium compounds for glass in lighting
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 9.2,     // ppm
//     abundanceUniverse: 0.0005,// ppm
//     cpkColor: "#D9FFC7",     // CPK color (pale green)
//     iconColor: "#D9FFC7",
//     modelColor: "#D9FFC7",
//     modelRadius: 185
//   }, // Praseodymium&#8203;:contentReference[oaicite:170]{index=170}

//   {
//     symbol: "Nd",
//     name: "Neodymium",
//     number: 60,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 22, 8, 2",
//     mass: 144.242,
//     description: "Neodymium is a soft, bright silvery metal that tarnishes in air. It is best known for its compounds in powerful Nd-Fe-B permanent magnets, which are widely used in electronics and motors.&#8203;:contentReference[oaicite:171]{index=171}",
//     density: 7.01,           // g/cm³
//     meltingPoint: 1297,      // K
//     boilingPoint: 3347,      // K
//     atomicRadius: 229,       // pm (metallic)
//     electronegativity: 1.14,
//     discoveryYear: 1885,
//     discoveredBy: "Carl Auer von Welsbach",  // separated Nd from didymium (1885)
//     namedAfter: "Greek ‘neos didymos’ (new twin)",
//     electronConfiguration: "[Xe] 4f4 6s2",
//     oxidationStates: "+3",
//     electronShells: [2, 8, 18, 22, 8, 2],
//     color: "silvery-white",
//     appearance: "silvery metal (tarnishes yellowish)",
//     commonUses: ["NdFeB magnets (motors, headphones)", "laser crystals (Nd:YAG)"],  // widely used high-strength magnets; Nd:YAG lasers for industrial and medical use
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 41.5,    // ppm
//     abundanceUniverse: 0.0005,// ppm
//     cpkColor: "#C7FFC7",     // CPK color (pale green)
//     iconColor: "#C7FFC7",
//     modelColor: "#C7FFC7",
//     modelRadius: 185
//   }, // Neodymium&#8203;:contentReference[oaicite:172]{index=172}

//   {
//     symbol: "Pm",
//     name: "Promethium",
//     number: 61,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 23, 8, 2",
//     mass: 145,
//     description: "Promethium is a highly radioactive rare-earth metal. It does not occur appreciably in nature (only trace amounts in uranium fission products). All its isotopes are radioactive, with Pm-147 being the most common in use.&#8203;:contentReference[oaicite:173]{index=173}",
//     density: 7.26,           // g/cm³ (estimated)
//     meltingPoint: 1315,      // K (estimated)
//     boilingPoint: 3273,      // K (estimated)
//     atomicRadius: 236,       // pm (estimated)
//     electronegativity: 1.13,
//     discoveryYear: 1945,
//     discoveredBy: "Jacob Marinsky, Lawrence Glendenin, & Charles Coryell",  // identified in reactor fission products (1945)
//     namedAfter: "Prometheus (Greek Titan who stole fire)",
//     electronConfiguration: "[Xe] 4f5 6s2",
//     oxidationStates: "+3",
//     electronShells: [2, 8, 18, 23, 8, 2],
//     color: "metallic",
//     appearance: "(predicted) silvery metal (no macroscopic sample)",
//     commonUses: ["beta radiation sources (Pm-147 in gauges, luminous paint)"],  // used in some glow-in-the-dark paint and atomic batteries
//     phase: "solid",
//     radioactive: true,
//     natural: false,         // trace amounts from natural fission, otherwise synthetic
//     metal: "metal",
//     abundanceCrust: ~0,      // (only artificial)
//     abundanceUniverse: ~0,   // (extremely scarce)
//     cpkColor: "#A3FFC7",     // CPK color (pale green)
//     iconColor: "#A3FFC7",
//     modelColor: "#A3FFC7",
//     modelRadius: 185
//   }, // Promethium&#8203;:contentReference[oaicite:174]{index=174}

//   {
//     symbol: "Sm",
//     name: "Samarium",
//     number: 62,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 24, 8, 2",
//     mass: 150.36,
//     description: "Samarium is a moderately hard, silvery rare-earth metal that oxidizes in air. It has applications in magnets (SmCo magnets) and as a neutron absorber in nuclear reactors.&#8203;:contentReference[oaicite:175]{index=175}",
//     density: 7.54,           // g/cm³
//     meltingPoint: 1347,      // K
//     boilingPoint: 2067,      // K
//     atomicRadius: 238,       // pm (metallic)
//     electronegativity: 1.17,
//     discoveryYear: 1879,
//     discoveredBy: "Paul Émile Lecoq de Boisbaudran",  // discovered samarium (1879)
//     namedAfter: "Samarskite (mineral), which was named for V. Samarsky",
//     electronConfiguration: "[Xe] 4f6 6s2",
//     oxidationStates: "+3, +2",
//     electronShells: [2, 8, 18, 24, 8, 2],
//     color: "silvery-white",
//     appearance: "silvery metal",
//     commonUses: ["Samarium–cobalt magnets", "nuclear reactor control rods"],  // SmCo high-temperature permanent magnets; Sm absorbs neutrons (Sm-149)
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 7.05,    // ppm
//     abundanceUniverse: 0.0004,// ppm
//     cpkColor: "#8FFFC7",     // CPK color (mint green)
//     iconColor: "#8FFFC7",
//     modelColor: "#8FFFC7",
//     modelRadius: 185
//   }, // Samarium&#8203;:contentReference[oaicite:176]{index=176}

//   {
//     symbol: "Eu",
//     name: "Europium",
//     number: 63,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 25, 8, 2",
//     mass: 151.964,
//     description: "Europium is a soft, silvery metal that is the most reactive of the rare earths. It oxidizes quickly in air and is highly neutron-absorbing. Europium’s phosphorescent compounds produce red phosphor in televisions and LEDs.&#8203;:contentReference[oaicite:177]{index=177}",
//     density: 5.24,           // g/cm³
//     meltingPoint: 1099,      // K
//     boilingPoint: 1802,      // K
//     atomicRadius: 231,       // pm (metallic)
//     electronegativity: 1.2,
//     discoveryYear: 1896,
//     discoveredBy: "Eugène-Anatole Demarçay",  // isolated europium (1896)
//     namedAfter: "Europe (the continent)",
//     electronConfiguration: "[Xe] 4f7 6s2",
//     oxidationStates: "+3, +2",
//     electronShells: [2, 8, 18, 25, 8, 2],
//     color: "silvery-white",
//     appearance: "shiny silvery metal (quickly oxidizes dull)",
//     commonUses: ["red and blue phosphors (TV screens, LEDs)", "neutron absorbers (control rods)"],  // Eu doped phosphor for red in CRTs; Eu absorbs neutrons in reactors
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 2,       // ppm
//     abundanceUniverse: 0.0001,// ppm
//     cpkColor: "#61FFC7",     // CPK color (bright green)
//     iconColor: "#61FFC7",
//     modelColor: "#61FFC7",
//     modelRadius: 185
//   }, // Europium&#8203;:contentReference[oaicite:178]{index=178}

//   {
//     symbol: "Gd",
//     name: "Gadolinium",
//     number: 64,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 25, 9, 2",
//     mass: 157.25,
//     description: "Gadolinium is a silvery-white, ductile rare-earth metal. It is ferromagnetic at low temperatures and is used in MRI contrast agents and neutron capture therapy due to its high neutron absorption cross-section.&#8203;:contentReference[oaicite:179]{index=179}",
//     density: 7.90,           // g/cm³
//     meltingPoint: 1585,      // K
//     boilingPoint: 3546,      // K
//     atomicRadius: 233,       // pm (metallic)
//     electronegativity: 1.20,
//     discoveryYear: 1880,
//     discoveredBy: "Jean Charles Galissard de Marignac",  // discovered spectroscopically (1880)&#8203;:contentReference[oaicite:180]{index=180}
//     namedAfter: "Johan Gadolin (Finnish chemist)",
//     electronConfiguration: "[Xe] 4f7 5d1 6s2",
//     oxidationStates: "+3",
//     electronShells: [2, 8, 18, 25, 9, 2],
//     color: "silvery-white",
//     appearance: "silvery metal",
//     commonUses: ["MRI contrast agents", "nuclear reactor shielding"],  // Gd(III) complexes in MRI; Gd in control rods (high neutron capture)
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 6.2,     // ppm
//     abundanceUniverse: 0.0002,// ppm
//     cpkColor: "#45FFC7",     // CPK color (light green)
//     iconColor: "#45FFC7",
//     modelColor: "#45FFC7",
//     modelRadius: 180
//   }, // Gadolinium&#8203;:contentReference[oaicite:181]{index=181}

//   {
//     symbol: "Tb",
//     name: "Terbium",
//     number: 65,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 27, 8, 2",
//     mass: 158.925,
//     description: "Terbium is a silvery-gray rare-earth metal. It is reasonably stable in air compared to earlier lanthanides, and its compounds are used in green phosphors and solid-state devices.&#8203;:contentReference[oaicite:182]{index=182}",
//     density: 8.23,           // g/cm³
//     meltingPoint: 1629,      // K
//     boilingPoint: 3503,      // K
//     atomicRadius: 225,       // pm (metallic)
//     electronegativity: 1.1,
//     discoveryYear: 1843,
//     discoveredBy: "Carl Gustaf Mosander",  // separated terbium from yttria (1843)
//     namedAfter: "Ytterby (village in Sweden, via 'Terbia' fraction)",
//     electronConfiguration: "[Xe] 4f9 6s2",
//     oxidationStates: "+3, +4",
//     electronShells: [2, 8, 18, 27, 8, 2],
//     color: "silvery-gray",
//     appearance: "silvery metal",
//     commonUses: ["green phosphor in TV tubes (Tb-doped phosphors)", "solid-state fuel cells (as dopant in electrolytes)"],  // Tb phosphor in trichromatic lighting; also in Terfenol-D magnetostrictive alloy
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 1.2,     // ppm
//     abundanceUniverse: 0.00008,// ppm
//     cpkColor: "#30FFC7",     // CPK color (bright green)
//     iconColor: "#30FFC7",
//     modelColor: "#30FFC7",
//     modelRadius: 175
//   }, // Terbium&#8203;:contentReference[oaicite:183]{index=183}

//   {
//     symbol: "Dy",
//     name: "Dysprosium",
//     number: 66,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 28, 8, 2",
//     mass: 162.500,
//     description: "Dysprosium is a bright silvery rare-earth metal. It is relatively stable in air and highly magnetic. Dysprosium is used in high-performance magnets and in reactor control rods due to its ability to absorb neutrons.&#8203;:contentReference[oaicite:184]{index=184}",
//     density: 8.55,           // g/cm³
//     meltingPoint: 1680,      // K
//     boilingPoint: 2840,      // K
//     atomicRadius: 228,       // pm (metallic)
//     electronegativity: 1.22,
//     discoveryYear: 1886,
//     discoveredBy: "Paul Émile Lecoq de Boisbaudran",  // discovered dysprosium (1886)
//     namedAfter: "Greek ‘dysprositos’ (hard to get)",
//     electronConfiguration: "[Xe] 4f10 6s2",
//     oxidationStates: "+3",
//     electronShells: [2, 8, 18, 28, 8, 2],
//     color: "silvery-white",
//     appearance: "silvery metal",
//     commonUses: ["NdFeB magnets (additive for high-temp stability)", "laser materials (dysprosium-doped crystals)"],  // Dy improves NdFeB magnets' performance at high temps; some Dy lasers
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 5.2,     // ppm
//     abundanceUniverse: 0.00006,// ppm
//     cpkColor: "#1FFFC7",     // CPK color (bright green)
//     iconColor: "#1FFFC7",
//     modelColor: "#1FFFC7",
//     modelRadius: 175
//   }, // Dysprosium&#8203;:contentReference[oaicite:185]{index=185}

//   {
//     symbol: "Ho",
//     name: "Holmium",
//     number: 67,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 29, 8, 2",
//     mass: 164.930,
//     description: "Holmium is a relatively soft, malleable rare-earth metal with a bright silvery luster. It is highly magnetic (has the highest magnetic moment of any naturally occurring element) and is used in some laser applications.&#8203;:contentReference[oaicite:186]{index=186}",
//     density: 8.80,           // g/cm³
//     meltingPoint: 1734,      // K
//     boilingPoint: 2993,      // K
//     atomicRadius: 226,       // pm (metallic)
//     electronegativity: 1.23,
//     discoveryYear: 1878,
//     discoveredBy: "Marc Delafontaine & Jacques-Louis Soret (independently by Per Teodor Cleve)",  // Cleve named it (1879) after Delafontaine/Soret found spectroscopically (1878)
//     namedAfter: "Holmia (Latin for Stockholm)",
//     electronConfiguration: "[Xe] 4f11 6s2",
//     oxidationStates: "+3",
//     electronShells: [2, 8, 18, 29, 8, 2],
//     color: "silvery-white",
//     appearance: "lustrous silvery metal",
//     commonUses: ["industrial magnets", "solid-state lasers (Ho:YAG)"],  // added to some magnets; holmium-doped YAG lasers emit 2.1 µm (surgery)
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 1.3,     // ppm
//     abundanceUniverse: 0.00002,// ppm
//     cpkColor: "#00FF9C",     // CPK color (bright teal)
//     iconColor: "#00FF9C",
//     modelColor: "#00FF9C",
//     modelRadius: 175
//   }, // Holmium&#8203;:contentReference[oaicite:187]{index=187}

//   {
//     symbol: "Er",
//     name: "Erbium",
//     number: 68,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 30, 8, 2",
//     mass: 167.259,
//     description: "Erbium is a silvery-white rare-earth metal. It is fairly stable in air compared to earlier lanthanides. Erbium’s pink oxide is used in glass coloring, and Er³⁺ ions are used in fiber optic signal amplifiers (at 1.55 µm).&#8203;:contentReference[oaicite:188]{index=188}",
//     density: 9.07,           // g/cm³
//     meltingPoint: 1802,      // K
//     boilingPoint: 3141,      // K
//     atomicRadius: 226,       // pm (metallic)
//     electronegativity: 1.24,
//     discoveryYear: 1842,
//     discoveredBy: "Carl Gustaf Mosander",  // separated "erbia" from yttria (1842)
//     namedAfter: "Ytterby (Sweden)",
//     electronConfiguration: "[Xe] 4f12 6s2",
//     oxidationStates: "+3",
//     electronShells: [2, 8, 18, 30, 8, 2],
//     color: "silvery-white",
//     appearance: "silvery metal",
//     commonUses: ["fiber optic amplifiers (Er-doped fiber)", "pink glass colorant"],  // Erbium-doped fiber amplifiers in telecom; Er gives glass a pink hue (e.g., sunglasses)
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 3.5,     // ppm
//     abundanceUniverse: 0.00002,// ppm
//     cpkColor: "#00E675",     // CPK color (green)
//     iconColor: "#00E675",
//     modelColor: "#00E675",
//     modelRadius: 175
//   }, // Erbium&#8203;:contentReference[oaicite:189]{index=189}

//   {
//     symbol: "Tm",
//     name: "Thulium",
//     number: 69,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 31, 8, 2",
//     mass: 168.934,
//     description: "Thulium is a silvery-gray, soft metal and the second least abundant lanthanide. It has few specialized uses, but one of its isotopes (Tm-170) is used as a portable X-ray source. It was named for ‘Thule’, a mythical northern land (perhaps Scandinavia).&#8203;:contentReference[oaicite:190]{index=190}",
//     density: 9.32,           // g/cm³
//     meltingPoint: 1818,      // K
//     boilingPoint: 2223,      // K
//     atomicRadius: 222,       // pm (metallic)
//     electronegativity: 1.25,
//     discoveryYear: 1879,
//     discoveredBy: "Per Teodor Cleve",  // discovered thulium (1879)
//     namedAfter: "Thule (ancient name for Scandinavia)",
//     electronConfiguration: "[Xe] 4f13 6s2",
//     oxidationStates: "+3, +2",
//     electronShells: [2, 8, 18, 31, 8, 2],
//     color: "silvery-gray",
//     appearance: "silvery metal",
//     commonUses: ["portable X-ray devices (Tm-170)", "fiber lasers (1700 nm)"],  // radioactive Tm-170 in small X-ray units; Tm-doped fiber lasers at 1.7 µm
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.52,    // ppm (least abundant stable lanthanide)
//     abundanceUniverse: 0.00001,// ppm
//     cpkColor: "#00D452",     // CPK color (green)
//     iconColor: "#00D452",
//     modelColor: "#00D452",
//     modelRadius: 175
//   }, // Thulium&#8203;:contentReference[oaicite:191]{index=191}

//   {
//     symbol: "Yb",
//     name: "Ytterbium",
//     number: 70,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 32, 8, 2",
//     mass: 173.045,
//     description: "Ytterbium is a soft, silvery rare-earth metal. It is fairly reactive (oxidizes easily) and has an unusually low melting point for a lanthanide. Ytterbium has applications in some stainless steels and as a dopant for certain lasers.&#8203;:contentReference[oaicite:192]{index=192}",
//     density: 6.97,           // g/cm³
//     meltingPoint: 1097,      // K
//     boilingPoint: 1469,      // K
//     atomicRadius: 222,       // pm (metallic)
//     electronegativity: 1.1,
//     discoveryYear: 1878,
//     discoveredBy: "Jean Charles Galissard de Marignac",  // discovered “ytterbium” (1878)
//     namedAfter: "Ytterby (village in Sweden)",
//     electronConfiguration: "[Xe] 4f14 6s2",
//     oxidationStates: "+3, +2",
//     electronShells: [2, 8, 18, 32, 8, 2],
//     color: "silvery-white",
//     appearance: "silvery metal (often with slight yellow tint)",
//     commonUses: ["infrared lasers (Yb:YAG)", "stress gauges (Yb in alloys)"],  // Yb-doped YAG lasers (1.03 µm); Yb alloys in dental or stress-sensing materials
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 3.2,     // ppm
//     abundanceUniverse: 0.00002,// ppm
//     cpkColor: "#00BF38",     // CPK color (green)
//     iconColor: "#00BF38",
//     modelColor: "#00BF38",
//     modelRadius: 175
//   }, // Ytterbium&#8203;:contentReference[oaicite:193]{index=193}

//   {
//     symbol: "Lu",
//     name: "Lutetium",
//     number: 71,
//     group: "Lanthanide",
//     period: 6,
//     column: 3,
//     electrons: "2, 8, 18, 32, 9, 2",
//     mass: 174.967,
//     description: "Lutetium is a hard, dense, silvery-white metal—the last element in the lanthanide series. It is one of the least abundant lanthanides and has the highest melting point among them. Lutetium is used as a catalyst in some organic reactions and in PET scan detectors (Lu-based scintillators).&#8203;:contentReference[oaicite:194]{index=194}",
//     density: 9.84,           // g/cm³
//     meltingPoint: 1925,      // K
//     boilingPoint: 3675,      // K
//     atomicRadius: 217,       // pm (metallic)
//     electronegativity: 1.27,
//     discoveryYear: 1907,
//     discoveredBy: "Georges Urbain (independently Carl Auer von Welsbach)",  // co-discovered (1907)
//     namedAfter: "Latin ‘Lutetia’ (Paris)",
//     electronConfiguration: "[Xe] 4f14 5d1 6s2",
//     oxidationStates: "+3",
//     electronShells: [2, 8, 18, 32, 9, 2],
//     color: "silvery-white",
//     appearance: "silvery metal",
//     commonUses: ["PET scan detectors (Lu₂SiO₅ crystals)", "catalysts in petroleum refining"],  // Lu-based scintillator (LSO) in medical imaging; some catalytic uses
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.8,     // ppm (least abundant naturally occurring lanthanide)
//     abundanceUniverse: 0.00001,// ppm
//     cpkColor: "#00AB24",     // CPK color (dark green)
//     iconColor: "#00AB24",
//     modelColor: "#00AB24",
//     modelRadius: 175
//   }, // Lutetium&#8203;:contentReference[oaicite:195]{index=195}

//   {
//     symbol: "Hf",
//     name: "Hafnium",
//     number: 72,
//     group: "Transition metal",
//     period: 6,
//     column: 4,
//     electrons: "2, 8, 18, 32, 10, 2",
//     mass: 178.49,
//     description: "Hafnium is a shiny, silvery-gray transition metal that chemically resembles zirconium. It is highly resistant to corrosion and has a high neutron-capture cross-section, making it useful in control rods for nuclear reactors.&#8203;:contentReference[oaicite:196]{index=196}",
//     density: 13.31,          // g/cm³
//     meltingPoint: 2506,      // K
//     boilingPoint: 4876,      // K
//     atomicRadius: 208,       // pm (metallic)
//     electronegativity: 1.3,
//     discoveryYear: 1923,
//     discoveredBy: "Dirk Coster & George de Hevesy",  // predicted by Bohr; discovered in zircon (1923)
//     namedAfter: "Hafnia (Latin for Copenhagen)",
//     electronConfiguration: "[Xe] 4f14 5d2 6s2",
//     oxidationStates: "+4",
//     electronShells: [2, 8, 18, 32, 10, 2],
//     color: "silvery-gray",
//     appearance: "lustrous silvery metal",
//     commonUses: ["nuclear reactor control rods", "alloys for high-temp applications"],  // Hf absorbs neutrons; used in superalloys and plasma torches
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 3,       // ppm
//     abundanceUniverse: 0.0002,// ppm
//     cpkColor: "#4DC2FF",     // CPK color (light blue)
//     iconColor: "#4DC2FF",
//     modelColor: "#4DC2FF",
//     modelRadius: 155
//   }, // Hafnium&#8203;:contentReference[oaicite:197]{index=197}

//   {
//     symbol: "Ta",
//     name: "Tantalum",
//     number: 73,
//     group: "Transition metal",
//     period: 6,
//     column: 5,
//     electrons: "2, 8, 18, 32, 11, 2",
//     mass: 180.948,
//     description: "Tantalum is a very hard, dense, blue-gray metal with excellent corrosion resistance. It has a very high melting point and is used in electronic capacitors and surgical implants.&#8203;:contentReference[oaicite:198]{index=198}",
//     density: 16.65,          // g/cm³
//     meltingPoint: 3290,      // K
//     boilingPoint: 5731,      // K
//     atomicRadius: 200,       // pm (metallic)
//     electronegativity: 1.5,
//     discoveryYear: 1802,
//     discoveredBy: "Anders Gustaf Ekeberg",  // discovered tantalum (1802)
//     namedAfter: "Tantalus (Greek mythological figure)",
//     electronConfiguration: "[Xe] 4f14 5d3 6s2",
//     oxidationStates: "+5",
//     electronShells: [2, 8, 18, 32, 11, 2],
//     color: "gray-blue",
//     appearance: "heavy hard blue-gray metal",
//     commonUses: ["electrolytic capacitors (Ta capacitors)", "surgical implants"],  // Ta capacitors in electronics; bio-inert metal for implants
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 2,       // ppm
//     abundanceUniverse: 0.0002,// ppm
//     cpkColor: "#4DA6FF",     // CPK color (light blue)
//     iconColor: "#4DA6FF",
//     modelColor: "#4DA6FF",
//     modelRadius: 145
//   }, // Tantalum&#8203;:contentReference[oaicite:199]{index=199}

//   {
//     symbol: "W",
//     name: "Tungsten",
//     number: 74,
//     group: "Transition metal",
//     period: 6,
//     column: 6,
//     electrons: "2, 8, 18, 32, 12, 2",
//     mass: 183.84,
//     description: "Tungsten (Wolfram) is a hard, steel-gray metal with the highest melting point of all metals (3422 °C). It is extremely dense and is used in filaments, cutting tools, and heavy metal alloys.&#8203;:contentReference[oaicite:200]{index=200}",
//     density: 19.25,          // g/cm³
//     meltingPoint: 3695,      // K
//     boilingPoint: 5828,      // K
//     atomicRadius: 193,       // pm (metallic)
//     electronegativity: 2.36,
//     discoveryYear: 1783,
//     discoveredBy: "Fausto and Juan José Elhuyar",  // isolated tungsten from wolframite (1783)
//     namedAfter: "Swedish ‘tung sten’ (heavy stone), symbol from German ‘Wolfram’",
//     electronConfiguration: "[Xe] 4f14 5d4 6s2",
//     oxidationStates: "+6, +5, +4, +3, +2, 0",
//     electronShells: [2, 8, 18, 32, 12, 2],
//     color: "steel-gray",
//     appearance: "grayish-white, very hard metal",
//     commonUses: ["light bulb filaments", "cutting tools (carbide)"],  // incandescent lamp filaments; tungsten carbide in drill bits
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 1.3,     // ppm
//     abundanceUniverse: 0.0001,// ppm
//     cpkColor: "#2194D6",     // CPK color (blue)
//     iconColor: "#2194D6",
//     modelColor: "#2194D6",
//     modelRadius: 135
//   }, // Tungsten&#8203;:contentReference[oaicite:201]{index=201}

//   {
//     symbol: "Re",
//     name: "Rhenium",
//     number: 75,
//     group: "Transition metal",
//     period: 6,
//     column: 7,
//     electrons: "2, 8, 18, 32, 13, 2",
//     mass: 186.207,
//     description: "Rhenium is a dense, silvery-white metal. It has one of the highest melting points and is added to superalloys for jet engine turbine blades. It was the last naturally occurring stable element to be discovered (1925).&#8203;:contentReference[oaicite:202]{index=202}",
//     density: 21.02,          // g/cm³
//     meltingPoint: 3459,      // K
//     boilingPoint: 5869,      // K
//     atomicRadius: 188,       // pm (metallic)
//     electronegativity: 1.9,
//     discoveryYear: 1925,
//     discoveredBy: "Ida Noddack, Walter Noddack, & Otto Berg",  // discovered rhenium (1925)
//     namedAfter: "Latin ‘Rhenus’ (Rhine River)",
//     electronConfiguration: "[Xe] 4f14 5d5 6s2",
//     oxidationStates: "+7, +6, +4, +2, -1",
//     electronShells: [2, 8, 18, 32, 13, 2],
//     color: "silvery-white",
//     appearance: "lustrous silvery metal",
//     commonUses: ["jet engine superalloys", "platinum-rhenium catalysts (petrochemical)"],  // Ni-based superalloys for turbine blades; Pt-Re catalysts for reforming in gasoline production
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.0007,  // ppm (very rare)
//     abundanceUniverse: 0.000002,// ppm
//     cpkColor: "#267DAB",     // CPK color (blue)
//     iconColor: "#267DAB",
//     modelColor: "#267DAB",
//     modelRadius: 135
//   }, // Rhenium&#8203;:contentReference[oaicite:203]{index=203}

//   {
//     symbol: "Os",
//     name: "Osmium",
//     number: 76,
//     group: "Transition metal",
//     period: 6,
//     column: 8,
//     electrons: "2, 8, 18, 32, 14, 2",
//     mass: 190.23,
//     description: "Osmium is a bluish-white, extremely dense metal—it's the densest naturally occurring element. It is very hard and brittle. Osmium tetroxide (volatile oxide) has a pungent smell (hence the name). Used in fountain pen tips and electrical contacts.&#8203;:contentReference[oaicite:204]{index=204}",
//     density: 22.59,          // g/cm³
//     meltingPoint: 3306,      // K
//     boilingPoint: 5285,      // K
//     atomicRadius: 185,       // pm (metallic)
//     electronegativity: 2.2,
//     discoveryYear: 1803,
//     discoveredBy: "Smithson Tennant",  // discovered osmium (1803)&#8203;:contentReference[oaicite:205]{index=205}
//     namedAfter: "Greek ‘osme’ (odor) for the smell of osmium tetroxide",
//     electronConfiguration: "[Xe] 4f14 5d6 6s2",
//     oxidationStates: "+8, +4, +3, +2, 0",
//     electronShells: [2, 8, 18, 32, 14, 2],
//     color: "bluish-silver",
//     appearance: "blue-tinged silvery metal",
//     commonUses: ["hard alloys (osmium-iridium in pen tips)", "electrical contacts"],  // Os-Ir alloy for durable tips; Os alloys in high-wear contacts
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.001,   // ppm
//     abundanceUniverse: 0.000002,// ppm
//     cpkColor: "#00AEEF",     // CPK color (blue)
//     iconColor: "#00AEEF",
//     modelColor: "#00AEEF",
//     modelRadius: 130
//   }, // Osmium&#8203;:contentReference[oaicite:206]{index=206}&#8203;:contentReference[oaicite:207]{index=207}

//   {
//     symbol: "Ir",
//     name: "Iridium",
//     number: 77,
//     group: "Transition metal",
//     period: 6,
//     column: 9,
//     electrons: "2, 8, 18, 32, 15, 2",
//     mass: 192.217,
//     description: "Iridium is a very hard, brittle, silvery-white metal, and is the second-densest element. It is one of the most corrosion-resistant metals and is found in platinum ores and in meteorites. Used in high-temperature materials and spark plugs.&#8203;:contentReference[oaicite:208]{index=208}",
//     density: 22.56,          // g/cm³
//     meltingPoint: 2719,      // K
//     boilingPoint: 4701,      // K
//     atomicRadius: 180,       // pm (metallic)
//     electronegativity: 2.20,
//     discoveryYear: 1803,
//     discoveredBy: "Smithson Tennant",  // discovered in platinum residue (1803)
//     namedAfter: "Latin ‘iris’ (rainbow) for its colorful salts",
//     electronConfiguration: "[Xe] 4f14 5d7 6s2",
//     oxidationStates: "+4, +3, +6, +1, +2, +8, 0",
//     electronShells: [2, 8, 18, 32, 15, 2],
//     color: "silvery-white",
//     appearance: "lustrous silvery metal",
//     commonUses: ["spark plug electrodes", "crucibles for high-temperature use"],  // Ir in spark plugs and electrical contacts; crucibles to grow crystals at high T
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.001,   // ppm
//     abundanceUniverse: 0.000001,// ppm
//     cpkColor: "#175487",     // CPK color (dark blue)
//     iconColor: "#175487",
//     modelColor: "#175487",
//     modelRadius: 135
//   }, // Iridium&#8203;:contentReference[oaicite:209]{index=209}

//   {
//     symbol: "Pt",
//     name: "Platinum",
//     number: 78,
//     group: "Transition metal",
//     period: 6,
//     column: 10,
//     electrons: "2, 8, 18, 32, 17, 1",
//     mass: 195.084,
//     description: "Platinum is a dense, malleable, silvery-white precious metal. It is highly unreactive (noble metal) and is used in jewelry and as a catalyst (e.g., in catalytic converters).&#8203;:contentReference[oaicite:210]{index=210}",
//     density: 21.45,          // g/cm³
//     meltingPoint: 2041.4,    // K
//     boilingPoint: 4098,      // K
//     atomicRadius: 177,       // pm (metallic)
//     electronegativity: 2.28,
//     discoveryYear: Ancient,  // known to pre-Columbian South Americans (first European report 1557)
//     discoveredBy: null,
//     namedAfter: "Spanish ‘platina’ (little silver)",
//     electronConfiguration: "[Xe] 4f14 5d9 6s1",
//     oxidationStates: "+4, +2, +6, +5, +3, +1, 0, -1, -2",
//     electronShells: [2, 8, 18, 32, 17, 1],
//     color: "silvery-white",
//     appearance: "shiny white metal",
//     commonUses: ["jewelry and coins", "catalytic converters"],  // fine jewelry; auto exhaust catalysts
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.005,   // ppm
//     abundanceUniverse: 0.000003,// ppm
//     cpkColor: "#D0D0E0",     // CPK color (light gray-blue)
//     iconColor: "#D0D0E0",
//     modelColor: "#D0D0E0",
//     modelRadius: 135
//   }, // Platinum&#8203;:contentReference[oaicite:211]{index=211}

//   {
//     symbol: "Au",
//     name: "Gold",
//     number: 79,
//     group: "Transition metal",
//     period: 6,
//     column: 11,
//     electrons: "2, 8, 18, 32, 18, 1",
//     mass: 196.967,
//     description: "Gold is a bright, dense, yellow precious metal. It is very malleable and ductile, and is highly resistant to corrosion (a noble metal). Gold has been valued for coinage, jewelry, and art for thousands of years.&#8203;:contentReference[oaicite:212]{index=212}",
//     density: 19.30,          // g/cm³
//     meltingPoint: 1337.33,   // K
//     boilingPoint: 3129,      // K
//     atomicRadius: 174,       // pm (metallic)
//     electronegativity: 2.54,
//     discoveryYear: Ancient,
//     discoveredBy: null,      // known since antiquity
//     namedAfter: "Anglo-Saxon ‘geolu’ (yellow); symbol from Latin ‘aurum’",
//     electronConfiguration: "[Xe] 4f14 5d10 6s1",
//     oxidationStates: "+3, +1, -1, +2, +5",
//     electronShells: [2, 8, 18, 32, 18, 1],
//     color: "metallic yellow",
//     appearance: "bright yellow metal",
//     commonUses: ["jewelry and bullion", "electronics (contacts, connectors)"],  // primary jewelry metal; excellent conductor, used for corrosion-resistant contacts
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.004,   // ppm
//     abundanceUniverse: 0.000007,// ppm
//     cpkColor: "#FFD123",     // CPK color (golden)
//     iconColor: "#FFD123",
//     modelColor: "#FFD123",
//     modelRadius: 135
//   }, // Gold&#8203;:contentReference[oaicite:213]{index=213}

//   {
//     symbol: "Hg",
//     name: "Mercury",
//     number: 80,
//     group: "Transition metal",
//     period: 6,
//     column: 12,
//     electrons: "2, 8, 18, 32, 18, 2",
//     mass: 200.592,
//     description: "Mercury is a heavy, silvery liquid metal at room temperature – the only metal that is liquid under standard conditions. It has a high vapor pressure and is toxic. Historically called quicksilver, it’s used in thermometers and fluorescent lamps.&#8203;:contentReference[oaicite:214]{index=214}",
//     density: 13.534,         // g/cm³ (at 293 K)
//     meltingPoint: 234.32,    // K
//     boilingPoint: 629.88,    // K
//     atomicRadius: 171,       // pm (van der Waals ~155 pm; metallic radius not applicable in liquid state)
//     electronegativity: 2.00,
//     discoveryYear: Ancient,
//     discoveredBy: null,      // known to ancient Chinese and Indians; used by alchemists
//     namedAfter: "Mercury (Roman messenger god); symbol from Latin ‘hydrargyrum’ (water-silver)",
//     electronConfiguration: "[Xe] 4f14 5d10 6s2",
//     oxidationStates: "+2, +1",
//     electronShells: [2, 8, 18, 32, 18, 2],
//     color: "silvery",
//     appearance: "lustrous silvery liquid",
//     commonUses: ["thermometers and barometers (historically)", "fluorescent lamp vapor"],  // clinical thermometers (phased out); Hg vapor in fluorescent tubes
//     phase: "liquid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.085,   // ppm
//     abundanceUniverse: 0.00003,// ppm
//     cpkColor: "#B8B8D0",     // CPK color (light lavender)
//     iconColor: "#B8B8D0",
//     modelColor: "#B8B8D0",
//     modelRadius: 150
//   }, // Mercury&#8203;:contentReference[oaicite:215]{index=215}

//   {
//     symbol: "Tl",
//     name: "Thallium",
//     number: 81,
//     group: "Post-transition metal",
//     period: 6,
//     column: 13,
//     electrons: "2, 8, 18, 32, 18, 3",
//     mass: 204.38,
//     description: "Thallium is a soft, bluish-gray post-transition metal that tarnishes to a bluish color in air. It was historically used in rodent poisons (highly toxic) and finds limited use in electronics and specialized glass.&#8203;:contentReference[oaicite:216]{index=216}",
//     density: 11.85,          // g/cm³
//     meltingPoint: 577,       // K
//     boilingPoint: 1746,      // K
//     atomicRadius: 156,       // pm (metallic)
//     electronegativity: 1.62,
//     discoveryYear: 1861,
//     discoveredBy: "William Crookes",  // observed in spectroscopy (1861), isolated by Claude-Auguste Lamy (1862)
//     namedAfter: "Greek ‘thallos’ (green shoot), for green spectral line",
//     electronConfiguration: "[Xe] 4f14 5d10 6s2 6p1",
//     oxidationStates: "+3, +1",
//     electronShells: [2, 8, 18, 32, 18, 3],
//     color: "gray",
//     appearance: "soft bluish-gray metal (forms oxide coating)",
//     commonUses: ["infrared optical materials (thallium bromoiodide)", "low-melting glass"],  // specialized infrared glass (Tl salts in lenses); also historically in thermometers for low T
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.85,    // ppm
//     abundanceUniverse: 0.000008,// ppm
//     cpkColor: "#A6544D",     // CPK color (brown)
//     iconColor: "#A6544D",
//     modelColor: "#A6544D",
//     modelRadius: 190
//   }, // Thallium&#8203;:contentReference[oaicite:217]{index=217}

//   {
//     symbol: "Pb",
//     name: "Lead",
//     number: 82,
//     group: "Post-transition metal",
//     period: 6,
//     column: 14,
//     electrons: "2, 8, 18, 32, 18, 4",
//     mass: 207.2,
//     description: "Lead is a heavy, soft, bluish-gray metal. It is very malleable and resistant to corrosion, but tarnishes in air. Lead has been used since ancient times in pipes, pigments, and alloys, but its toxicity has led to reduced use in paints and fuels.&#8203;:contentReference[oaicite:218]{index=218}",
//     density: 11.34,          // g/cm³
//     meltingPoint: 600.61,    // K
//     boilingPoint: 2022,      // K
//     atomicRadius: 154,       // pm (metallic)
//     electronegativity: 2.33,
//     discoveryYear: Ancient,
//     discoveredBy: null,      // known to ancients
//     namedAfter: "Anglo-Saxon ‘lead’; symbol from Latin ‘plumbum’",
//     electronConfiguration: "[Xe] 4f14 5d10 6s2 6p2",
//     oxidationStates: "+4, +2",
//     electronShells: [2, 8, 18, 32, 18, 4],
//     color: "bluish-gray",
//     appearance: "dull metallic gray, bright when freshly cut",
//     commonUses: ["lead-acid batteries", "radiation shielding"],  // car batteries; X-ray shielding aprons and walls&#8203;:contentReference[oaicite:219]{index=219}
//     phase: "solid",
//     radioactive: false,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 14,      // ppm
//     abundanceUniverse: 0.0001,// ppm
//     cpkColor: "#575961",     // CPK color (dark gray)
//     iconColor: "#575961",
//     modelColor: "#575961",
//     modelRadius: 180
//   }, // Lead&#8203;:contentReference[oaicite:220]{index=220}

//   {
//     symbol: "Bi",
//     name: "Bismuth",
//     number: 83,
//     group: "Post-transition metal",
//     period: 6,
//     column: 15,
//     electrons: "2, 8, 18, 32, 18, 5",
//     mass: 208.980,
//     description: "Bismuth is a brittle, crystalline white metal with a slight pinkish tinge. It is the heaviest element that is considered stable (though it has a very long half-life). Bismuth’s compounds have been used in cosmetics and medicines (e.g., Pepto-Bismol).&#8203;:contentReference[oaicite:221]{index=221}",
//     density: 9.78,           // g/cm³
//     meltingPoint: 544.55,    // K
//     boilingPoint: 1837,      // K
//     atomicRadius: 207,       // pm (van der Waals)
//     electronegativity: 2.02,
//     discoveryYear: Ancient,
//     discoveredBy: null,      // known since at least medieval times (often confused with lead/tin)
//     namedAfter: "German ‘Wismut’ (white mass, originally for bismuth ore)",
//     electronConfiguration: "[Xe] 4f14 5d10 6s2 6p3",
//     oxidationStates: "+5, +3",
//     electronShells: [2, 8, 18, 32, 18, 5],
//     color: "silvery-white with slight pink hue",
//     appearance: "lustrous silvery metal with pink tint",
//     commonUses: ["pepto-bismol (bismuth subsalicylate)", "low-melting alloys (fire sprinkler triggers)"],  // stomach relief medicine; Wood's metal (Bi-Pb-Cd-Sn) in automatic sprinklers
//     phase: "solid",
//     radioactive: false,  // Bi-209 has a very long half-life (~1.9e19 years)&#8203;:contentReference[oaicite:222]{index=222}
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 0.17,    // ppm
//     abundanceUniverse: 0.000008,// ppm
//     cpkColor: "#9E4FB5",     // CPK color (purple)
//     iconColor: "#9E4FB5",
//     modelColor: "#9E4FB5",
//     modelRadius: 160
//   }, // Bismuth&#8203;:contentReference[oaicite:223]{index=223}&#8203;:contentReference[oaicite:224]{index=224}

//   {
//     symbol: "Po",
//     name: "Polonium",
//     number: 84,
//     group: "Post-transition metal",
//     period: 6,
//     column: 16,
//     electrons: "2, 8, 18, 32, 18, 6",
//     mass: 209,
//     description: "Polonium is a rare, highly radioactive metal. It has a silvery appearance but tarnishes quickly. Polonium emits alpha particles and was discovered by Marie Curie. A tiny amount of Po-210 was infamously used as a poison in the 2006 poisoning of A. Litvinenko.&#8203;:contentReference[oaicite:225]{index=225}",
//     density: 9.20,           // g/cm³ (alpha form, 20 °C)
//     meltingPoint: 527,       // K
//     boilingPoint: 1235,      // K
//     atomicRadius: 197,       // pm (metallic, estimated)
//     electronegativity: 2.0,
//     discoveryYear: 1898,
//     discoveredBy: "Marie Curie & Pierre Curie",  // discovered polonium (1898)
//     namedAfter: "Poland (Latin ‘Polonia’), homeland of Marie Curie",
//     electronConfiguration: "[Xe] 4f14 5d10 6s2 6p4",
//     oxidationStates: "+4, +2",
//     electronShells: [2, 8, 18, 32, 18, 6],
//     color: "silvery",
//     appearance: "silvery metal (quickly oxidizes)",
//     commonUses: ["antistatic devices (alpha emitters)", "heat source in space probes (Po-210)"],  // Po-210 in brushes to remove dust via static elimination; historic use in RTG heaters (no longer common)
//     phase: "solid",
//     radioactive: true,
//     natural: true,  // trace from uranium decay
//     metal: "metal",
//     abundanceCrust: ~0,      // (extremely low, ~10^-10 ppm from U decay)
//     abundanceUniverse: ~0,   // (trace)
//     cpkColor: "#AB5C00",     // CPK color (brown)
//     iconColor: "#AB5C00",
//     modelColor: "#AB5C00",
//     modelRadius: 190
//   }, // Polonium&#8203;:contentReference[oaicite:226]{index=226}

//   {
//     symbol: "At",
//     name: "Astatine",
//     number: 85,
//     group: "Halogen",
//     period: 6,
//     column: 17,
//     electrons: "2, 8, 18, 32, 18, 7",
//     mass: 210,
//     description: "Astatine is a highly radioactive halogen and is the rarest naturally occurring element on Earth. All its isotopes are short-lived. It is usually produced artificially by bombarding bismuth with alpha particles. Its appearance is unknown, but it is likely a dark or metallic-looking solid at room temperature.&#8203;:contentReference[oaicite:227]{index=227}",
//     density: ~7,             // g/cm³ (estimated)
//     meltingPoint: 575,       // K (estimated)
//     boilingPoint: 610,       // K (estimated)
//     atomicRadius: 202,       // pm (estimated van der Waals)
//     electronegativity: 2.2,  // (estimates vary 2.2–2.3)
//     discoveryYear: 1940,
//     discoveredBy: "Dale Corson, Kenneth MacKenzie, & Emilio Segrè",  // synthesized astatine (then “element 85”) in 1940&#8203;:contentReference[oaicite:228]{index=228}
//     namedAfter: "Greek ‘astatos’ (unstable)",
//     electronConfiguration: "[Xe] 4f14 5d10 6s2 6p5",
//     oxidationStates: "+1, -1, +3, +5",
//     electronShells: [2, 8, 18, 32, 18, 7],
//     color: "(unknown, probably black or metallic)",
//     appearance: "(unknown – likely a dark, shiny solid)",
//     commonUses: ["cancer radiotherapy (At-211 experimental)"],  // At-211 is studied for targeted alpha therapy in cancer
//     phase: "solid",
//     radioactive: true,
//     natural: true,  // trace from decay of heavier elements
//     metal: "metalloid",  // Astatine is usually classified as a halogen (nonmetal), but expected to have some metalloid properties
//     abundanceCrust: ~0,   // (only ~0.05 micrograms in entire Earth's crust at any time)
//     abundanceUniverse: ~0,// 
//     cpkColor: "#754F45",   // CPK color (dark brown)
//     iconColor: "#754F45",
//     modelColor: "#754F45",
//     modelRadius: 127
//   }, // Astatine&#8203;:contentReference[oaicite:229]{index=229}&#8203;:contentReference[oaicite:230]{index=230}

//   {
//     symbol: "Rn",
//     name: "Radon",
//     number: 86,
//     group: "Noble gas",
//     period: 6,
//     column: 18,
//     electrons: "2, 8, 18, 32, 18, 8",
//     mass: 222,
//     description: "Radon is a radioactive noble gas. It is colorless, odorless, and tasteless. Radon is formed from the decay of uranium and thorium in the ground and can accumulate in buildings, posing a health hazard. It has few uses, except in some cancer treatments. It is the densest gas at STP.&#8203;:contentReference[oaicite:231]{index=231}",
//     density: 0.00973,        // g/cm³ at STP
//     meltingPoint: 202.0,     // K
//     boilingPoint: 211.5,     // K
//     atomicRadius: 220,       // pm (van der Waals)
//     electronegativity: null, // (no data for electronegativity; not forming stable compounds except clathrates)
//     discoveryYear: 1900,
//     discoveredBy: "Friedrich Ernst Dorn",  // observed radon (as 'radium emanation', 1900)
//     namedAfter: "From ‘radium’ (as it was first observed as radium emanation)",
//     electronConfiguration: "[Xe] 4f14 5d10 6s2 6p6",
//     oxidationStates: "0, +2",
//     electronShells: [2, 8, 18, 32, 18, 8],
//     color: "colorless (glows yellow-orange in discharge)",
//     appearance: "colorless gas (forms yellow solid upon freezing)",
//     commonUses: ["cancer radiotherapy (seed implants)"],  //  radon was historically used in some brachytherapy seeds, now largely discontinued
//     phase: "gas",
//     radioactive: true,
//     natural: true,
//     metal: "nonmetal",
//     abundanceCrust: ~0,      // (trace from decay, ~6×10^-18% of air)
//     abundanceUniverse: ~0,   // 
//     cpkColor: "#428296",     // CPK color (gray-blue)
//     iconColor: "#428296",
//     modelColor: "#428296",
//     modelRadius: 120
//   }, // Radon&#8203;:contentReference[oaicite:232]{index=232}

//   {
//     symbol: "Fr",
//     name: "Francium",
//     number: 87,
//     group: "Alkali metal",
//     period: 7,
//     column: 1,
//     electrons: "2, 8, 18, 32, 18, 8, 1",
//     mass: 223,
//     description: "Francium is an extremely rare and highly radioactive alkali metal. It is the second-least electronegative element (after cesium) and is so unstable that only trace amounts exist in nature at any time (from decay of actinium). It has no commercial uses due to its short half-life (~22 min for Fr-223).&#8203;:contentReference[oaicite:233]{index=233}",
//     density: ~1.87,          // g/cm³ (estimated, likely similar to Cs)
//     meltingPoint: ~300,      // K (estimated ~27 °C, likely just above room temp)
//     boilingPoint: ~950,      // K (estimated)
//     atomicRadius: 348,       // pm (estimated metallic)
//     electronegativity: 0.7,  // (Pauling, estimated ~0.7–0.8)
//     discoveryYear: 1939,
//     discoveredBy: "Marguerite Perey",  // discovered francium (1939)&#8203;:contentReference[oaicite:234]{index=234}
//     namedAfter: "France (the home country of the discoverer)",
//     electronConfiguration: "[Rn] 7s1",
//     oxidationStates: "+1",
//     electronShells: [2, 8, 18, 32, 18, 8, 1],
//     color: "(unknown, probably silvery-metallic)",
//     appearance: "(unknown – likely a highly reactive silver metal)",
//     commonUses: ["no practical uses (research only)"],
//     phase: "solid",
//     radioactive: true,
//     natural: true,  // trace from Ac-227 decay
//     metal: "metal",
//     abundanceCrust: ~0,      // (approx. 30 g total on Earth at any time)
//     abundanceUniverse: ~0,
//     cpkColor: "#420066",     // CPK color (deep violet)
//     iconColor: "#420066",
//     modelColor: "#420066",
//     modelRadius: 260
//   }, // Francium&#8203;:contentReference[oaicite:235]{index=235}

//   {
//     symbol: "Ra",
//     name: "Radium",
//     number: 88,
//     group: "Alkaline earth metal",
//     period: 7,
//     column: 2,
//     electrons: "2, 8, 18, 32, 18, 8, 2",
//     mass: 226,
//     description: "Radium is a highly radioactive alkaline earth metal. It is silvery-white when freshly cut but oxidizes to black. Discovered by the Curies in uranium ore, it glows blue in the dark (due to radiation exciting air). Historically used in luminous paints, it’s now known for its radiotoxicity. All isotopes are radioactive (Ra-226 half-life ~1600 years).&#8203;:contentReference[oaicite:236]{index=236}",
//     density: 5.50,           // g/cm³ (estimated)
//     meltingPoint: 973,       // K (estimated)
//     boilingPoint: 2010,      // K (estimated)
//     atomicRadius: 283,       // pm (metallic)
//     electronegativity: 0.90,
//     discoveryYear: 1898,
//     discoveredBy: "Marie Curie & Pierre Curie",  // discovered radium (1898)
//     namedAfter: "Latin ‘radius’ (ray) for its radiant properties",
//     electronConfiguration: "[Rn] 7s2",
//     oxidationStates: "+2",
//     electronShells: [2, 8, 18, 32, 18, 8, 2],
//     color: "silvery-white (quickly oxidizes)",
//     appearance: "silvery metal (glows blue in air)",
//     commonUses: ["obsolete: luminous paint (historical)", "cancer radiotherapy (historical)"],  // formerly in luminous clock dials; used in early cancer treatments (radium needles)&#8203;:contentReference[oaicite:237]{index=237}
//     phase: "solid",
//     radioactive: true,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: ~0.9e-6, // ppm (trace from uranium/thorium decay)
//     abundanceUniverse: ~0,   // ppm
//     cpkColor: "#007D00",     // CPK color (dark green)
//     iconColor: "#007D00",
//     modelColor: "#007D00",
//     modelRadius: 215
//   }, // Radium&#8203;:contentReference[oaicite:238]{index=238}

//   {
//     symbol: "Ac",
//     name: "Actinium",
//     number: 89,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 18, 9, 2",
//     mass: 227,
//     description: "Actinium is a silvery, highly radioactive metal and the first element of the actinide series. It glows pale blue in the dark due to its intense radioactivity. Actinium is found in trace amounts in uranium ores and was discovered as a product of radium decay. It has limited use in medicine (Ac-225 in targeted alpha therapy).&#8203;:contentReference[oaicite:239]{index=239}",
//     density: 10.07,          // g/cm³ (estimated)
//     meltingPoint: 1500,      // K (estimated)
//     boilingPoint: 3500,      // K (estimated)
//     atomicRadius: 215,       // pm (metallic, estimated)
//     electronegativity: 1.1,
//     discoveryYear: 1899,
//     discoveredBy: "André-Louis Debierne",  // discovered actinium (1899)&#8203;:contentReference[oaicite:240]{index=240}
//     namedAfter: "Greek ‘aktinos’ (ray)",
//     electronConfiguration: "[Rn] 6d1 7s2",
//     oxidationStates: "+3",
//     electronShells: [2, 8, 18, 32, 18, 9, 2],
//     color: "silvery-white",
//     appearance: "silvery metal (glows blue in dark)",
//     commonUses: ["cancer treatment (Ac-225 experimental radiopharmaceutical)"],  // Ac-225 used in targeted alpha therapy for cancer (e.g., for leukemia)
//     phase: "solid",
//     radioactive: true,
//     natural: true,  // trace in uranium ores
//     metal: "metal",
//     abundanceCrust: ~0,      // (trace, ~5×10^-10 ppm in pitchblende)
//     abundanceUniverse: ~0,
//     cpkColor: "#70ABFA",     // CPK color (lavender blue)
//     iconColor: "#70ABFA",
//     modelColor: "#70ABFA",
//     modelRadius: 195
//   }, // Actinium&#8203;:contentReference[oaicite:241]{index=241}

//   {
//     symbol: "Th",
//     name: "Thorium",
//     number: 90,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 18, 10, 2",
//     mass: 232.0377,
//     description: "Thorium is a weakly radioactive, silvery metal. It is moderately hard and tarnishes black when exposed to air. Thorium is about three times more abundant than uranium in Earth's crust and has been considered as a nuclear fuel (in thorium reactors) since it breeds fissile U-233. Its most stable isotope Th-232 has a half-life comparable to the age of the universe.&#8203;:contentReference[oaicite:242]{index=242}",
//     density: 11.72,          // g/cm³
//     meltingPoint: 2023,      // K
//     boilingPoint: 5061,      // K
//     atomicRadius: 237,       // pm (metallic)
//     electronegativity: 1.3,
//     discoveryYear: 1829,
//     discoveredBy: "Jöns Jakob Berzelius",  // discovered thorium (1829)
//     namedAfter: "Thor (Norse god of thunder)",
//     electronConfiguration: "[Rn] 6d2 7s2",
//     oxidationStates: "+4",
//     electronShells: [2, 8, 18, 32, 18, 10, 2],
//     color: "silvery",
//     appearance: "silvery metal (tarnishes to gray/black)",
//     commonUses: ["mantles for gas lamps (thorium oxide, historical)", "potential nuclear fuel (Th-U cycle)"],  // incandescent gas mantles used ThO2 (obsolete); experimental thorium reactors
//     phase: "solid",
//     radioactive: true,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 6,       // ppm
//     abundanceUniverse: 0.00007,// ppm
//     cpkColor: "#00FFCC",     // CPK color (aqua)
//     iconColor: "#00FFCC",
//     modelColor: "#00FFCC",
//     modelRadius: 180
//   }, // Thorium&#8203;:contentReference[oaicite:243]{index=243}

//   {
//     symbol: "Pa",
//     name: "Protactinium",
//     number: 91,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 20, 9, 2",
//     mass: 231.0359,
//     description: "Protactinium is a dense, silvery-gray actinide metal. It is highly radioactive and toxic. Protactinium is one of the rarest naturally occurring elements; it occurs as a decay product of uranium. Its name means 'parent of actinium,' as it beta-decays into actinium. There are no significant uses due to its scarcity and radioactivity.&#8203;:contentReference[oaicite:244]{index=244}",
//     density: 15.37,          // g/cm³
//     meltingPoint: 1845,      // K (estimated)
//     boilingPoint: 4273,      // K (estimated)
//     atomicRadius: 243,       // pm (metallic, estimated)
//     electronegativity: 1.5,
//     discoveryYear: 1913,
//     discoveredBy: "Kasimir Fajans & Oswald Helmuth Göhring",  // discovered Pa-234 (1913); Hahn & Meitner in 1918 found Pa-231
//     namedAfter: "Greek ‘protos’ (first) + actinium (progenitor of actinium)",
//     electronConfiguration: "[Rn] 5f2 6d1 7s2",
//     oxidationStates: "+5, +4",
//     electronShells: [2, 8, 18, 32, 20, 9, 2],
//     color: "bright metallic",
//     appearance: "shiny metallic (quickly oxidizes to dark film)",
//     commonUses: ["no commercial uses (only scientific research)"],
//     phase: "solid",
//     radioactive: true,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: ~0,      // (extremely low, ~0.1 ppb)
//     abundanceUniverse: ~0,
//     cpkColor: "#00EBAE",     // CPK color (teal)
//     iconColor: "#00EBAE",
//     modelColor: "#00EBAE",
//     modelRadius: 180
//   }, // Protactinium&#8203;:contentReference[oaicite:245]{index=245}

//   {
//     symbol: "U",
//     name: "Uranium",
//     number: 92,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 21, 9, 2",
//     mass: 238.0289,
//     description: "Uranium is a hard, dense, silvery-gray actinide metal. It is weakly radioactive. Uranium’s U-235 isotope is fissile, making it critical for nuclear reactors and weapons. Uranium compounds (like yellowcakes) have been used as pigments (uranium glass fluoresces green under UV). It is the heaviest naturally occurring element in significant quantity.&#8203;:contentReference[oaicite:246]{index=246}",
//     density: 19.05,          // g/cm³
//     meltingPoint: 1405.3,    // K
//     boilingPoint: 4404,      // K
//     atomicRadius: 240,       // pm (metallic)
//     electronegativity: 1.38,
//     discoveryYear: 1789,
//     discoveredBy: "Martin Heinrich Klaproth",  // discovered uranium (1789)
//     namedAfter: "Uranus (the planet, discovered 1781)",
//     electronConfiguration: "[Rn] 5f3 6d1 7s2",
//     oxidationStates: "+6, +5, +4, +3",
//     electronShells: [2, 8, 18, 32, 21, 9, 2],
//     color: "silvery-gray",
//     appearance: "silvery metallic solid (tarnishes to black oxide)",
//     commonUses: ["nuclear reactor fuel (U-235, U-238 in MOX)", "nuclear weapons"],  // enriched U-235 in reactors and bombs; depleted U for armor-piercing ammo
//     phase: "solid",
//     radioactive: true,
//     natural: true,
//     metal: "metal",
//     abundanceCrust: 2.7,     // ppm
//     abundanceUniverse: 0.00018,// ppm
//     cpkColor: "#008FFF",     // CPK color (blue)
//     iconColor: "#008FFF",
//     modelColor: "#008FFF",
//     modelRadius: 175
//   }, // Uranium&#8203;:contentReference[oaicite:247]{index=247}

//   {
//     symbol: "Np",
//     name: "Neptunium",
//     number: 93,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 22, 9, 2",
//     mass: 237,
//     description: "Neptunium is a radioactive actinide metal, the first transuranium element. It’s a silvery metal (when freshly cut) that quickly tarnishes. Neptunium is produced in nuclear reactors as a byproduct of plutonium production. The most stable isotope, Np-237, has a 2.1 million year half-life. Neptunium has been used in neutron detection instruments.&#8203;:contentReference[oaicite:248]{index=248}",
//     density: 20.45,          // g/cm³ (alpha phase)
//     meltingPoint: 917,       // K
//     boilingPoint: 4273,      // K (est.)
//     atomicRadius: 221,       // pm (metallic, estimated)
//     electronegativity: 1.36,
//     discoveryYear: 1940,
//     discoveredBy: "Edwin McMillan & Philip Abelson",  // synthesized neptunium (1940)
//     namedAfter: "Neptune (the planet)",
//     electronConfiguration: "[Rn] 5f4 6d1 7s2",
//     oxidationStates: "+5, +6, +4, +3, +7",
//     electronShells: [2, 8, 18, 32, 22, 9, 2],
//     color: "silvery",
//     appearance: "silvery metal (tarnishes readily)",
//     commonUses: ["no commercial uses (used in scientific research, neutron detectors)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,  // trace amounts in uranium ores from neutron capture
//     metal: "metal",
//     abundanceCrust: ~0,      // (trace from uranium, ~10^-12% in ore)
//     abundanceUniverse: ~0,
//     cpkColor: "#0080FF",     // CPK color (blue)
//     iconColor: "#0080FF",
//     modelColor: "#0080FF",
//     modelRadius: 175
//   }, // Neptunium&#8203;:contentReference[oaicite:249]{index=249}

//   {
//     symbol: "Pu",
//     name: "Plutonium",
//     number: 94,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 24, 8, 2",
//     mass: 244,
//     description: "Plutonium is a highly radioactive, silvery-gray actinide metal (often shows a yellow oxide coating). It is warm to the touch (from ongoing alpha decay). Pu-239 is fissile and used in nuclear weapons and reactors. Plutonium is chemically reactive, capable of existing in multiple oxidation states and colored solutions. It was first produced and isolated during the Manhattan Project.&#8203;:contentReference[oaicite:250]{index=250}",
//     density: 19.84,          // g/cm³ (alpha phase)
//     meltingPoint: 912.5,     // K
//     boilingPoint: 3505,      // K
//     atomicRadius: 243,       // pm (metallic)
//     electronegativity: 1.28,
//     discoveryYear: 1940,
//     discoveredBy: "Glenn T. Seaborg et al.",  // synthesized Pu (1940–1941)
//     namedAfter: "Pluto (dwarf planet, then considered a planet)",
//     electronConfiguration: "[Rn] 5f6 7s2",
//     oxidationStates: "+4, +6, +5, +3, +7, +2",
//     electronShells: [2, 8, 18, 32, 24, 8, 2],
//     color: "silvery-gray (tarnishes to yellow/brown)",
//     appearance: "silvery metal (oxidizes to dull yellowish oxide)",
//     commonUses: ["nuclear weapons (Pu-239)", "MOX reactor fuel (mixed U/Pu oxides)"],  // primary use in nuclear bombs; mixed-oxide fuel in reactors
//     phase: "solid",
//     radioactive: true,
//     natural: false,  // trace from uranium capture, essentially synthetic
//     metal: "metal",
//     abundanceCrust: ~0,      // (trace, ~10^-11% in some ores)
//     abundanceUniverse: ~0,
//     cpkColor: "#006BFF",     // CPK color (blue)
//     iconColor: "#006BFF",
//     modelColor: "#006BFF",
//     modelRadius: 175
//   }, // Plutonium&#8203;:contentReference[oaicite:251]{index=251}

//   {
//     symbol: "Am",
//     name: "Americium",
//     number: 95,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 25, 8, 2",
//     mass: 243,
//     description: "Americium is a synthetic, silvery-white radioactive metal in the actinide series. It was named after the Americas. Am-241 is widely used in small amounts in household smoke detectors (as an alpha source). Americium also is used as a neutron source in scientific applications. It is chemically reactive, gradually tarnishing in air.&#8203;:contentReference[oaicite:252]{index=252}",
//     density: 13.67,          // g/cm³ (alpha-Am)
//     meltingPoint: 1449,      // K
//     boilingPoint: 2284,      // K
//     atomicRadius: 244,       // pm (estimated metallic)
//     electronegativity: 1.3,
//     discoveryYear: 1944,
//     discoveredBy: "Glenn T. Seaborg et al.",  // produced in Chicago pile (1944)
//     namedAfter: "America (the New World, by analogy to europium)",
//     electronConfiguration: "[Rn] 5f7 7s2",
//     oxidationStates: "+3, +4, +5, +6",
//     electronShells: [2, 8, 18, 32, 25, 8, 2],
//     color: "silvery-white",
//     appearance: "silvery metal (quickly oxidizes)",
//     commonUses: ["smoke detectors (Am-241)", "oil well logging (Am-Be neutron source)"],  // Am-241 alpha source in ionization smoke alarms; Am-Be sources for neutron logging
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#545CF2",     // CPK color (purple)
//     iconColor: "#545CF2",
//     modelColor: "#545CF2",
//     modelRadius: 175
//   }, // Americium&#8203;:contentReference[oaicite:253]{index=253}

//   {
//     symbol: "Cm",
//     name: "Curium",
//     number: 96,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 25, 9, 2",
//     mass: 247,
//     description: "Curium is a synthetic, highly radioactive actinide metal. It is a hard, dense, silvery metal that glows purple in the dark due to its intense radioactivity (from Cm-244). It was named after Marie and Pierre Curie. Curium isotopes have been used in space probe RTGs (e.g., Cm-244 in Alpha Particle X-ray Spectrometers).&#8203;:contentReference[oaicite:254]{index=254}",
//     density: 13.51,          // g/cm³ (alpha-Cm)
//     meltingPoint: 1613,      // K
//     boilingPoint: 3383,      // K
//     atomicRadius: 245,       // pm (estimated)
//     electronegativity: 1.3,
//     discoveryYear: 1944,
//     discoveredBy: "Glenn T. Seaborg et al.",  // identified curium (1944, announced 1945)
//     namedAfter: "Pierre and Marie Curie",
//     electronConfiguration: "[Rn] 5f7 6d1 7s2",
//     oxidationStates: "+3, +4",
//     electronShells: [2, 8, 18, 32, 25, 9, 2],
//     color: "silvery-white",
//     appearance: "silvery metal",
//     commonUses: ["spacecraft Alpha-PXRF sources (Cm-244)", "research (target material)"],  // e.g., Mars rover APXS instrument uses Cm-244; used to create heavier elements in labs
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#785CE3",     // CPK color (purple)
//     iconColor: "#785CE3",
//     modelColor: "#785CE3",
//     modelRadius: 170
//   }, // Curium&#8203;:contentReference[oaicite:255]{index=255}

//   {
//     symbol: "Bk",
//     name: "Berkelium",
//     number: 97,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 27, 8, 2",
//     mass: 247,
//     description: "Berkelium is a synthetic radioactive metal in the actinide series. It was first synthesized in 1949 at UC Berkeley (hence the name). Berkelium has no significant applications outside of scientific research and serves as a target to produce heavier elements (e.g., Californium).&#8203;:contentReference[oaicite:256]{index=256}",
//     density: ~14,            // g/cm³ (estimated)
//     meltingPoint: 1259,      // K (estimated)
//     boilingPoint: ~2900,     // K (estimated)
//     atomicRadius: 244,       // pm (estimated)
//     electronegativity: 1.3,
//     discoveryYear: 1949,
//     discoveredBy: "Glenn T. Seaborg et al.",  // synthesized berkelium (1949)
//     namedAfter: "Berkeley, California (University of California, Berkeley)",
//     electronConfiguration: "[Rn] 5f9 7s2",
//     oxidationStates: "+3, +4",
//     electronShells: [2, 8, 18, 32, 27, 8, 2],
//     color: "(unknown, likely silvery)",
//     appearance: "metal (only small amounts produced)",
//     commonUses: ["scientific research (production of heavier elements)"],  // used as target to make isotopes of lawrencium, etc.
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#8A4FE3",     // CPK color (violet)
//     iconColor: "#8A4FE3",
//     modelColor: "#8A4FE3",
//     modelRadius: 170
//   }, // Berkelium&#8203;:contentReference[oaicite:257]{index=257}

//   {
//     symbol: "Cf",
//     name: "Californium",
//     number: 98,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 28, 8, 2",
//     mass: 251,
//     description: "Californium is a synthetic radioactive metal. It is notable for its ability to emit a large number of neutrons when it undergoes spontaneous fission (especially Cf-252). This property makes californium useful as a compact neutron source for neutron activation analysis and in neutron moisture/density gauges. Only trace amounts have been produced, and it’s named after California (and UC Berkeley).&#8203;:contentReference[oaicite:258]{index=258}",
//     density: 15.1,           // g/cm³ (estimated)
//     meltingPoint: 1173,      // K (approx.)
//     boilingPoint: — ,        // (unknown, likely ~1743 K)
//     atomicRadius: 245,       // pm (estimated)
//     electronegativity: 1.3,
//     discoveryYear: 1950,
//     discoveredBy: "Glenn T. Seaborg et al.",  // produced californium (1950)
//     namedAfter: "California (state and University of California)",
//     electronConfiguration: "[Rn] 5f10 7s2",
//     oxidationStates: "+3, +4",
//     electronShells: [2, 8, 18, 32, 28, 8, 2],
//     color: "(unknown, likely silvery)",
//     appearance: "(only produced in microgram quantities)",
//     commonUses: ["neutron sources (Cf-252 in gauges, reactor start-up sources)"],  // Cf-252 sources for nuclear reactor start-up; detecting gold/silver via neutron activation
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#A136D4",     // CPK color (purple)
//     iconColor: "#A136D4",
//     modelColor: "#A136D4",
//     modelRadius: 170
//   }, // Californium&#8203;:contentReference[oaicite:259]{index=259}

//   {
//     symbol: "Es",
//     name: "Einsteinium",
//     number: 99,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 29, 8, 2",
//     mass: 252,
//     description: "Einsteinium is a synthetic, highly radioactive metal, named after Albert Einstein. It was first discovered in the debris of the first hydrogen bomb test (1952). Einsteinium has no macroscopic applications; it is produced in minute quantities for research, mainly as a stepping stone to synthesize heavier elements (like mendelevium).&#8203;:contentReference[oaicite:260]{index=260}",
//     density: ~8.84,          // g/cm³ (estimated, extrapolated)
//     meltingPoint: 1133,      // K (estimated)
//     boilingPoint: — ,        // unknown
//     atomicRadius: — ,        // (not well-characterized; likely ~245 pm metallic)
//     electronegativity: 1.3,
//     discoveryYear: 1952,
//     discoveredBy: "Albert Ghiorso et al.",  // identified in thermonuclear bomb fallout (1952)
//     namedAfter: "Albert Einstein",
//     electronConfiguration: "[Rn] 5f11 7s2",
//     oxidationStates: "+3, +2",
//     electronShells: [2, 8, 18, 32, 29, 8, 2],
//     color: "(unknown, expected silvery)",
//     appearance: "(only produced in micro amounts)",
//     commonUses: ["no practical uses (research only)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#B31FD4",     // CPK color (violet)
//     iconColor: "#B31FD4",
//     modelColor: "#B31FD4",
//     modelRadius: 170
//   }, // Einsteinium&#8203;:contentReference[oaicite:261]{index=261}

//   {
//     symbol: "Fm",
//     name: "Fermium",
//     number: 100,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 30, 8, 2",
//     mass: 257,
//     description: "Fermium is a synthetic, highly radioactive metal named after Enrico Fermi. It was discovered in the fallout of the 1952 Ivy Mike hydrogen bomb test, like einsteinium. Fermium has no known uses outside fundamental research. It can only be produced in minute quantities via neutron bombardment (in nuclear reactors or explosions).&#8203;:contentReference[oaicite:262]{index=262}",
//     density: — ,             // (unknown, likely around 9-10 g/cm³)
//     meltingPoint: ~1800,     // K (predicted)
//     boilingPoint: — ,        // unknown
//     atomicRadius: — ,        // (unknown)
//     electronegativity: 1.3,
//     discoveryYear: 1952,
//     discoveredBy: "Albert Ghiorso et al.",  // in H-bomb debris (1952)
//     namedAfter: "Enrico Fermi",
//     electronConfiguration: "[Rn] 5f12 7s2",
//     oxidationStates: "+3, +2",
//     electronShells: [2, 8, 18, 32, 30, 8, 2],
//     color: "(unknown)",
//     appearance: "(no visible amounts produced)",
//     commonUses: ["no uses (scientific study only)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#B31FBA",     // CPK color (violet)
//     iconColor: "#B31FBA",
//     modelColor: "#B31FBA",
//     modelRadius: 165
//   }, // Fermium&#8203;:contentReference[oaicite:263]{index=263}

//   {
//     symbol: "Md",
//     name: "Mendelevium",
//     number: 101,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 31, 8, 2",
//     mass: 258,
//     description: "Mendelevium is a synthetic radioactive metal, named after Dmitri Mendeleev (creator of the periodic table). It was first produced in 1955 by bombarding einsteinium with alpha particles. Only trace quantities have ever been made, so its macroscopic properties are unknown. Mendelevium’s use is purely for scientific research, particularly to understand heavy element chemistry.&#8203;:contentReference[oaicite:264]{index=264}",
//     density: — ,             // (unknown)
//     meltingPoint: ~1100,     // K (predicted)
//     boilingPoint: — ,        // unknown
//     atomicRadius: — ,        // (unknown)
//     electronegativity: 1.3,
//     discoveryYear: 1955,
//     discoveredBy: "Glenn T. Seaborg et al.",  // at Berkeley (1955)
//     namedAfter: "Dmitri Mendeleev",
//     electronConfiguration: "[Rn] 5f13 7s2",
//     oxidationStates: "+3, +2",
//     electronShells: [2, 8, 18, 32, 31, 8, 2],
//     color: "(unknown)",
//     appearance: "(no bulk sample)",
//     commonUses: ["none (research only)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#B30DA6",     // CPK color (violet)
//     iconColor: "#B30DA6",
//     modelColor: "#B30DA6",
//     modelRadius: 165
//   }, // Mendelevium&#8203;:contentReference[oaicite:265]{index=265}

//   {
//     symbol: "No",
//     name: "Nobelium",
//     number: 102,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 32, 8, 2",
//     mass: 259,
//     description: "Nobelium is a synthetic radioactive element, named in honor of Alfred Nobel. It was first claimed by a Swedish group in 1957 but conclusively synthesized by Soviet researchers in 1963. Nobelium has only been produced in tiny amounts and has no practical applications, serving only in atomic research. It is the penultimate actinide.&#8203;:contentReference[oaicite:266]{index=266}",
//     density: — ,             // (unknown)
//     meltingPoint: ~1100,     // K (predicted)
//     boilingPoint: — ,        // unknown
//     atomicRadius: — ,        // (unknown)
//     electronegativity: 1.3,
//     discoveryYear: 1963,
//     discoveredBy: "Joint Institute for Nuclear Research (Dubna)",  // (Swedish group in 1957 and Dubna 1963; credit now mostly Dubna 1963)
//     namedAfter: "Alfred Nobel",
//     electronConfiguration: "[Rn] 5f14 7s2",
//     oxidationStates: "+2, +3",
//     electronShells: [2, 8, 18, 32, 32, 8, 2],
//     color: "(unknown)",
//     appearance: "(no visible sample)",
//     commonUses: ["none (only scientific curiosity)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#BD0D87",     // CPK color (violet)
//     iconColor: "#BD0D87",
//     modelColor: "#BD0D87",
//     modelRadius: 160
//   }, // Nobelium&#8203;:contentReference[oaicite:267]{index=267}

//   {
//     symbol: "Lr",
//     name: "Lawrencium",
//     number: 103,
//     group: "Actinide",
//     period: 7,
//     column: 3,
//     electrons: "2, 8, 18, 32, 32, 9, 2",
//     mass: 266,
//     description: "Lawrencium is a synthetic, highly radioactive metal and the last element of the actinide series. It was named after Ernest O. Lawrence, inventor of the cyclotron. Lawrencium was first synthesized in 1961 by a team at Berkeley. Only very few atoms have been produced, and its properties are not well known; it’s mainly of research interest as it marks the transition to the transactinide elements.&#8203;:contentReference[oaicite:268]{index=268}",
//     density: — ,             // (unknown)
//     meltingPoint: ~1900,     // K (predicted)
//     boilingPoint: — ,        // unknown
//     atomicRadius: — ,        // (unknown)
//     electronegativity: 1.3,
//     discoveryYear: 1961,
//     discoveredBy: "Albert Ghiorso et al.",  // Berkeley (1961)
//     namedAfter: "Ernest O. Lawrence",
//     electronConfiguration: "[Rn] 5f14 7s2 7p1",  // (predicted, shows start of 7p occupation)
//     oxidationStates: "+3",
//     electronShells: [2, 8, 18, 32, 32, 9, 2],
//     color: "(unknown)",
//     appearance: "(no bulk matter)",
//     commonUses: ["none (research only)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#C70066",     // CPK color (magenta)
//     iconColor: "#C70066",
//     modelColor: "#C70066",
//     modelRadius: 160
//   }, // Lawrencium&#8203;:contentReference[oaicite:269]{index=269}

//   {
//     symbol: "Rf",
//     name: "Rutherfordium",
//     number: 104,
//     group: "Transition metal",
//     period: 7,
//     column: 4,
//     electrons: "2, 8, 18, 32, 32, 10, 2",
//     mass: 267,
//     description: "Rutherfordium is a synthetic superheavy element. It is highly radioactive and short-lived; its most stable isotope has a half-life of ~1.3 hours. As the first transactinide, its chemical properties are still being studied, but it likely behaves as a heavier homolog of hafnium (group 4). It was named after physicist Ernest Rutherford. Discovered in late 1960s by Soviet (Dubna) and American (Berkeley) teams. No practical uses beyond research.&#8203;:contentReference[oaicite:270]{index=270}",
//     density: ~23,            // g/cm³ (predicted)
//     meltingPoint: — ,        // unknown
//     boilingPoint: — ,        // unknown
//     atomicRadius: — ,        // (unknown, maybe ~150 pm covalent)
//     electronegativity: — ,   // (not firmly established, likely ~1.7 Pauling)
//     discoveryYear: 1969,
//     discoveredBy: "Joint Institute for Nuclear Research & Lawrence Berkeley Lab",  // Dubna (1964 claim as kurchatovium) and Berkeley (1969 confirmed)
//     namedAfter: "Ernest Rutherford",
//     electronConfiguration: "[Rn] 5f14 6d2 7s2",  // expected configuration
//     oxidationStates: "+4 (predicted)",
//     electronShells: [2, 8, 18, 32, 32, 10, 2],
//     color: "(unknown)",
//     appearance: "(produced atom-by-atom)",
//     commonUses: ["none (only nuclear science research)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#CC0059",     // CPK color (magenta)
//     iconColor: "#CC0059",
//     modelColor: "#CC0059",
//     modelRadius: 150
//   }, // Rutherfordium&#8203;:contentReference[oaicite:271]{index=271}

//   {
//     symbol: "Db",
//     name: "Dubnium",
//     number: 105,
//     group: "Transition metal",
//     period: 7,
//     column: 5,
//     electrons: "2, 8, 18, 32, 32, 11, 2",
//     mass: 268,
//     description: "Dubnium is a synthetic superheavy element with atomic number 105. It is extremely radioactive and short-lived (half-lives of its known isotopes are on the order of seconds to minutes). Dubnium is named after Dubna, Russia, home of the Joint Institute for Nuclear Research. Its chemistry is not fully characterized, but as a group 5 element it likely resembles tantalum or niobium in some respects. Only created in labs for research, it has no practical applications.&#8203;:contentReference[oaicite:272]{index=272}",
//     density: ~29,            // g/cm³ (theoretical)
//     meltingPoint: — ,        // unknown
//     boilingPoint: — ,        // unknown
//     atomicRadius: — ,        // (unknown)
//     electronegativity: — ,   // (predicted ~1.5)
//     discoveryYear: 1968,
//     discoveredBy: "Joint Institute for Nuclear Research (Dubna)",  // first reported (1968) by Dubna, confirmed later by Berkeley
//     namedAfter: "Dubna (Russia)",
//     electronConfiguration: "[Rn] 5f14 6d3 7s2",  // predicted
//     oxidationStates: "+5, +3 (predicted)",
//     electronShells: [2, 8, 18, 32, 32, 11, 2],
//     color: "(unknown)",
//     appearance: "(only a few atoms observed)",
//     commonUses: ["none (research only)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#D1004F",     // CPK color (magenta)
//     iconColor: "#D1004F",
//     modelColor: "#D1004F",
//     modelRadius: 150
//   }, // Dubnium&#8203;:contentReference[oaicite:273]{index=273}

//   {
//     symbol: "Sg",
//     name: "Seaborgium",
//     number: 106,
//     group: "Transition metal",
//     period: 7,
//     column: 6,
//     electrons: "2, 8, 18, 32, 32, 12, 2",
//     mass: 269,
//     description: "Seaborgium is a synthetic superheavy element, atomic number 106, named in honor of chemist Glenn T. Seaborg. It is highly radioactive and short-lived (most stable isotope has half-life ~14 minutes). Seaborgium's chemical properties are not fully studied, but as a group 6 element it should behave somewhat like tungsten or molybdenum. It has no practical applications and is produced only in particle accelerators for research.&#8203;:contentReference[oaicite:274]{index=274}",
//     density: ~35,            // g/cm³ (theoretical)
//     meltingPoint: — ,        // unknown
//     boilingPoint: — ,        // unknown
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 1974,
//     discoveredBy: "Lawrence Berkeley Lab (Albert Ghiorso et al.)",  // Berkeley (1974) and Dubna (1974) both reported element 106
//     namedAfter: "Glenn T. Seaborg",
//     electronConfiguration: "[Rn] 5f14 6d4 7s2",  // predicted
//     oxidationStates: "+6, +4, +0 (predicted)",
//     electronShells: [2, 8, 18, 32, 32, 12, 2],
//     color: "(unknown)",
//     appearance: "(no visible quantity)",
//     commonUses: ["none (scientific research only)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#D90045",     // CPK color (magenta red)
//     iconColor: "#D90045",
//     modelColor: "#D90045",
//     modelRadius: 150
//   }, // Seaborgium&#8203;:contentReference[oaicite:275]{index=275}

//   {
//     symbol: "Bh",
//     name: "Bohrium",
//     number: 107,
//     group: "Transition metal",
//     period: 7,
//     column: 7,
//     electrons: "2, 8, 18, 32, 32, 13, 2",
//     mass: 270,
//     description: "Bohrium is a synthetic element with atomic number 107, named after physicist Niels Bohr. It is produced in particle accelerators and is extremely short-lived (half-lives on the order of seconds or shorter). Bohrium falls in group 7, so its chemistry is expected to resemble that of rhenium (its lighter homolog), but only a few atoms have ever been observed, insufficient for detailed chemical studies.&#8203;:contentReference[oaicite:276]{index=276}",
//     density: — ,             // (unknown)
//     meltingPoint: — ,        // 
//     boilingPoint: — ,        // 
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 1981,
//     discoveredBy: "Gesellschaft für Schwerionenforschung (Darmstadt)",  // German team led by Peter Armbruster and Gottfried Münzenberg (1981)
//     namedAfter: "Niels Bohr",
//     electronConfiguration: "[Rn] 5f14 6d5 7s2",  // predicted
//     oxidationStates: "+7, +5, +4, +3 (predicted)",
//     electronShells: [2, 8, 18, 32, 32, 13, 2],
//     color: "(unknown)",
//     appearance: "(no bulk sample)",
//     commonUses: ["none (research only)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#E00038",     // CPK color (red)
//     iconColor: "#E00038",
//     modelColor: "#E00038",
//     modelRadius: 150
//   }, // Bohrium&#8203;:contentReference[oaicite:277]{index=277}

//   {
//     symbol: "Hs",
//     name: "Hassium",
//     number: 108,
//     group: "Transition metal",
//     period: 7,
//     column: 8,
//     electrons: "2, 8, 18, 32, 32, 14, 2",
//     mass: 269,
//     description: "Hassium is a synthetic superheavy element, atomic number 108, named after the German state of Hesse (Latin Hassia). It was first synthesized in 1984 at Darmstadt. Hassium is very short-lived (most stable known isotope has half-life ~16 seconds), and only a few atoms have been produced. It lies in group 8, so it may have chemical similarities to osmium, but experiments are extremely limited. Its use is only in research on element properties.&#8203;:contentReference[oaicite:278]{index=278}",
//     density: — ,             // (unknown, predicted ~40 g/cm3)
//     meltingPoint: — ,        // 
//     boilingPoint: — ,        // 
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 1984,
//     discoveredBy: "Gesellschaft für Schwerionenforschung (Darmstadt)",  // Armbruster/Münzenberg team (1984)
//     namedAfter: "Hassia (Latin for Hesse, Germany)",
//     electronConfiguration: "[Rn] 5f14 6d6 7s2",  // predicted
//     oxidationStates: "+8, +6, +5, +4, +3, +2 (predicted)",
//     electronShells: [2, 8, 18, 32, 32, 14, 2],
//     color: "(unknown)",
//     appearance: "(no visible sample)",
//     commonUses: ["none (research only)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#E6002E",     // CPK color (red)
//     iconColor: "#E6002E",
//     modelColor: "#E6002E",
//     modelRadius: 150
//   }, // Hassium&#8203;:contentReference[oaicite:279]{index=279}

//   {
//     symbol: "Mt",
//     name: "Meitnerium",
//     number: 109,
//     group: "Transition metal",
//     period: 7,
//     column: 9,
//     electrons: "2, 8, 18, 32, 32, 15, 2",
//     mass: 278,
//     description: "Meitnerium is a synthetic element with atomic number 109, named in honor of physicist Lise Meitner. It was first synthesized in 1982 in Darmstadt, Germany. Meitnerium is extremely radioactive and only a few atoms have ever been made (half-life of the most stable known isotope ~7.6 seconds). Its chemical properties are largely unexplored, but as element 109 in group 9, it may behave somewhat like iridium. It has no applications outside research.&#8203;:contentReference[oaicite:280]{index=280}",
//     density: — ,             // (unknown)
//     meltingPoint: — ,        // 
//     boilingPoint: — ,        // 
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 1982,
//     discoveredBy: "Gesellschaft für Schwerionenforschung (Darmstadt)",  // Hofmann et al. (1982)
//     namedAfter: "Lise Meitner",
//     electronConfiguration: "[Rn] 5f14 6d7 7s2",  // predicted
//     oxidationStates: "(predicted +1, +3, +6?)",
//     electronShells: [2, 8, 18, 32, 32, 15, 2],
//     color: "(unknown)",
//     appearance: "(not observed macroscopically)",
//     commonUses: ["none (research only)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#EB0026",     // CPK color (red)
//     iconColor: "#EB0026",
//     modelColor: "#EB0026",
//     modelRadius: 150
//   }, // Meitnerium&#8203;:contentReference[oaicite:281]{index=281}

//   {
//     symbol: "Ds",
//     name: "Darmstadtium",
//     number: 110,
//     group: "Transition metal",
//     period: 7,
//     column: 10,
//     electrons: "2, 8, 18, 32, 32, 16, 2",
//     mass: 281,
//     description: "Darmstadtium is a synthetic superheavy element, atomic number 110, named after Darmstadt, Germany (where it was discovered in 1994). It is highly unstable; the most stable isotopes have half-lives on the order of milliseconds. As a group 10 element, it would theoretically behave similarly to platinum or palladium, but its extremely short existence precludes chemical investigation. It has no practical use beyond fundamental research.&#8203;:contentReference[oaicite:282]{index=282}",
//     density: — ,             // (unknown)
//     meltingPoint: — ,        // 
//     boilingPoint: — ,        // 
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 1994,
//     discoveredBy: "GSI Helmholtz Centre (Darmstadt)",  // Hofmann et al. (1994)
//     namedAfter: "Darmstadt, Germany",
//     electronConfiguration: "[Rn] 5f14 6d8 7s2",  // predicted
//     oxidationStates: "(predicted +8, +6, +4, +2, 0?)",
//     electronShells: [2, 8, 18, 32, 32, 16, 2],
//     color: "(unknown)",
//     appearance: "(no bulk quantity)",
//     commonUses: ["none (research only)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#EB0026",     // CPK color (same as Mt, bright red)
//     iconColor: "#EB0026",
//     modelColor: "#EB0026",
//     modelRadius: 150
//   }, // Darmstadtium&#8203;:contentReference[oaicite:283]{index=283}

//   {
//     symbol: "Rg",
//     name: "Roentgenium",
//     number: 111,
//     group: "Transition metal",
//     period: 7,
//     column: 11,
//     electrons: "2, 8, 18, 32, 32, 17, 2",
//     mass: 282,
//     description: "Roentgenium is a synthetic element with atomic number 111, named after Wilhelm Conrad Röntgen (discoverer of X-rays). It was first synthesized in 1994 in Darmstadt. Roentgenium atoms are extremely short-lived (half-life ~1.6 ms for Rg-282). As a period 7 coinage metal (group 11), it may have properties analogous to gold, but no chemistry has been observed due to the few atoms produced. It is only used for experimental purposes in physics.&#8203;:contentReference[oaicite:284]{index=284}",
//     density: — ,             // (unknown)
//     meltingPoint: — ,        // 
//     boilingPoint: — ,        // 
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 1994,
//     discoveredBy: "GSI Helmholtz Centre (Darmstadt)",  // Hofmann et al. (1994)
//     namedAfter: "Wilhelm Conrad Röntgen",
//     electronConfiguration: "[Rn] 5f14 6d9 7s2",  // predicted
//     oxidationStates: "(predicted +3, +1?)",
//     electronShells: [2, 8, 18, 32, 32, 17, 2],
//     color: "(unknown)",
//     appearance: "(no observable amount)",
//     commonUses: ["none (scientific research only)"],
//     phase: "solid",
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#EB0026",     // CPK color (red)
//     iconColor: "#EB0026",
//     modelColor: "#EB0026",
//     modelRadius: 150
//   }, // Roentgenium&#8203;:contentReference[oaicite:285]{index=285}

//   {
//     symbol: "Cn",
//     name: "Copernicium",
//     number: 112,
//     group: "Transition metal",
//     period: 7,
//     column: 12,
//     electrons: "2, 8, 18, 32, 32, 18, 2",
//     mass: 285,
//     description: "Copernicium is a synthetic superheavy element, atomic number 112, named after Nicolaus Copernicus. Discovered in 1996 (officially confirmed in 2009) in Darmstadt, it is extremely short-lived (the longest-lived isotope has a half-life ~30 seconds). It is in group 12, so it may behave like a very heavy mercury or cadmium, possibly being a volatile metal. Only a few atoms have been produced for basic research.&#8203;:contentReference[oaicite:286]{index=286}",
//     density: ~14,            // g/cm³ (predicted in solid state, but may be gas at STP if it has very low boiling point)
//     meltingPoint: — ,        // unknown
//     boilingPoint: ~357,      // K (theorized to be gas at STP like Hg due to relativistic effects)
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 1996,
//     discoveredBy: "GSI Helmholtz Centre (Darmstadt)",  // Hofmann et al. (1996)
//     namedAfter: "Nicolaus Copernicus",
//     electronConfiguration: "[Rn] 5f14 6d10 7s2",  // predicted closed-shell d10 configuration
//     oxidationStates: "(predicted +2, +4, 0?)",
//     electronShells: [2, 8, 18, 32, 32, 18, 2],
//     color: "(unknown)",
//     appearance: "(not observed; possibly metallic silvery)",
//     commonUses: ["none (research only)"],
//     phase: "gas",  // predicted to be gas at STP (boiling point possibly around 84 °C)&#8203;:contentReference[oaicite:287]{index=287}
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#EB0026",     // CPK color (red)
//     iconColor: "#EB0026",
//     modelColor: "#EB0026",
//     modelRadius: 150
//   }, // Copernicium&#8203;:contentReference[oaicite:288]{index=288}

//   {
//     symbol: "Nh",
//     name: "Nihonium",
//     number: 113,
//     group: "Post-transition metal",
//     period: 7,
//     column: 13,
//     electrons: "2, 8, 18, 32, 32, 18, 3",
//     mass: 286,
//     description: "Nihonium is a synthetic element with atomic number 113, named after Japan (Nihon meaning Japan). First reported in 2003 by RIKEN in Japan and confirmed in later experiments, it is very short-lived (half-life of the longest isotope ~20 seconds). Nihonium is in group 13, so it could show some similarities to thallium or indium in chemistry, though experimental confirmation is lacking. It has no practical applications; it’s created for research on superheavy elements.",
//     density: — ,             // (unknown)
//     meltingPoint: — ,        // 
//     boilingPoint: — ,        // 
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 2003,
//     discoveredBy: "RIKEN (Japan)",  // Morita et al. (2004) with later confirmation
//     namedAfter: "Nihon (Japan, in Japanese)",
//     electronConfiguration: "[Rn] 5f14 6d10 7s2 7p1",  // predicted
//     oxidationStates: "(predicted +3, +1)",
//     electronShells: [2, 8, 18, 32, 32, 18, 3],
//     color: "(unknown)",
//     appearance: "(no visible quantities)",
//     commonUses: ["none (research only)"],
//     phase: "solid",  // predicted to be solid at STP (metallic)
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#D10000",     // CPK color (red)
//     iconColor: "#D10000",
//     modelColor: "#D10000",
//     modelRadius: 170
//   }, // Nihonium

//   {
//     symbol: "Fl",
//     name: "Flerovium",
//     number: 114,
//     group: "Post-transition metal",
//     period: 7,
//     column: 14,
//     electrons: "2, 8, 18, 32, 32, 18, 4",
//     mass: 289,
//     description: "Flerovium is a synthetic superheavy element, atomic number 114, named after the Flerov Laboratory of Nuclear Reactions in Dubna, Russia. Discovered in 1998, it has very short half-lives (the longest ~2 seconds). As a group 14 element, theoretical calculations predict it might have some noble-gas-like properties due to relativistic effects (possibly being unusually volatile for a metal). Its chemistry is largely untested. It has no uses beyond scientific investigation.",
//     density: ~14,            // g/cm³ (speculative)
//     meltingPoint: — ,        // (unknown)
//     boilingPoint: — ,        // (unknown, might be low if it's volatile)
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 1998,
//     discoveredBy: "JINR (Dubna) & Lawrence Livermore National Lab",  // joint discovery (1998-1999)
//     namedAfter: "Flerov Laboratory (Georgy Flerov)",
//     electronConfiguration: "[Rn] 5f14 6d10 7s2 7p2",  // predicted
//     oxidationStates: "(predicted +2, +4)",
//     electronShells: [2, 8, 18, 32, 32, 18, 4],
//     color: "(unknown)",
//     appearance: "(no bulk sample)",
//     commonUses: ["none (research only)"],
//     phase: "solid",  // likely solid (some predict maybe gas due to closed shells, but more likely a volatile metal)
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#CC0059",     // CPK color (magenta/red)
//     iconColor: "#CC0059",
//     modelColor: "#CC0059",
//     modelRadius: 160
//   }, // Flerovium

//   {
//     symbol: "Mc",
//     name: "Moscovium",
//     number: 115,
//     group: "Post-transition metal",
//     period: 7,
//     column: 15,
//     electrons: "2, 8, 18, 32, 32, 18, 5",
//     mass: 290,
//     description: "Moscovium is a synthetic element with atomic number 115, named after Moscow oblast (home of Dubna). First made in 2003 by a joint Russian-American team, it is very unstable (half-life ~0.6 s for its most stable isotope). Moscovium is in group 15, so it might have some properties akin to bismuth or antimony, but its extreme radioactivity prevents practical characterization. It is produced in tiny amounts for experiments on superheavy nuclei.",
//     density: ~13.5,          // g/cm³ (theoretical)
//     meltingPoint: — ,
//     boilingPoint: — ,
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 2003,
//     discoveredBy: "JINR (Dubna) & Lawrence Livermore National Lab",  // (2003)
//     namedAfter: "Moscow (Moscovia)",
//     electronConfiguration: "[Rn] 5f14 6d10 7s2 7p3",  // predicted
//     oxidationStates: "(predicted +1, +3)",
//     electronShells: [2, 8, 18, 32, 32, 18, 5],
//     color: "(unknown)",
//     appearance: "(unknown, probably metallic)",
//     commonUses: ["none (research only)"],
//     phase: "solid",  // presumably solid
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#CC0059",     // CPK color (magenta/red)
//     iconColor: "#CC0059",
//     modelColor: "#CC0059",
//     modelRadius: 160
//   }, // Moscovium

//   {
//     symbol: "Lv",
//     name: "Livermorium",
//     number: 116,
//     group: "Post-transition metal",
//     period: 7,
//     column: 16,
//     electrons: "2, 8, 18, 32, 32, 18, 6",
//     mass: 293,
//     description: "Livermorium is a synthetic superheavy element, atomic number 116, named after Lawrence Livermore National Laboratory in California (co-discoverer). It was first synthesized in 2000 at Dubna. Livermorium is highly radioactive with a very short half-life (~0.06 s). As a group 16 element, it may behave somewhat like polonium, but no chemical experiments have been possible. It has no practical uses, being produced only to study heavy element properties.",
//     density: ~12.9,          // g/cm³ (predicted)
//     meltingPoint: — ,
//     boilingPoint: — ,
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 2000,
//     discoveredBy: "JINR (Dubna) & Lawrence Livermore National Lab",  // (2000)
//     namedAfter: "Lawrence Livermore (National Lab)",
//     electronConfiguration: "[Rn] 5f14 6d10 7s2 7p4",  // predicted
//     oxidationStates: "(predicted +2, +4)",
//     electronShells: [2, 8, 18, 32, 32, 18, 6],
//     color: "(unknown)",
//     appearance: "(unknown, presumably metallic)",
//     commonUses: ["none (research only)"],
//     phase: "solid",  // likely solid
//     radioactive: true,
//     natural: false,
//     metal: "metal",
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#CC0059",     // CPK color (magenta/red)
//     iconColor: "#CC0059",
//     modelColor: "#CC0059",
//     modelRadius: 160
//   }, // Livermorium

//   {
//     symbol: "Ts",
//     name: "Tennessine",
//     number: 117,
//     group: "Halogen",
//     period: 7,
//     column: 17,
//     electrons: "2, 8, 18, 32, 32, 18, 7",
//     mass: 294,
//     description: "Tennessine is a synthetic element with atomic number 117, named after the state of Tennessee. It was first reported in 2010 through a Russia-U.S. collaboration (Dubna and Oak Ridge). Tennessine is highly radioactive and short-lived (half-life ~ tens of milliseconds). As the heaviest halogen, it might show unusual properties due to relativistic effects, possibly behaving more metallic than lighter halogens. Its chemistry has not been studied; it's only created for nuclear research.",
//     density: — ,             // (unknown)
//     meltingPoint: — ,
//     boilingPoint: — ,
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 2010,
//     discoveredBy: "JINR (Dubna) & ORNL/Oak Ridge",  // (2010)
//     namedAfter: "Tennessee (U.S. state)",
//     electronConfiguration: "[Rn] 5f14 6d10 7s2 7p5",  // predicted
//     oxidationStates: "(predicted -1, +1, +3, +5)",
//     electronShells: [2, 8, 18, 32, 32, 18, 7],
//     color: "(unknown)",
//     appearance: "(unknown, likely dark solid or metallic)",
//     commonUses: ["none (research only)"],
//     phase: "solid",  // presumably solid (though might have low boiling like halogens)
//     radioactive: true,
//     natural: false,
//     metal: "metalloid",  // possibly metalloid or post-transition behavior (prediction)
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#CC0059",     // CPK color (magenta/red)
//     iconColor: "#CC0059",
//     modelColor: "#CC0059",
//     modelRadius: 150
//   }, // Tennessine

//   {
//     symbol: "Og",
//     name: "Oganesson",
//     number: 118,
//     group: "Noble gas",
//     period: 7,
//     column: 18,
//     electrons: "2, 8, 18, 32, 32, 18, 8",
//     mass: 294,
//     description: "Oganesson is a synthetic element with atomic number 118, named after Yuri Oganessian, a pioneer in superheavy element research. It was first synthesized in 2002 at Dubna (confirmed 2006). Oganesson is highly unstable (most likely half-life ~ milliseconds) and is the heaviest element in the periodic table as of today. While it is placed in the noble gases (group 18), calculations suggest it may not behave like a traditional noble gas due to strong relativistic effects, possibly being more reactive or even solid. Its properties remain largely unknown and purely theoretical.&#8203;:contentReference[oaicite:289]{index=289}",
//     density: — ,             // (unknown, predicted ~5 g/L if gas, or ~7 g/cm3 if solid)
//     meltingPoint: — ,
//     boilingPoint: — ,
//     atomicRadius: — ,
//     electronegativity: — ,
//     discoveryYear: 2002,
//     discoveredBy: "JINR (Dubna) & Lawrence Livermore National Lab",  // (2002, confirmed 2006)
//     namedAfter: "Yuri Oganessian",
//     electronConfiguration: "[Rn] 5f14 6d10 7s2 7p6",  // predicted closed shell
//     oxidationStates: "(predicted 0, +2, +4?)",
//     electronShells: [2, 8, 18, 32, 32, 18, 8],
//     color: "(unknown)",
//     appearance: "(unknown, possibly colorless gas or metallic solid)",
//     commonUses: ["none (research only)"],
//     phase: "unknown",  // possibly gas at STP (but expected to be very unstable and maybe solidify instantly)
//     radioactive: true,
//     natural: false,
//     metal: "nonmetal",  // in periodic placement it's a noble gas (nonmetal), though behavior may not be inert
//     abundanceCrust: 0,
//     abundanceUniverse: 0,
//     cpkColor: "#CC0059",     // CPK color (magenta/red)
//     iconColor: "#CC0059",
//     modelColor: "#CC0059",
//     modelRadius: 140
//   }  // Oganesson&#8203;:contentReference[oaicite:290]{index=290}
// ];
