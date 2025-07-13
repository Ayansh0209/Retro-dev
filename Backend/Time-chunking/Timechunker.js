

/**
 * Chunk notifications by time (e.g., 2hr blocks)
 * @param {Array} notifications - GitHub notifications
 * @param {number} intervalMinutes - e.g. 120 for 2 hours
 * @returns {Object} - Chunked notifications by time range
 */
function chunkNotificationsByTime(notifications, intervalMinutes = 180) {
  const chunks = {};

  for (const notif of notifications) {
    const updatedAt = new Date(notif.updated_at);
    const hour = updatedAt.getHours();
    const start = Math.floor(hour / (intervalMinutes / 60)) * (intervalMinutes / 60);
    const end = start + (intervalMinutes / 60);

    const format = (h) => `${(h % 12 || 12)}${h < 12 ? 'am' : 'pm'}`;
    const label = `🕒 ${format(start)} – ${format(end)}`;

    if (!chunks[label]) chunks[label] = [];
    chunks[label].push(notif);
  }

  return chunks;
}

/**
 * Filter only high-priority notifications.
 * You can improve this to support labels, repos, types, etc.
 * @param {Array} notifications
 * @returns {Array} filtered
 */
function filterPriorityNotifications(notifications) {
  return notifications.filter(n => {
    const title = n.subject?.title?.toLowerCase() || '';
    return title.includes('urgent') || title.includes('review') || title.includes('critical');
  });
}

module.exports = {
  chunkNotificationsByTime,
  filterPriorityNotifications
};
