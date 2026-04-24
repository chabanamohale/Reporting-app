import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, ScrollView, Modal, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, SharedStyles, Shadows } from '../utils/theme';
import { attColor } from '../utils/helpers';

// LIGHT COLOUR PALETTE (customise these values as you like)
const _colors = {
  // Backgrounds
  bg: '#f8f9fa',   // main screen background (light grey)
  bg1: '#ffffff',  // card background (white)
  bg2: '#f1f3f5',  // input backgrounds, search bar
  bg3: '#e9ecef',  // progress bar track, sheet handle
  // Text
  t1: '#212529',   // dark text for main content
  t2: '#495057',   // secondary text
  t3: '#6c757d',   // placeholder / disabled text
  // Accent
  blue: '#0d6efd',
  blueL: '#3b82f6',
  blueDim: '#cfe2ff',
  green: '#198754',
  red: '#dc3545',
  yellow: '#ffc107',
  purple: '#6f42c1',
  orange: '#fd7e14',
  cyan: '#0dcaf0',
  pink: '#d63384',
  // Borders
  border: '#dee2e6',
  border2: '#ced4da',
};

/* ══════════════════════════════════════════════
   SCREEN WRAPPER
══════════════════════════════════════════════ */
export function Screen({ children, style, scroll = true, padding = true }) {
  const content = (
    <View style={[{ flex: 1 }, padding && { paddingHorizontal: 18, paddingTop: 16 }, style]}>
      {children}
    </View>
  );
  if (!scroll) return <View style={SharedStyles.screen}>{content}</View>;
  return (
    <ScrollView
      style={SharedStyles.screen}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  );
}

/* ══════════════════════════════════════════════
   PAGE HEADER
══════════════════════════════════════════════ */
export function PageHeader({ title, subtitle, right }) {
  return (
    <View style={[SharedStyles.between, { marginBottom: 20 }]}>
      <View style={{ flex: 1 }}>
        <Text style={Typography.h2}>{title}</Text>
        {subtitle ? <Text style={[Typography.sm, { marginTop: 3 }]}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ marginLeft: 12 }}>{right}</View> : null}
    </View>
  );
}

/* ══════════════════════════════════════════════
   STAT CARD
══════════════════════════════════════════════ */
export function StatCard({ label, value, icon, accentColor = _colors.blue, style }) {
  return (
    <View style={[styles.statCard, style]}>
      <View style={[styles.statAccent, { backgroundColor: accentColor }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      {icon ? <Text style={styles.statIcon}>{icon}</Text> : null}
    </View>
  );
}

/* ══════════════════════════════════════════════
   CARD
══════════════════════════════════════════════ */
export function Card({ children, style, onPress }) {
  if (onPress) {
    return (
      <TouchableOpacity style={[SharedStyles.card, style]} onPress={onPress} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[SharedStyles.card, style]}>{children}</View>;
}

/* ══════════════════════════════════════════════
   BUTTON
══════════════════════════════════════════════ */
export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, small }) {
  const isPrimary   = variant === 'primary';
  const isSuccess   = variant === 'success';
  const isDanger    = variant === 'danger';
  const isGhost     = variant === 'ghost';

  const bgColor = isPrimary ? _colors.blue : isSuccess ? _colors.green : isDanger ? _colors.red : 'transparent';
  const textColor = isGhost ? _colors.t2 : '#fff';
  const borderStyle = isGhost ? { borderWidth: 1, borderColor: _colors.border2 } : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: bgColor },
        borderStyle,
        small && styles.btnSm,
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator size="small" color={textColor} />
        : <>
            {icon && <Ionicons name={icon} size={small ? 14 : 16} color={textColor} style={{ marginRight: 6 }} />}
            <Text style={[styles.btnText, { color: textColor }, small && { fontSize: 13 }]}>{title}</Text>
          </>
      }
    </TouchableOpacity>
  );
}

/* ══════════════════════════════════════════════
   INPUT
══════════════════════════════════════════════ */
export function Input({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, numberOfLines = 4, style, editable = true }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={SharedStyles.fgroup}>
      {label ? <Text style={SharedStyles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={_colors.t3}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          SharedStyles.input,
          multiline && { height: numberOfLines * 22, textAlignVertical: 'top', paddingTop: 10 },
          focused && { borderColor: _colors.blue },
          !editable && { opacity: 0.6 },
          style,
        ]}
      />
    </View>
  );
}

