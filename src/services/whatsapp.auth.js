const { BufferJSON, initAuthCreds } = require('@whiskeysockets/baileys');

/**
 * Custom Auth State for Baileys using PostgreSQL (via Sequelize)
 * @param {string} tenantId - The tenant ID
 * @returns {object} { state, saveCreds }
 */
const usePostgresAuthState = async (tenantId) => {
    const { WhatsAppSession } = require('../models');

    // 1. Helper to read data from DB
    const readData = async (type) => {
        try {
            const data = await WhatsAppSession.findOne({
                where: { tenant_id: tenantId, key: type }
            });
            return data ? JSON.parse(data.value, BufferJSON.reviver) : null;
        } catch (error) {
            console.error(`[DB Auth] Error reading ${type}:`, error);
            return null;
        }
    };

    // 2. Helper to write data to DB
    const writeData = async (type, data) => {
        try {
            const value = JSON.stringify(data, BufferJSON.replacer);
            // Upsert (Insert or Update)
            await WhatsAppSession.upsert({
                tenant_id: tenantId,
                key: type,
                value: value
            });
        } catch (error) {
            console.error(`[DB Auth] Error writing ${type}:`, error);
        }
    };

    // 3. Helper to remove data
    const removeData = async (type) => {
        try {
            await WhatsAppSession.destroy({
                where: { tenant_id: tenantId, key: type }
            });
        } catch (error) {
            console.error(`[DB Auth] Error removing ${type}:`, error);
        }
    };

    // 4. Initialize credentials
    const creds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = BufferJSON.reviver(null, value);
                            }
                            if (value) data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(key, value));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                },
            },
        },
        saveCreds: async () => {
            await writeData('creds', creds);
        },
    };
};

module.exports = { usePostgresAuthState };
