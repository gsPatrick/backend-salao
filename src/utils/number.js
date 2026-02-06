/**
 * Parses a monetary value from string (with comma or dot) to float.
 * @param {string|number} value - The value to parse.
 * @returns {number} The parsed float value.
 */
const parseMonetaryValue = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;

    // Replace comma with dot and remove unneeded characters
    // This simple regex handles standard cases: "1.234,56" -> "1234.56" or "1234,56" -> "1234.56"
    // However, a simple replace ',' with '.' assumes the user isn't using dots for thousands.
    // Given the Brazilian context, "1.000,00" is common. 
    // Standard approach for mixed input safety:
    // 1. Convert to string
    // 2. Remove all '.', assume they are thousand separators IF there is also a comma later?
    // Actually, safest generic approach for "R$ 1.200,50" or "1200.50":

    const strVal = String(value).trim();

    // Check if it has comma as decimal separator
    if (strVal.includes(',')) {
        // If it looks like Brazilian format (dots for thousands, comma for decimal)
        // Remove dots, replace comma with dot.
        // E.g. 1.200,50 -> 1200.50
        // E.g. 1200,50 -> 1200.50
        // E.g. 1,50 -> 1.50

        // Remove dots used as thousand separators
        const cleanStr = strVal.replace(/\./g, '').replace(',', '.');
        return parseFloat(cleanStr);
    }

    // If no comma, assume dot is decimal separator or just integer
    return parseFloat(strVal);
};

module.exports = {
    parseMonetaryValue
};
