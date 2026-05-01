/* ═══════════════════════════════════════════════════
   CONSTANTS — Static reference data for Coffee Force Campus
   No DOM dependency. Safe to import in unit tests.
═══════════════════════════════════════════════════ */

const DATASET_COLORS = [
    '#1976D2','#388E3C','#D32F2F','#7B1FA2',
    '#F57C00','#0097A7','#C2185B','#5D4037',
    '#455A64','#00796B','#303F9F','#E64A19'
];

const SCA_DATA = {
    "Fruity": {
        "Berry":        ["Blackberry","Raspberry","Blueberry","Strawberry"],
        "Dried Fruit":  ["Raisin","Prune"],
        "Citrus Fruit": ["Grapefruit","Orange","Lemon","Lime"]
    },
    "Floral": {
        "Floral": ["Chamomile","Rose","Jasmine"],
        "Tea":    ["Black Tea"]
    },
    "Sweet": {
        "Sweet Aromatics": [],
        "Vanilla":         [],
        "Brown Sugar":     ["Molasses","Maple Syrup","Caramel","Honey"]
    },
    "Nutty/Cocoa": {
        "Nutty": ["Peanuts","Hazelnut","Almond"],
        "Cocoa": ["Chocolate","Dark Chocolate"]
    },
    "Roasted": {
        "Cereal": ["Malt"],
        "Burnt":  ["Acrid","Ashy","Smoky"]
    },
    "Spices": {
        "Brown Spice": ["Clove","Cinnamon","Nutmeg"],
        "Pepper":      [],
        "Pungent":     []
    }
};

const CATA_DATA = {
    "Floral":           ["Floral","Chamomile","Rose","Jasmine"],
    "Fruity":           ["Fruity","Berry","Dried Fruit","Citrus Fruit","Other Fruit"],
    "Sour/Fermented":   ["Sour/Fermented","Sour","Alcoholic/Fermented"],
    "Green/Vegetative": ["Green/Veg","Olive Oil","Raw","Beany"],
    "Roasted":          ["Roasted","Pipe Tobacco","Tobacco","Burnt","Cereal"],
    "Spice":            ["Pungent","Pepper","Brown Spice"],
    "Nutty/Cocoa":      ["Nutty","Cocoa"],
    "Sweet":            ["Brown Sugar","Vanilla","Vanillin","Overall Sweet"],
    "Other":            ["Chemical","Papery","Musty/Earthy","Woody"]
};

const MOUTHFEEL_DATA = {
    "Texture": ["Smooth","Silky","Juicy","Creamy","Coating","Sticky","Astringent","Rough","Puckering"],
    "Body":    ["Light","Medium","Heavy","Thin","Watery"],
    "Other":   ["Complex","Balanced","Delicate"]
};

const AFFECTIVE_SECTIONS = ['fragrance','aroma','flavor','aftertaste','acidity','sweetness','mouthfeel','overall'];

const CVA_DESCRIPTIVE_SECTIONS = ['fragrance','flavor','aftertaste','acidity','sweetness','mouthfeel'];
