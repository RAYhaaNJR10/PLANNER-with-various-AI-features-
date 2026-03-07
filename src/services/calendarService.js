export const exportTasksToGoogleCalendar = async (tasks, accessToken) => {
    if (!accessToken) {
        throw new Error('Google Calendar access token is missing. Please sign in again.');
    }

    const exportedCount = { success: 0, failed: 0 };

    for (const task of tasks) {
        // Skip completed tasks or those missing a date
        if (task.completed || !task.date) continue;

        const event = {
            summary: task.title,
            description: task.description || 'Exported from Study Planner',
            start: {
                date: task.date,
            },
            end: {
                date: task.date,
            },
            colorId: '9' // Blueberry color
        };

        try {
            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });

            if (response.ok) {
                exportedCount.success++;
            } else {
                exportedCount.failed++;
                console.error('Failed to export task:', await response.text());
            }
        } catch (error) {
            console.error('Network error during export:', error);
            exportedCount.failed++;
        }
    }

    return exportedCount;
};
