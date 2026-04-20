import type {
  ScheduleTemplate,
  ScheduleOverride,
  ScheduleSlot,
  ScheduleUser,
  DayOfWeek,
} from "@/types";

function hhmm(t: string): string {
  return t.slice(0, 5);
}

function timeToMinutes(t: string): number {
  const [h, m] = hhmm(t).split(":").map(Number);
  return h * 60 + m;
}

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) &&
    timeToMinutes(bStart) < timeToMinutes(aEnd);
}

function rangeContains(
  outerStart: string,
  outerEnd: string,
  innerStart: string,
  innerEnd: string
): boolean {
  return timeToMinutes(outerStart) <= timeToMinutes(innerStart) &&
    timeToMinutes(innerEnd) <= timeToMinutes(outerEnd);
}

/**
 * Computes working time slots after subtracting a time-off window from a template.
 * Returns array of { start_time, end_time } for the remaining work periods.
 */
export function computeWorkingSlots(
  tmplStart: string,
  tmplEnd: string,
  offStart: string,
  offEnd: string
): { start_time: string; end_time: string }[] {
  const ts = hhmm(tmplStart);
  const te = hhmm(tmplEnd);
  const os = hhmm(offStart);
  const oe = hhmm(offEnd);

  if (os <= ts && oe >= te) return [];
  if (oe <= ts || os >= te) return [{ start_time: ts, end_time: te }];

  const slots: { start_time: string; end_time: string }[] = [];
  if (os > ts) slots.push({ start_time: ts, end_time: os });
  if (oe < te) slots.push({ start_time: oe, end_time: te });
  return slots;
}

interface MergeContext {
  userId: string;
  userName: string;
  userRole: string;
  dayOfWeek: DayOfWeek;
  date: string;
}

function pushExtraShift(
  result: ScheduleSlot[],
  ctx: MergeContext,
  ov: ScheduleOverride
) {
  if (!ov.start_time || !ov.end_time) return;
  result.push({
    user_id: ctx.userId,
    user_name: ctx.userName,
    user_role: ctx.userRole,
    day_of_week: ctx.dayOfWeek,
    date: ctx.date,
    start_time: ov.start_time,
    end_time: ov.end_time,
    is_override: true,
    is_extra_shift: true,
    is_day_off: false,
    override_reason: ov.reason ?? undefined,
    override_id: ov.id,
  });
}

function pushTimeOffBlocks(
  result: ScheduleSlot[],
  ctx: MergeContext,
  tmpl: ScheduleTemplate,
  ov: ScheduleOverride
) {
  if (!ov.start_time || !ov.end_time) return;
  const offStart = ov.start_time;
  const offEnd = ov.end_time;
  const workSlots = computeWorkingSlots(
    tmpl.start_time,
    tmpl.end_time,
    offStart,
    offEnd
  );

  if (workSlots.length === 0) {
    result.push({
      user_id: ctx.userId,
      user_name: ctx.userName,
      user_role: ctx.userRole,
      day_of_week: ctx.dayOfWeek,
      date: ctx.date,
      start_time: tmpl.start_time,
      end_time: tmpl.end_time,
      is_override: true,
      is_day_off: true,
      override_reason: ov.reason ?? undefined,
    });
    return;
  }

  for (const ws of workSlots) {
    result.push({
      user_id: ctx.userId,
      user_name: ctx.userName,
      user_role: ctx.userRole,
      day_of_week: ctx.dayOfWeek,
      date: ctx.date,
      start_time: ws.start_time,
      end_time: ws.end_time,
      is_override: false,
      is_day_off: false,
    });
  }
  result.push({
    user_id: ctx.userId,
    user_name: ctx.userName,
    user_role: ctx.userRole,
    day_of_week: ctx.dayOfWeek,
    date: ctx.date,
    start_time: hhmm(offStart),
    end_time: hhmm(offEnd),
    is_override: true,
    is_day_off: true,
    override_reason: ov.reason ?? undefined,
  });
}

