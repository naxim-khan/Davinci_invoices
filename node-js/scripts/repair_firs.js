const fs = require('fs');
const path = require('path');

// Configuration map from create_fir_json.py
const FIR_INFO = {
    162: { "COUNTRY": "Kuwait", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Kuwait FIR" },
    343: { "COUNTRY": "Bahrain", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Bahrain FIR" },
    3431: { "COUNTRY": "Bahrain", "LOWER_FT": 24000, "UPPER_FT": 60000, "NOM_COMP": "Bahrain FIR (Qatar Upper)" },
    141: { "COUNTRY": "Indonesia", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Jakarta FIR" },
    281: { "COUNTRY": "Indonesia", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Ujung Pandang FIR" },
    227: { "COUNTRY": "Cambodia", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Phnom Penh FIR" },
    107: { "COUNTRY": "Syria", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Damascus FIR" },
    144: { "COUNTRY": "Afghanistan", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Kabul FIR" },
    160: { "COUNTRY": "Malaysia", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Kuala Lumpur FIR" },
    158: { "COUNTRY": "Malaysia", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Kota Kinabalu FIR" },
    294: { "COUNTRY": "Myanmar", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Yangon FIR" },
    325: { "COUNTRY": "Sri Lanka", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Colombo Upper FIR" },
    102: { "COUNTRY": "Sri Lanka", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Colombo Lower FIR" },
    185: { "COUNTRY": "Philippines", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Manila FIR" },
    285: { "COUNTRY": "Laos", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Vientiane FIR" },
    277: { "COUNTRY": "Libya", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Tripoli FIR" },
    13: { "COUNTRY": "DRC", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Kinshasa FIR" },
    3: { "COUNTRY": "Malawi", "LOWER_FT": 0, "UPPER_FT": 60000, "NOM_COMP": "Lilongwe FIR" },
};

const GEOJSON_PATH = path.join(__dirname, '../../davinci-stream/combined_firs.geojson');

if (!fs.existsSync(GEOJSON_PATH)) {
    console.error(`File not found: ${GEOJSON_PATH}`);
    process.exit(1);
}

try {
    console.log(`Reading ${GEOJSON_PATH}...`);
    const rawData = fs.readFileSync(GEOJSON_PATH, 'utf-8');
    const geojson = JSON.parse(rawData);

    if (!geojson.features || !Array.isArray(geojson.features)) {
        console.error('Invalid GeoJSON structure: missing features array');
        process.exit(1);
    }

    let modifiedCount = 0;

    geojson.features.forEach(feature => {
        const id = feature.id;
        if (id && FIR_INFO[id]) {
            // Found a matching FIR
            if (!feature.properties) {
                feature.properties = {};
            }

            // Inject properties
            const info = FIR_INFO[id];
            Object.assign(feature.properties, info);

            // If NOM_COMP is missing in FIR_INFO but we have country, generate one
            if (!feature.properties.NOM_COMP) {
                feature.properties.NOM_COMP = `${info.COUNTRY} FIR`
            }

            modifiedCount++;
        }
    });

    console.log(`Modified ${modifiedCount} features.`);

    if (modifiedCount > 0) {
        console.log(`Writing back to ${GEOJSON_PATH}...`);
        fs.writeFileSync(GEOJSON_PATH, JSON.stringify(geojson, null, 2), 'utf-8');
        console.log('Success!');
    } else {
        console.log('No matches found. Check if IDs in combined_firs.geojson match FIR_INFO keys.');
    }

} catch (err) {
    console.error('Error processing file:', err);
    process.exit(1);
}