/* ══════════════════════════════════════════════
   PICKER (dropdown via modal)
══════════════════════════════════════════════ */
export function Picker({ label, value, options = [], onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => (o.value ?? o) === value);
  const displayLabel = selected ? (selected.label ?? selected) : placeholder;

  return (
    <View style={SharedStyles.fgroup}>
      {label ? <Text style={SharedStyles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[SharedStyles.input, SharedStyles.row, { justifyContent: 'space-between' }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={{ color: selected ? _colors.t1 : _colors.t3, fontSize: 14, flex: 1 }} numberOfLines={1}>
          {displayLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={_colors.t3} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setOpen(false)}>
          <View style={styles.pickerBox}>
            <Text style={[Typography.h4, { marginBottom: 12, paddingHorizontal: 16 }]}>{label || 'Select'}</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {options.map((opt, i) => {
                const val = opt.value ?? opt;
                const lbl = opt.label ?? opt;
                const isSelected = val === value;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.pickerItem, isSelected && { backgroundColor: _colors.blueDim }]}
                    onPress={() => { onChange(val); setOpen(false); }}
                  >
                    <Text style={{ color: isSelected ? _colors.blue : _colors.t1, fontSize: 14 }}>{lbl}</Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color={_colors.blue} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ══════════════════════════════════════════════
   BADGE
══════════════════════════════════════════════ */
export function Badge({ text, color = _colors.blue }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

/* ══════════════════════════════════════════════
   PROGRESS BAR
══════════════════════════════════════════════ */
export function ProgressBar({ pct = 0, color }) {
  const barColor = color || attColor(pct);
  return (
    <View style={styles.progTrack}>
      <View style={[styles.progFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
    </View>
  );
}

/* ══════════════════════════════════════════════
   STAR RATING
══════════════════════════════════════════════ */
export function StarRating({ value = 0, onChange, readonly = false, size = 28 }) {
  const [hov, setHov] = useState(0);
  const display = hov || value;
  return (
    <View style={SharedStyles.row}>
      {[1,2,3,4,5].map(s => (
        <TouchableOpacity
          key={s}
          onPress={() => !readonly && onChange && onChange(s)}
          disabled={readonly}
          activeOpacity={0.7}
          style={{ marginRight: 4 }}
        >
          <Text style={{ fontSize: size, color: s <= display ? _colors.yellow : _colors.t3 }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ══════════════════════════════════════════════
   SEARCH BAR
══════════════════════════════════════════════ */
export function SearchBar({ value, onChangeText, placeholder = 'Search…' }) {
  return (
    <View style={styles.searchBar}>
      <Ionicons name="search" size={16} color={_colors.t3} style={{ marginRight: 8 }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={_colors.t3}
        style={{ flex: 1, color: _colors.t1, fontSize: 14 }}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={16} color={_colors.t3} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════
   MODAL SHEET
══════════════════════════════════════════════ */
export function BottomSheet({ visible, onClose, title, children, height = '80%' }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight: height }]}>
          <View style={styles.sheetHandle} />
          <View style={[SharedStyles.between, { marginBottom: 16, paddingHorizontal: 20, paddingTop: 8 }]}>
            <Text style={Typography.h3}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={_colors.t2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ══════════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════════ */
export function Empty({ icon = '📭', title = 'Nothing here', subtitle, action }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>{icon}</Text>
      <Text style={Typography.h4}>{title}</Text>
      {subtitle ? <Text style={[Typography.sm, { marginTop: 6, textAlign: 'center' }]}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}

/* ══════════════════════════════════════════════
   LOADER
══════════════════════════════════════════════ */
export function Loader({ text = 'Loading…' }) {
  return (
    <View style={SharedStyles.center}>
      <ActivityIndicator size="large" color={_colors.blue} />
      <Text style={[Typography.sm, { marginTop: 12 }]}>{text}</Text>
    </View>
  );
}

/* ══════════════════════════════════════════════
   GRADIENT HEADER
══════════════════════════════════════════════ */
export function GradientHeader({ title, subtitle, color1 = '#1e3a5f', color2 = _colors.bg }) {
  return (
    <LinearGradient colors={[color1, color2]} style={styles.gradHeader}>
      <Text style={[Typography.h2, { color: '#fff' }]}>{title}</Text>
      {subtitle ? <Text style={[Typography.body, { color: 'rgba(255,255,255,0.7)', marginTop: 4 }]}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

/* ══════════════════════════════════════════════
   INFO ROW
══════════════════════════════════════════════ */
export function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

/* ══════════════════════════════════════════════
   TABLE ROW
══════════════════════════════════════════════ */
export function TableRow({ cells = [], style }) {
  return (
    <View style={[styles.tableRow, style]}>
      {cells.map((cell, i) => (
        <View key={i} style={{ flex: cell.flex || 1 }}>
          {typeof cell.content === 'string'
            ? <Text style={[{ color: _colors.t2, fontSize: 13 }, cell.style]} numberOfLines={cell.lines || 1}>
                {cell.content}
              </Text>
            : cell.content
          }
        </View>
      ))}
    </View>
  );
}

/* ── Styles (only colour references updated) ─────────────────── */
const styles = StyleSheet.create({
  statCard: {
    backgroundColor: _colors.bg1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: _colors.border,
    padding: 16,
    minWidth: 140,
    flex: 1,
    margin: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  statAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  statLabel: { fontSize: 10, fontWeight: '700', color: _colors.t3, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: '800', color: _colors.t1 },
  statIcon:  { position: 'absolute', bottom: 8, right: 12, fontSize: 32, opacity: 0.08 },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 20, borderRadius: Radius.sm },
  btnSm: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 7 },
  btnText: { fontSize: 14, fontWeight: '700' },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  progTrack: { height: 5, backgroundColor: _colors.bg3, borderRadius: 99, overflow: 'hidden' },
  progFill:  { height: '100%', borderRadius: 99 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: _colors.bg2, borderWidth: 1, borderColor: _colors.border,
    borderRadius: 99, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 14,
  },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: _colors.bg1, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: _colors.border2, paddingBottom: 20,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: _colors.bg3, borderRadius: 99, alignSelf: 'center', marginTop: 10 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 52, paddingHorizontal: 24 },

  gradHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },

  infoRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: _colors.border },
  infoLabel: { fontSize: 10, fontWeight: '700', color: _colors.t3, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 3 },
  infoValue: { fontSize: 14, color: _colors.t1, lineHeight: 20 },

  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: _colors.border },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  pickerBox: { backgroundColor: _colors.bg1, borderRadius: Radius.xl, paddingTop: 16, paddingBottom: 8, borderWidth: 1, borderColor: _colors.border2 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: _colors.border },
});