function pushAttendanceIssueSlot(
  result: ScheduleSlot[],
  ctx: MergeContext,
  tmpl: ScheduleTemplate,
  ov: ScheduleOverride
) {
  if (!ov.start_time || !ov.end_time) return;
  const tmplStart = hhmm(tmpl.start_time);
  const tmplEnd = hhmm(tmpl.end_time);
  const ovStart = hhmm(ov.start_time);
  const ovEnd = hhmm(ov.end_time);
  const minutes = timeToMinutes(ovEnd) - timeToMinutes(ovStart);

  // Tardanza: missed portion starts at the shift's start.
  // Salida temprana: missed portion ends at the shift's end.
  const isLate = ovStart === tmplStart && ovEnd < tmplEnd;
  const isEarly = ovEnd === tmplEnd && ovStart > tmplStart;

  result.push({
    user_id: ctx.userId,
    user_name: ctx.userName,
    user_role: ctx.userRole,
    day_of_week: ctx.dayOfWeek,
    date: ctx.date,
    start_time: tmpl.start_time,
    end_time: tmpl.end_time,
    is_override: false,
    is_day_off: false,
    override_reason: ov.reason ?? undefined,
    attendanceIssue: {
      type: isEarly && !isLate ? "early" : "late",
      minutes,
      overrideId: ov.id,
    },
  });
  void isLate;
}

