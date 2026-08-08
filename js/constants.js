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
    "Texture": ["Smooth","Silky","Juicy","Creamy","Coating","Sticky","Astringent","Rough","Puckering","Dryness"],
    "Body":    ["Light","Medium","Heavy","Thin","Watery"],
    "Other":   ["Complex","Balanced","Delicate"]
};

/* ═══════════════════════════════════════════════════
   Chart series — one entry per data type.
   Colour identifies the dataset; line style identifies the type.
   `field` is the dataset property, `option` the checkbox id,
   `axis` the Chart.js scale id, `axisLabel` the unit this type contributes to
   that axis's title (types sharing a unit collapse to one label).
═══════════════════════════════════════════════════ */
const SERIES_TYPES = {
    weight:      { field: 'weight',      label: 'Weight-W', zh: '總注水量', option: 'showWeight',       axis: 'y',      axisLabel: 'Weight (g)',  dash: [],           width: 2.5, fill: false },
    adc1:        { field: 'adc1',        label: 'Weight-C', zh: '咖啡液量', option: 'showAdc1',         axis: 'y',      axisLabel: 'Weight (g)',  dash: [6, 3],       width: 2,   fill: true  },
    adc2:        { field: 'adc2',        label: 'Weight-D', zh: '濾杯水量', option: 'showAdc2',         axis: 'y',      axisLabel: 'Weight (g)',  dash: [2, 3],       width: 2,   fill: true  },
    flow:        { field: 'flow',        label: 'Flow-W',   zh: '注水速度', option: 'showFlow',         axis: 'y',      axisLabel: 'Flow (g/s)',  dash: [],           width: 1.5, fill: false },
    bflow:       { field: 'bflow',       label: 'Flow-C',   zh: '濾出速度', option: 'showBrewFlow',     axis: 'y',      axisLabel: 'Flow (g/s)',  dash: [6, 3],       width: 1.5, fill: false },
    temp:        { field: 'temp',        label: 'Temp1',    zh: '溫度1',   option: 'showTemp',         axis: 'yRight', axisLabel: 'Temp (℃)',    dash: [10, 4],      width: 1.5, fill: false },
    thermometer: { field: 'thermometer', label: 'Temp2',    zh: '溫度2',   option: 'showThermometer',  axis: 'yRight', axisLabel: 'Temp (℃)',    dash: [2, 2],       width: 2,   fill: false },
    ec:          { field: 'ec',          label: 'TDS',      zh: '實測濃度', option: 'showEC',           axis: 'y',      axisLabel: 'TDS',         dash: [9, 3, 2, 3], width: 2,   fill: false },
    tdsPrediction:{ field: null,          label: 'TDS-P',    zh: '整杯混合濃度',option:'showTDSPrediction',axis: 'y',     axisLabel: 'TDS',         dash: [],           width: 2.5, fill: false },
};

// Temperature always reads on a fixed 0–90℃ scale, so the same curve sits at
// the same height no matter which brews are on screen. Readings above max are
// clipped, not rescaled — raise this if a probe can run hotter.
const TEMP_AXIS_RANGE = { min: 0, max: 90 };

// Draw order per chart (earlier entries render underneath)
const WEIGHT_CHART_SERIES = ['adc1', 'adc2', 'weight'];
const FLOW_CHART_SERIES   = ['flow', 'bflow', 'ec', 'tdsPrediction', 'temp', 'thermometer'];

// Share of the plot height the curves should occupy after auto-fitting
const AXIS_FILL_RATIO = 0.9;

const AFFECTIVE_SECTIONS = ['fragrance','aroma','flavor','aftertaste','acidity','sweetness','mouthfeel','overall'];

const CVA_DESCRIPTIVE_SECTIONS = ['fragrance','flavor','aftertaste','acidity','sweetness','mouthfeel'];
