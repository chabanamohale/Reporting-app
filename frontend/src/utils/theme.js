
//  LUCT Design System — React Native Theme


export const Colors = {
  bg:       '#07101f',
  bg1:      '#0d1a2e',
  bg2:      '#112038',
  bg3:      '#162645',
  border:   'rgba(255,255,255,0.08)',
  border2:  'rgba(255,255,255,0.15)',

  blue:     '#3b82f6',
  blueL:    '#60a5fa',
  blueDim:  'rgba(59,130,246,0.15)',
  blueGlow: 'rgba(59,130,246,0.3)',
  cyan:     '#22d3ee',
  purple:   '#a78bfa',
  green:    '#34d399',
  greenDim: 'rgba(52,211,153,0.13)',
  yellow:   '#fbbf24',
  red:      '#f87171',
  redDim:   'rgba(248,113,113,0.13)',

  t1: '#e8f0ff',
  t2: '#7ea3c4',
  t3: '#3d5c7a',

  white: '#ffffff',
};

export const Typography = {
  h1:   { fontSize: 26, fontWeight: '800', color: Colors.t1, letterSpacing: -0.5 },
  h2:   { fontSize: 20, fontWeight: '700', color: Colors.t1 },
  h3:   { fontSize: 17, fontWeight: '700', color: Colors.t1 },
  h4:   { fontSize: 15, fontWeight: '600', color: Colors.t1 },
  body: { fontSize: 14, fontWeight: '400', color: Colors.t2, lineHeight: 20 },
  sm:   { fontSize: 12, fontWeight: '400', color: Colors.t3 },
  label:{ fontSize: 11, fontWeight: '700', color: Colors.t3, textTransform: 'uppercase', letterSpacing: 0.8 },
  code: { fontSize: 13, fontWeight: '600', color: Colors.blueL, fontFamily: 'monospace' },
};

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28,
};

export const Radius = {
  sm: 8, md: 12, lg: 18, xl: 24, full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Reusable component styles
export const SharedStyles = {
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  card: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    color: Colors.t1,
    fontSize: 14,
  },
  label: {
    ...Typography.label,
    marginBottom: 5,
  },
  fgroup: {
    marginBottom: Spacing.md,
  },
};

// Stat card accent colors
export const ACCENTS = {
  blue:   { top: Colors.blue,   glow: Colors.blueDim },
  green:  { top: Colors.green,  glow: Colors.greenDim },
  purple: { top: Colors.purple, glow: 'rgba(167,139,250,0.15)' },
  yellow: { top: Colors.yellow, glow: 'rgba(251,191,36,0.15)' },
  red:    { top: Colors.red,    glow: Colors.redDim },
  cyan:   { top: Colors.cyan,   glow: 'rgba(34,211,238,0.13)' },
};

export const ROLE_COLORS = {
  student:  Colors.green,
  lecturer: Colors.blue,
  prl:      Colors.purple,
  pl:       Colors.yellow,
};

export const ROLE_LABELS = {
  student:  'Student',
  lecturer: 'Lecturer',
  prl:      'Principal Lecturer',
  pl:       'Program Leader',
};