export function mergeTemplatesAndOverrides(
  templates: ScheduleTemplate[],
  overrides: ScheduleOverride[],
  users: ScheduleUser[],
  dates: string[],
  getDayOfWeek: (date: string, idx: number) => DayOfWeek
): ScheduleSlot[] {
  const result: ScheduleSlot[] = [];

  const userMap = new Map(
    users.map((u) => [u.id, { name: u.full_name ?? "Sin nombre", role: u.role ?? "" }])
  );

  for (let dayIdx = 0; dayIdx < dates.length; dayIdx++) {
    const date = dates[dayIdx];
    const dayOfWeek = getDayOfWeek(date, dayIdx);

    for (const user of users) {
      const userInfo = userMap.get(user.id)!;
      const ctx: MergeContext = {
        userId: user.id,
        userName: userInfo.name,
        userRole: userInfo.role,
        dayOfWeek,
        date,
      };

      const dayOverrides = overrides.filter(
        (o) => o.user_id === user.id && o.override_date === date
      );
      const extraOverrides = dayOverrides.filter((o) => o.is_extra_shift);
      const regularOverrides = dayOverrides.filter((o) => !o.is_extra_shift);

      for (const ov of extraOverrides) {
        pushExtraShift(result, ctx, ov);
      }

      const dayTemplates = templates.filter(
        (t) => t.user_id === user.id && t.day_of_week === dayOfWeek
      );

      // Full-day override (no time range) replaces all templates for this day.
      const fullDayOverride = regularOverrides.find(
        (o) => !o.start_time || !o.end_time
      );
      if (fullDayOverride) {
        for (const tmpl of dayTemplates) {
          result.push({
            user_id: ctx.userId,
            user_name: ctx.userName,
            user_role: ctx.userRole,
            day_of_week: dayOfWeek,
            date,
            start_time: tmpl.start_time,
            end_time: tmpl.end_time,
            is_override: true,
            is_day_off: true,
            is_absence: fullDayOverride.is_absence ?? false,
            override_reason: fullDayOverride.reason ?? undefined,
          });
        }
        if (dayTemplates.length === 0) {
          result.push({
            user_id: ctx.userId,
            user_name: ctx.userName,
            user_role: ctx.userRole,
            day_of_week: dayOfWeek,
            date,
            start_time: "00:00",
            end_time: "00:00",
            is_override: true,
            is_day_off: true,
            is_absence: fullDayOverride.is_absence ?? false,
            override_reason: fullDayOverride.reason ?? undefined,
          });
        }
        continue;
      }

      const partialOverrides = regularOverrides.filter(
        (o) => o.start_time && o.end_time
      );

      // Track which overrides were consumed by a matching template.
      const consumedOverrideIds = new Set<number>();

      for (const tmpl of dayTemplates) {
        const tmplStart = hhmm(tmpl.start_time);
        const tmplEnd = hhmm(tmpl.end_time);

        // Find overrides that target this template (overlap with it).
        const tmplOverrides = partialOverrides.filter((o) =>
          rangesOverlap(tmplStart, tmplEnd, o.start_time!, o.end_time!)
        );

        if (tmplOverrides.length === 0) {
          // No override touches this template → render normally.
          result.push({
            user_id: ctx.userId,
            user_name: ctx.userName,
            user_role: ctx.userRole,
            day_of_week: dayOfWeek,
            date,
            start_time: tmpl.start_time,
            end_time: tmpl.end_time,
            is_override: false,
            is_day_off: false,
          });
          continue;
        }

        // Separate absence overrides from time-off overrides.
        const timeOffOverrides = tmplOverrides.filter(
          (o) => o.time_off_request_id && !o.is_day_off
        );
        const absenceOverrides = tmplOverrides.filter((o) => o.is_absence);
        const otherOverrides = tmplOverrides.filter(
          (o) => !o.time_off_request_id && !o.is_absence
        );

        // Full-shift absence within this template → replace template entirely.
        const fullShiftAbsence = absenceOverrides.find((o) =>
          rangeContains(o.start_time!, o.end_time!, tmplStart, tmplEnd)
        );
        if (fullShiftAbsence) {
          consumedOverrideIds.add(fullShiftAbsence.id);
          result.push({
            user_id: ctx.userId,
            user_name: ctx.userName,
            user_role: ctx.userRole,
            day_of_week: dayOfWeek,
            date,
            start_time: fullShiftAbsence.start_time!,
            end_time: fullShiftAbsence.end_time!,
            is_override: true,
            is_day_off: true,
            is_absence: true,
            override_reason: fullShiftAbsence.reason ?? undefined,
          });
          continue;
        }

        // Partial absence (tardanza / salida temprana): render template with issue badge.
        const partialAbsence = absenceOverrides.find(
          (o) => !consumedOverrideIds.has(o.id)
        );
        if (partialAbsence) {
          consumedOverrideIds.add(partialAbsence.id);
          pushAttendanceIssueSlot(result, ctx, tmpl, partialAbsence);
          continue;
        }

        // Time-off (approved permiso) within this template.
        const timeOff = timeOffOverrides.find(
          (o) => !consumedOverrideIds.has(o.id)
        );
        if (timeOff) {
          consumedOverrideIds.add(timeOff.id);
          pushTimeOffBlocks(result, ctx, tmpl, timeOff);
          continue;
        }

        // Other partial override (generic excepción that replaces the shift slot).
        const other = otherOverrides.find(
          (o) => !consumedOverrideIds.has(o.id)
        );
        if (other) {
          consumedOverrideIds.add(other.id);
          result.push({
            user_id: ctx.userId,
            user_name: ctx.userName,
            user_role: ctx.userRole,
            day_of_week: dayOfWeek,
            date,
            start_time: other.start_time!,
            end_time: other.end_time!,
            is_override: true,
            is_day_off: false,
            is_absence: other.is_absence ?? false,
            override_reason: other.reason ?? undefined,
          });
        }
      }

      // Any partial override that didn't match a template → render as standalone slot.
      for (const ov of partialOverrides) {
        if (consumedOverrideIds.has(ov.id)) continue;
        result.push({
          user_id: ctx.userId,
          user_name: ctx.userName,
          user_role: ctx.userRole,
          day_of_week: dayOfWeek,
          date,
          start_time: ov.start_time!,
          end_time: ov.end_time!,
          is_override: true,
          is_day_off: ov.is_day_off ?? false,
          is_absence: ov.is_absence ?? false,
          override_reason: ov.reason ?? undefined,
        });
      }
    }
  }

  return result;
}
