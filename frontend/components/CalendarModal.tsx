import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CalendarModalProps {
  visible: boolean;
  title: string;
  initialDate?: Date;
  minDate?: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
}

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const monthLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const buildCalendarGrid = (monthDate: Date) => {
  const first = startOfMonth(monthDate);
  const startDay = first.getDay();
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const totalCells = 42;

  const cells: Array<{ date: Date; inCurrentMonth: boolean }> = [];

  for (let i = 0; i < totalCells; i += 1) {
    const dayOffset = i - startDay;
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), dayOffset + 1);
    cells.push({ date, inCurrentMonth: dayOffset >= 0 && dayOffset < daysInMonth });
  }

  return cells;
};

export default function CalendarModal({
  visible,
  title,
  initialDate,
  minDate,
  onClose,
  onSelect,
}: CalendarModalProps) {
  const baseDate = initialDate || new Date();
  const [viewDate, setViewDate] = useState(startOfMonth(baseDate));

  const grid = useMemo(() => buildCalendarGrid(viewDate), [viewDate]);

  const normalizedMin = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    : null;

  const canSelectDate = (date: Date) => {
    if (!normalizedMin) return true;
    return date >= normalizedMin;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.monthHeader}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
            >
              <Text style={styles.navBtnText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthLabel(viewDate)}</Text>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
            >
              <Text style={styles.navBtnText}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEK_DAYS.map((d) => (
              <Text key={d} style={styles.weekDay}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {grid.map(({ date, inCurrentMonth }) => {
              const disabled = !canSelectDate(date);
              const selected = isSameDay(date, baseDate);

              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  disabled={disabled}
                  style={[
                    styles.dayCell,
                    selected && styles.dayCellSelected,
                    !inCurrentMonth && styles.dayCellMuted,
                    disabled && styles.dayCellDisabled,
                  ]}
                  onPress={() => {
                    const picked = new Date(baseDate);
                    picked.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                    onSelect(picked);
                    onClose();
                  }}
                >
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{date.getDate()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
  },
  navBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3730a3',
  },
  monthText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekDay: {
    width: '14.2%',
    textAlign: 'center',
    color: '#64748b',
    fontWeight: '600',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 4,
  },
  dayCellSelected: {
    backgroundColor: '#4f46e5',
  },
  dayCellMuted: {
    opacity: 0.35,
  },
  dayCellDisabled: {
    opacity: 0.2,
  },
  dayText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#ffffff',
  },
  closeBtn: {
    marginTop: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#334155',
    fontWeight: '700',
  },
});
