const { Client } = require('./src/models');
const clientService = require('./src/features/Client/client.service');

async function verifyReminderFiltering() {
    try {
        console.log('--- Starting Reminder Filtering Verification ---');

        // 1. Setup - Find or create a test client
        const [client] = await Client.findOrCreate({
            where: { email: 'reminder_test@example.com' },
            defaults: {
                name: 'Reminder Test Client',
                tenant_id: 1, // Assuming tenant 1 exists
                is_complete_registration: true,
                is_active: true,
                reminders: []
            }
        });

        console.log(`Using test client: ${client.name} (ID: ${client.id})`);

        // 2. Add reminders for different units
        const reminders = [
            { id: 101, subject: 'Unit 1 Reminder', text: 'Text 1', date: new Date().toISOString(), completed: false, unitId: 1 },
            { id: 102, subject: 'Unit 2 Reminder', text: 'Text 2', date: new Date().toISOString(), completed: false, unitId: 2 },
            { id: 103, subject: 'No Unit Reminder', text: 'Text 3', date: new Date().toISOString(), completed: false }
        ];

        await client.update({ reminders });
        console.log('Test reminders added to client.');

        // 3. Test filtering by Unit 1
        console.log('\nTesting Filter: Unit 1');
        const unit1Reminders = await clientService.getActiveReminders(1, 1);
        const u1Client = unit1Reminders.find(c => c.id === client.id);

        if (u1Client) {
            console.log(`Found client in Unit 1 results. Reminders count: ${u1Client.reminders.length}`);
            const hasCorrectReminders = u1Client.reminders.every(r => !r.unitId || r.unitId === 1);
            const hasU2 = u1Client.reminders.some(r => r.unitId === 2);

            console.log(`- Only Unit 1 or No Unit reminders: ${hasCorrectReminders}`);
            console.log(`- Contains Unit 2 reminder: ${hasU2}`);

            if (hasCorrectReminders && !hasU2) {
                console.log('✅ Unit 1 filtering PASSED');
            } else {
                console.log('❌ Unit 1 filtering FAILED');
            }
        } else {
            console.log('❌ Client not found in Unit 1 results');
        }

        // 4. Test filtering by Unit 2
        console.log('\nTesting Filter: Unit 2');
        const unit2Reminders = await clientService.getActiveReminders(1, 2);
        const u2Client = unit2Reminders.find(c => c.id === client.id);

        if (u2Client) {
            console.log(`Found client in Unit 2 results. Reminders count: ${u2Client.reminders.length}`);
            const hasCorrectReminders = u2Client.reminders.every(r => !r.unitId || r.unitId === 2);
            const hasU1 = u2Client.reminders.some(r => r.unitId === 1);

            console.log(`- Only Unit 2 or No Unit reminders: ${hasCorrectReminders}`);
            console.log(`- Contains Unit 1 reminder: ${hasU1}`);

            if (hasCorrectReminders && !hasU1) {
                console.log('✅ Unit 2 filtering PASSED');
            } else {
                console.log('❌ Unit 2 filtering FAILED');
            }
        } else {
            console.log('❌ Client not found in Unit 2 results');
        }

        // 5. Cleanup (optional)
        // await client.destroy();
        // console.log('\nTest client cleaned up.');

        console.log('\n--- Verification Complete ---');
        process.exit(0);
    } catch (error) {
        console.error('Verification failed with error:', error);
        process.exit(1);
    }
}

verifyReminderFiltering();
