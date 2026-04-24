export const attPct = (p, g) => (g > 0 ? Math.round((p / g) * 100) : 0);

export const attColor = (pct) => {
  if (pct >= 75) return '#34d399';
  if (pct >= 50) return '#fbbf24';
  return '#f87171';
};

export const initials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export const fmtDate = (val) => {
  if (!val) return '—';
  if (val?.toDate) return val.toDate().toLocaleDateString();
  if (typeof val === 'string') return val;
  return '—';
};

export const FACULTIES = [
  'Faculty of Information Communication Technology',
  'Faculty of Business',
  'Faculty of Science',
  'Faculty of Engineering',
  'Faculty of Arts & Design',
];

export const WEEKS = Array.from({ length: 15 }, (_, i) => `Week ${i + 1}`);

export const TIMES = [
  '07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00',
];

export const RATING_CATEGORIES = [
  'Teaching Quality',
  'Course Content',
  'Punctuality',
  'Communication & Support',
  'Assessment Fairness',
];

export const ROLES = [
  { value: 'student',  label: 'Student 🎓' },
  { value: 'lecturer', label: 'Lecturer 👨‍🏫' },
  { value: 'prl',      label: 'Principal Lecturer (PRL) 🔬' },
  { value: 'pl',       label: 'Program Leader (PL) 🏛️' },
];
