function parseTimeToMinutes(value) {
  if (typeof value === "number") {
    return value;
  }

  const input = String(value || "").trim();

  if (!input) {
    return null;
  }

  const twentyFourHour = input.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHour) {
    const hours = Number(twentyFourHour[1]);
    const minutes = Number(twentyFourHour[2]);
    return hours * 60 + minutes;
  }

  const meridiem = input.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);

  if (meridiem) {
    let hours = Number(meridiem[1]);
    const minutes = Number(meridiem[2] || 0);
    const period = meridiem[3].toLowerCase();

    if (period === "pm" && hours !== 12) {
      hours += 12;
    }

    if (period === "am" && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  }

  return null;
}

function minutesToClockLabel(totalMinutes) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function minutesToReadableLabel(totalMinutes) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours24 = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function normalizeMeetings(meetings) {
  return (meetings || [])
    .map((meeting, index) => {
      const startMinutes = parseTimeToMinutes(meeting.startTime);
      const endMinutes = parseTimeToMinutes(meeting.endTime);

      if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
        return null;
      }

      return {
        id: meeting.id || `meeting-${index + 1}`,
        title: meeting.title || `Meeting ${index + 1}`,
        locationName: meeting.locationName || "",
        note: meeting.note || "",
        startTime: minutesToClockLabel(startMinutes),
        endTime: minutesToClockLabel(endMinutes),
        startLabel: minutesToReadableLabel(startMinutes),
        endLabel: minutesToReadableLabel(endMinutes),
        durationMinutes: endMinutes - startMinutes,
      };
    })
    .filter(Boolean)
    .sort((left, right) => parseTimeToMinutes(left.startTime) - parseTimeToMinutes(right.startTime));
}

function buildFreeSlots(meetings, { dayStart = "08:00", dayEnd = "21:00" } = {}) {
  const normalizedMeetings = normalizeMeetings(meetings);
  const startMinutes = parseTimeToMinutes(dayStart);
  const endMinutes = parseTimeToMinutes(dayEnd);
  const slots = [];
  let cursor = startMinutes;

  normalizedMeetings.forEach((meeting, index) => {
    const meetingStart = parseTimeToMinutes(meeting.startTime);
    const meetingEnd = parseTimeToMinutes(meeting.endTime);

    if (meetingStart > cursor) {
      slots.push({
        startMinutes: cursor,
        endMinutes: meetingStart,
        slotType: index === 0 ? "before-first-meeting" : "between-meetings",
        previousMeeting: index > 0 ? normalizedMeetings[index - 1] : null,
        nextMeeting: meeting,
      });
    }

    cursor = Math.max(cursor, meetingEnd);
  });

  if (cursor < endMinutes) {
    slots.push({
      startMinutes: cursor,
      endMinutes,
      slotType: normalizedMeetings.length ? "after-last-meeting" : "open-day",
      previousMeeting: normalizedMeetings.at(-1) || null,
      nextMeeting: null,
    });
  }

  return slots
    .filter((slot) => slot.endMinutes - slot.startMinutes >= 30)
    .map((slot, index) => ({
      id: `slot-${index + 1}`,
      label: `Free Slot ${index + 1}`,
      startTime: minutesToClockLabel(slot.startMinutes),
      endTime: minutesToClockLabel(slot.endMinutes),
      startLabel: minutesToReadableLabel(slot.startMinutes),
      endLabel: minutesToReadableLabel(slot.endMinutes),
      durationMinutes: slot.endMinutes - slot.startMinutes,
      slotType: slot.slotType,
      contextLabel:
        slot.slotType === "before-first-meeting"
          ? "Before your first meeting"
          : slot.slotType === "between-meetings"
            ? "Between meetings"
            : slot.slotType === "after-last-meeting"
              ? "After your last meeting"
              : "Flexible open window",
      previousMeeting: slot.previousMeeting
        ? {
            id: slot.previousMeeting.id,
            title: slot.previousMeeting.title,
            endTime: slot.previousMeeting.endTime,
            endLabel: slot.previousMeeting.endLabel,
          }
        : null,
      nextMeeting: slot.nextMeeting
        ? {
            id: slot.nextMeeting.id,
            title: slot.nextMeeting.title,
            startTime: slot.nextMeeting.startTime,
            startLabel: slot.nextMeeting.startLabel,
          }
        : null,
    }));
}

module.exports = {
  buildFreeSlots,
  minutesToClockLabel,
  normalizeMeetings,
  parseTimeToMinutes,
};
