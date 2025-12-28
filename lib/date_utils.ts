
/**
 * Parses a date string (YYYY-MM-DD) and a time string (e.g., "3:30 PM" or "15:30")
 * into a single Date object.
 */
export function parseDateTime(dateStr: string, timeStr: string): Date {
    // Expected format for dateStr: YYYY-MM-DD
    // Expected format for timeStr: "HH:mm" or "h:mm A" (e.g., "3:30 PM")

    const [year, month, day] = dateStr.split("-").map(Number);
    
    let hours = 0;
    let minutes = 0;

    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    
    if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3];

        if (ampm) {
            if (ampm.toUpperCase() === "PM" && hours < 12) {
                hours += 12;
            } else if (ampm.toUpperCase() === "AM" && hours === 12) {
                hours = 0;
            }
        }
    }

    // Create date in UTC to match the ":00Z" intention in the original code
    // However, usually these inputs are local. The original code was appending "Z"
    // which forced them to UTC. We'll maintain that "forced UTC" behavior for consistency 
    // unless we find evidence it should be local. 
    // Given the previous code used `body.date + "T" + body.time + ":00Z"`, it was treating 
    // the local-looking time as UTC.
    
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
}
