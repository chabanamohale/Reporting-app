import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Alert, Linking, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  ReportsService, CoursesService, RatingsService, AuthService, ClassesService
} from '../../services/firestoreService';
import { ExcelAPI } from '../../services/api'; // keep Excel downloads
import {
  Screen, PageHeader, Card, StatCard, Button, Input, Picker,
  Badge, ProgressBar, Empty, Loader, SearchBar, StarRating, InfoRow, BottomSheet,
} from '../../components';
import { Colors, Typography, SharedStyles } from '../../utils/theme';
import { attPct, attColor, FACULTIES, RATING_CATEGORIES } from '../../utils/helpers';

const BLANK = { name: '', code: '', faculty: FACULTIES[0], credits: 3, description: '', schedule: '', venue: '' };

/* ══════════════════════════════════════════════
   PL DASHBOARD
══════════════════════════════════════════════ */
export function PLDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const allCourses = await CoursesService.getAll();
        const allReports = await ReportsService.getAll();
        const allUsers = await AuthService.getUsers();
        const lecturers = allUsers.filter(u => u.role === 'lecturer');
        const students = allUsers.filter(u => u.role === 'student');
        const totalReports = allReports.length;
        const reviewed = allReports.filter(r => r.status === 'reviewed').length;
        const pending = totalReports - reviewed;
        const avgAttendance = totalReports
          ? Math.round(
              allReports.reduce((sum, r) => sum + attPct(r.studentsPresent, r.registeredStudents), 0) / totalReports
            )
          : 0;
        setStats({
          totalCourses: allCourses.length,
          totalReports,
          totalLecturers: lecturers.length,
          totalStudents: students.length,
          avgAttendance,
          reviewed,
          pending,
        });
      } catch (e) { console.warn(e); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader title="PL Dashboard" subtitle="Institution-wide overview" />
      <View style={SharedStyles.row}>
        <StatCard label="Courses" value={stats?.totalCourses ?? 0} accentColor={Colors.blue} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Reports" value={stats?.totalReports ?? 0} accentColor={Colors.purple} style={{ flex: 1, margin: 4 }} />
      </View>
      <View style={[SharedStyles.row, { marginTop: 0 }]}>
        <StatCard label="Lecturers" value={stats?.totalLecturers ?? 0} accentColor={Colors.green} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Students" value={stats?.totalStudents ?? 0} accentColor={Colors.yellow} style={{ flex: 1, margin: 4 }} />
      </View>
      <View style={[SharedStyles.row, { marginTop: 0 }]}>
        <StatCard label="Avg Att." value={`${stats?.avgAttendance ?? 0}%`} accentColor={Colors.cyan} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Unassigned" value={null} accentColor={Colors.red} style={{ flex: 1, margin: 4 }} />
      </View>

      <Text style={[Typography.h4, { marginTop: 18, marginBottom: 10 }]}>Quick Actions</Text>
      {[
        { label: '📊 Export Reports', sub: 'Download all reports as Excel', onPress: () => Linking.openURL(ExcelAPI.reports()) },
        { label: '📅 Export Attendance', sub: 'Download attendance records', onPress: () => Linking.openURL(ExcelAPI.attendance()) },
        { label: '⭐ Export Ratings', sub: 'Download ratings data', onPress: () => Linking.openURL(ExcelAPI.ratings()) },
      ].map(a => (
        <Card key={a.label} onPress={a.onPress} style={{ marginBottom: 8, padding: 14 }}>
          <View style={SharedStyles.between}>
            <View><Text style={Typography.h4}>{a.label}</Text><Text style={Typography.sm}>{a.sub}</Text></View>
            <Badge text="Excel" color={Colors.green} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

/* ══════════════════════════════════════════════
   PL COURSES (full CRUD + assign)
══════════════════════════════════════════════ */
export function PLCourses() {
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [showAssign, setShowAssign] = useState(null);
  const [selLec, setSelLec] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sq, setSq] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([CoursesService.getAll(), AuthService.getUsers('lecturer')]);
      setCourses(c || []);
      setLecturers(l || []);
    } catch (e) { console.warn(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!form.name || !form.code) { Alert.alert('Error', 'Name and Code required'); return; }
    setBusy(true);
    try {
      if (editCourse) {
        await CoursesService.update(editCourse.id, form);
        Alert.alert('✅ Course updated!');
      } else {
        await CoursesService.create(form);
        Alert.alert('✅ Course created!');
      }
      setShowForm(false);
      setEditCourse(null);
      setForm(BLANK);
      load();
    } catch (e) { Alert.alert('Error', e.message); }
    setBusy(false);
  }

  async function handleDelete(c) {
    Alert.alert('Delete Course', `Delete "${c.name}"?`, [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await CoursesService.delete(c.id); load(); } catch (e) { Alert.alert('Error', e.message); }
        }
      },
    ]);
  }

  async function handleAssign(courseId) {
    if (!selLec) { Alert.alert('Error', 'Select a lecturer'); return; }
    const lec = lecturers.find(l => (l.uid || l.id) === selLec);
    try {
      await CoursesService.assignLecturer(courseId, selLec, lec?.name || '');
      Alert.alert('✅', `${lec?.name} assigned!`);
      setShowAssign(null);
      setSelLec('');
      load();
    } catch (e) { Alert.alert('Error', e.message); }
  }

  function openEdit(c) {
    setEditCourse(c);
    setForm({
      name: c.name, code: c.code, faculty: c.faculty, credits: c.credits || 3,
      description: c.description || '', schedule: c.schedule || '', venue: c.venue || ''
    });
    setShowForm(true);
  }

  const filtered = courses.filter(c =>
    !sq ||
    c.name?.toLowerCase().includes(sq.toLowerCase()) ||
    c.code?.toLowerCase().includes(sq.toLowerCase()) ||
    c.assignedLecturerName?.toLowerCase().includes(sq.toLowerCase())
  );

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader
        title="Course Management"
        subtitle="Add, edit, assign lecturers"
        right={<Button title="Add" icon="add" small onPress={() => { setEditCourse(null); setForm(BLANK); setShowForm(true); }} />}
      />

      <View style={SharedStyles.row}>
        <StatCard label="Total" value={courses.length} accentColor={Colors.blue} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Assigned" value={courses.filter(c => c.assignedLecturerId).length} accentColor={Colors.green} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Open" value={courses.filter(c => !c.assignedLecturerId).length} accentColor={Colors.yellow} style={{ flex: 1, margin: 4 }} />
      </View>

      <SearchBar value={sq} onChangeText={setSq} placeholder="Search courses…" />

      {filtered.map(c => (
        <Card key={c.id} style={{ marginBottom: 10, padding: 16 }}>
          <View style={SharedStyles.between}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.h4, { color: Colors.blueL }]}>{c.code}</Text>
              <Text style={[Typography.body, { marginTop: 2 }]}>{c.name}</Text>
            </View>
            <Badge text={`${c.credits || 3} Cr`} color={Colors.blue} />
          </View>
          <Text style={[Typography.sm, { marginTop: 6 }]} numberOfLines={1}>{c.faculty}</Text>
          {c.schedule && <Text style={[Typography.sm, { marginTop: 3 }]}>🕐 {c.schedule}</Text>}
          {c.venue && <Text style={[Typography.sm, { marginTop: 3 }]}>📍 {c.venue}</Text>}
          <View style={[SharedStyles.between, { marginTop: 10 }]}>
            <Text style={[Typography.sm, { color: c.assignedLecturerId ? Colors.green : Colors.yellow }]}>
              {c.assignedLecturerName ? `✓ ${c.assignedLecturerName}` : '⚠ Unassigned'}
            </Text>
          </View>
          <View style={[SharedStyles.row, { marginTop: 12, gap: 6 }]}>
            <Button
              title="Assign" variant="ghost" small icon="person-add-outline" style={{ flex: 1 }}
              onPress={() => { setShowAssign(c); setSelLec(''); }}
            />
            <Button title="Edit" variant="ghost" small icon="pencil-outline" style={{ flex: 1 }} onPress={() => openEdit(c)} />
            <Button title="Del" variant="danger" small icon="trash-outline" style={{ flex: 1 }} onPress={() => handleDelete(c)} />
          </View>
        </Card>
      ))}
      {!filtered.length && <Empty icon="📚" title="No courses yet" subtitle='Tap "Add" to create your first course' />}

      {/* Course form */}
      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} title={editCourse ? '✏️ Edit Course' : '➕ New Course'} height="90%">
        <Input label="Course Name *" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Software Engineering" />
        <Input label="Course Code *" value={form.code} onChangeText={v => setForm(f => ({ ...f, code: v }))} placeholder="e.g. SE401" />
        <Picker label="Faculty *" value={form.faculty} options={FACULTIES} onChange={v => setForm(f => ({ ...f, faculty: v }))} />
        <Input label="Credits" value={String(form.credits)} onChangeText={v => setForm(f => ({ ...f, credits: Number(v) || 3 }))} keyboardType="numeric" />
        <Input label="Schedule" value={form.schedule} onChangeText={v => setForm(f => ({ ...f, schedule: v }))} placeholder="e.g. Mon/Wed 09:00-11:00" />
        <Input label="Venue" value={form.venue} onChangeText={v => setForm(f => ({ ...f, venue: v }))} placeholder="e.g. Room A201" />
        <Input label="Description" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} placeholder="Brief description…" multiline />
        <Button title={editCourse ? 'Update Course' : 'Create Course'} onPress={handleSave} loading={busy} style={{ marginTop: 8 }} />
      </BottomSheet>

      {/* Assign lecturer */}
      <BottomSheet visible={!!showAssign} onClose={() => setShowAssign(null)} title="👤 Assign Lecturer" height="50%">
        {showAssign && (
          <>
            <Text style={[Typography.body, { marginBottom: 14 }]}>
              Assigning to: <Text style={{ color: Colors.t1, fontWeight: '700' }}>{showAssign.name} ({showAssign.code})</Text>
            </Text>
            <Picker
              label="Select Lecturer"
              value={selLec}
              options={lecturers.map(l => ({ value: l.uid || l.id, label: `${l.name} — ${l.department || l.faculty}` }))}
              onChange={setSelLec}
            />
            <Button title="Assign Lecturer" onPress={() => handleAssign(showAssign.id)} icon="checkmark-circle-outline" style={{ marginTop: 12 }} />
          </>
        )}
      </BottomSheet>
    </Screen>
  );
}

/* ══════════════════════════════════════════════
   PL REPORTS (read-only view all)
══════════════════════════════════════════════ */
export function PLReports() {
  const [reports, setReports] = useState([]);
  const [viewRep, setViewRep] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sq, setSq] = useState('');

  useEffect(() => {
    ReportsService.getAll()
      .then(data => { setReports(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = reports.filter(r => {
    const mS = !sq ||
      [r.lecturerName, r.courseName, r.courseCode, r.facultyName].some(v => v?.toLowerCase().includes(sq.toLowerCase()));
    const mF = filter === 'all' || r.status === filter;
    return mS && mF;
  });

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader
        title="All Reports"
        subtitle="System-wide lecture reports"
        right={<Button title="Excel" icon="download-outline" small variant="ghost" onPress={() => Linking.openURL(ExcelAPI.reports())} />}
      />

      <View style={[SharedStyles.row, { gap: 6, marginBottom: 12 }]}>
        {['all', 'submitted', 'reviewed'].map(f => (
          <Button
            key={f}
            title={f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            variant={filter === f ? 'primary' : 'ghost'}
            small
            onPress={() => setFilter(f)}
          />
        ))}
      </View>

      <View style={SharedStyles.row}>
        <StatCard label="Total" value={reports.length} accentColor={Colors.blue} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Reviewed" value={reports.filter(r => r.status === 'reviewed').length} accentColor={Colors.green} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Pending" value={reports.filter(r => r.status === 'submitted').length} accentColor={Colors.yellow} style={{ flex: 1, margin: 4 }} />
      </View>

      <SearchBar value={sq} onChangeText={setSq} placeholder="Search lecturer, course, faculty…" />

      {filtered.map(r => {
        const pct = attPct(r.studentsPresent, r.registeredStudents);
        return (
          <Card key={r.id} style={{ marginBottom: 10 }}>
            <View style={SharedStyles.between}>
              <View style={{ flex: 1 }}>
                <Text style={Typography.h4}>{r.lecturerName}</Text>
                <Text style={[Typography.sm, { marginTop: 2 }]}>{r.courseCode} — {r.weekOfReporting}</Text>
              </View>
              <Badge text={r.status} color={r.status === 'reviewed' ? Colors.green : Colors.yellow} />
            </View>
            <Text style={[Typography.sm, { marginTop: 4 }]} numberOfLines={1}>{r.facultyName}</Text>
            <View style={{ marginTop: 8 }}>
              <View style={SharedStyles.between}>
                <Text style={Typography.sm}>Attendance</Text>
                <Text style={[Typography.sm, { color: attColor(pct), fontWeight: '700' }]}>{pct}%</Text>
              </View>
              <View style={{ marginTop: 4 }}><ProgressBar pct={pct} /></View>
            </View>
            {r.feedback && <Text style={[Typography.sm, { marginTop: 6, color: Colors.green }]}>💬 Feedback added by PRL</Text>}
            <Button title="View Details" variant="ghost" small icon="eye-outline" style={{ marginTop: 10 }} onPress={() => setViewRep(r)} />
          </Card>
        );
      })}
      {!filtered.length && <Empty icon="📋" title="No reports found" />}

      <BottomSheet visible={!!viewRep} onClose={() => setViewRep(null)} title="📋 Report Detail" height="92%">
        {viewRep && (
          <>
            {[
              ['Faculty', viewRep.facultyName], ['Class', viewRep.className],
              ['Lecturer', viewRep.lecturerName], ['Course', `${viewRep.courseName} (${viewRep.courseCode})`],
              ['Week', viewRep.weekOfReporting], ['Date', viewRep.dateOfLecture],
              ['Venue', viewRep.venue], ['Time', viewRep.scheduledTime],
              ['Present', String(viewRep.studentsPresent)], ['Registered', String(viewRep.registeredStudents)],
              ['Attendance %', `${attPct(viewRep.studentsPresent, viewRep.registeredStudents)}%`], ['Status', viewRep.status],
            ].map(([l, v]) => <InfoRow key={l} label={l} value={v || '—'} />)}
            {[
              ['Topic Taught', viewRep.topicTaught],
              ['Learning Outcomes', viewRep.learningOutcomes],
              ['Recommendations', viewRep.recommendations]
            ].map(([l, v]) => <InfoRow key={l} label={l} value={v || '—'} />)}
            {viewRep.feedback && (
              <View style={{ backgroundColor: 'rgba(52,211,153,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)', padding: 14, marginTop: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.green, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  PRL Feedback — {viewRep.feedbackBy}
                </Text>
                <Text style={Typography.body}>{viewRep.feedback}</Text>
              </View>
            )}
          </>
        )}
      </BottomSheet>
    </Screen>
  );
}

/* ══════════════════════════════════════════════
   PL MONITORING
══════════════════════════════════════════════ */
export function PLMonitoring() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const allReports = await ReportsService.getAll();
        const allUsers = await AuthService.getUsers();
        const totalReports = allReports.length;
        const reviewed = allReports.filter(r => r.status === 'reviewed').length;
        const pending = totalReports - reviewed;
        const avgAttendance = totalReports
          ? Math.round(
              allReports.reduce((sum, r) => sum + attPct(r.studentsPresent, r.registeredStudents), 0) / totalReports
            )
          : 0;
        setStats({
          totalReports,
          reviewed,
          pending,
          avgAttendance,
          totalLecturers: allUsers.filter(u => u.role === 'lecturer').length,
          totalStudents: allUsers.filter(u => u.role === 'student').length,
        });
      } catch (e) { console.warn(e); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader
        title="System Monitoring"
        subtitle="Institution-wide metrics"
        right={<Button title="Excel" icon="download-outline" small variant="ghost" onPress={() => Linking.openURL(ExcelAPI.reports())} />}
      />
      <View style={SharedStyles.row}>
        <StatCard label="Total Reports" value={stats?.totalReports ?? 0} accentColor={Colors.blue} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Reviewed" value={stats?.reviewed ?? 0} accentColor={Colors.green} style={{ flex: 1, margin: 4 }} />
      </View>
      <View style={[SharedStyles.row, { marginTop: 0 }]}>
        <StatCard label="Pending" value={stats?.pending ?? 0} accentColor={Colors.yellow} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Avg Attendance" value={`${stats?.avgAttendance ?? 0}%`} accentColor={Colors.purple} style={{ flex: 1, margin: 4 }} />
      </View>
      <View style={[SharedStyles.row, { marginTop: 0 }]}>
        <StatCard label="Lecturers" value={stats?.totalLecturers ?? 0} accentColor={Colors.cyan} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Students" value={stats?.totalStudents ?? 0} accentColor={Colors.purple} style={{ flex: 1, margin: 4 }} />
      </View>
    </Screen>
  );
}

/* ══════════════════════════════════════════════
   PL LECTURERS
══════════════════════════════════════════════ */
export function PLLecturers() {
  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sq, setSq] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [l, c, r] = await Promise.all([
          AuthService.getUsers('lecturer'),
          CoursesService.getAll(),
          ReportsService.getAll(),
        ]);
        setLecturers(l || []);
        setCourses(c || []);
        setReports(r || []);
      } catch (e) { console.warn(e); }
      setLoading(false);
    })();
  }, []);

  function getInfo(uid) {
    const assigned = courses.filter(c => c.assignedLecturerId === uid).length;
    const lr = reports.filter(r => r.lecturerId === uid);
    const p = lr.reduce((s, r) => s + Number(r.studentsPresent || 0), 0);
    const g = lr.reduce((s, r) => s + Number(r.registeredStudents || 0), 0);
    const sessions = lr.length;
    const pct = attPct(p, g);
    return { courses: assigned, sessions, pct };
  }

  const filtered = lecturers.filter(l =>
    !sq ||
    l.name?.toLowerCase().includes(sq.toLowerCase()) ||
    l.department?.toLowerCase().includes(sq.toLowerCase())
  );

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader title="Lecturers" subtitle={`${lecturers.length} registered`} />
      <SearchBar value={sq} onChangeText={setSq} placeholder="Search name or department…" />
      {filtered.map(l => {
        const info = getInfo(l.uid || l.id);
        return (
          <Card key={l.id} style={{ marginBottom: 10, padding: 16 }}>
            <View style={SharedStyles.between}>
              <View style={{ flex: 1 }}>
                <Text style={Typography.h4}>{l.name}</Text>
                <Text style={[Typography.sm, { marginTop: 2 }]}>{l.department || '—'} · {l.staffId || '—'}</Text>
                <Text style={[Typography.sm, { marginTop: 2 }]} numberOfLines={1}>{l.faculty}</Text>
              </View>
            </View>
            <View style={[SharedStyles.row, { marginTop: 12, justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border }]}>
              {[
                ['Courses', info.courses],
                ['Sessions', info.sessions],
                ['Avg Att.', `${info.pct}%`]
              ].map(([lbl, val]) => (
                <View key={lbl} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.t1 }}>{val}</Text>
                  <Text style={Typography.sm}>{lbl}</Text>
                </View>
              ))}
            </View>
          </Card>
        );
      })}
      {!filtered.length && <Empty icon="👨‍🏫" title="No lecturers found" />}
    </Screen>
  );
}

/* ══════════════════════════════════════════════
   PL CLASSES – derived from courses
══════════════════════════════════════════════ */
export function PLClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sq, setSq] = useState('');

  useEffect(() => {
    CoursesService.getAll()
      .then(data => {
        const transformed = (data || []).map(course => ({
          className: course.name,
          courseCode: course.code,
          sessions: 0,
          avgAttendance: 0,
          lecturer: course.assignedLecturerName || 'Not assigned',
          faculty: course.faculty,
        }));
        setClasses(transformed);
        setLoading(false);
      })
      .catch(() => {
        setClasses([]);
        setLoading(false);
      });
  }, []);

  const filtered = classes.filter(c =>
    !sq ||
    c.className?.toLowerCase().includes(sq.toLowerCase()) ||
    c.courseCode?.toLowerCase().includes(sq.toLowerCase()) ||
    c.lecturer?.toLowerCase().includes(sq.toLowerCase())
  );

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader title="All Classes" subtitle="Classes across all faculties (from courses)" />
      <SearchBar value={sq} onChangeText={setSq} placeholder="Search class, course, lecturer…" />
      {filtered.length === 0 ? (
        <Empty icon="🏫" title="No class data yet" subtitle="No courses found" />
      ) : (
        filtered.map((c, i) => (
          <Card key={i} style={{ marginBottom: 10, padding: 16 }}>
            <View style={SharedStyles.between}>
              <View>
                <Text style={Typography.h4}>{c.className}</Text>
                <Text style={Typography.sm}>{c.courseCode}</Text>
              </View>
              <Badge text="Course" color={Colors.blue} />
            </View>
            <Text style={[Typography.sm, { marginTop: 6 }]}>👨‍🏫 {c.lecturer}</Text>
            <Text style={[Typography.sm, { marginTop: 3 }]}>{c.faculty}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

/* 
   PL RATING
 */
export function PLRating() {
  const { profile } = useAuth();
  const [lecturers, setLecturers] = useState([]);
  const [allRatings, setAllRatings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ targetId: '', score: 0, category: RATING_CATEGORIES[0], comment: '' });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sq, setSq] = useState('');

  const load = async () => {
    try {
      const [l, all] = await Promise.all([
        AuthService.getUsers('lecturer'),
        RatingsService.getAll(),
      ]);
      setLecturers(l || []);
      setAllRatings(all || []);
    } catch (e) { console.warn(e); }
    setLoading(false);
  };

  useEffect(() => { if (profile?.uid) load(); }, [profile]);

  async function handleSubmit() {
    if (!form.targetId || form.score === 0) { Alert.alert('Error', 'Select lecturer and give rating'); return; }
    setBusy(true);
    try {
      const target = lecturers.find(l => (l.uid || l.id) === form.targetId);
      await RatingsService.submit({
        ...form,
        targetName: target?.name || '',
        submittedBy: profile.uid,
        submittedByName: profile.name,
        submitterRole: profile.role,
      });
      Alert.alert('✅', 'Rating submitted!');
      setForm({ targetId: '', score: 0, category: RATING_CATEGORIES[0], comment: '' });
      setShowForm(false);
      load();
    } catch (e) { Alert.alert('Error', e.message); }
    setBusy(false);
  }

  function avgFor(uid) {
    const rs = allRatings.filter(r => r.targetId === uid);
    return rs.length ? (rs.reduce((s, r) => s + (r.score || 0), 0) / rs.length).toFixed(1) : null;
  }

  const filtered = lecturers.filter(l => !sq || l.name?.toLowerCase().includes(sq.toLowerCase()));
  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader
        title="Ratings"
        subtitle="System-wide lecturer ratings"
        right={
          <>
            <Button title="Rate" icon="star-outline" small onPress={() => setShowForm(true)} style={{ marginRight: 6 }} />
            <Button title="Excel" icon="download-outline" small variant="ghost" onPress={() => Linking.openURL(ExcelAPI.ratings())} />
          </>
        }
      />
      <SearchBar value={sq} onChangeText={setSq} placeholder="Search lecturers…" />
      {filtered.map(l => {
        const avg = avgFor(l.uid || l.id);
        const cnt = allRatings.filter(r => r.targetId === (l.uid || l.id)).length;
        return (
          <Card key={l.id} style={{ marginBottom: 10, padding: 16 }}>
            <View style={[SharedStyles.between, { marginBottom: 8 }]}>
              <View>
                <Text style={Typography.h4}>{l.name}</Text>
                <Text style={Typography.sm}>{l.department || '—'}</Text>
              </View>
              {avg && <Badge text={`${avg}★`} color={Colors.yellow} />}
            </View>
            {avg ? (
              <View style={SharedStyles.row}>
                <StarRating value={Math.round(Number(avg))} readonly size={20} />
                <Text style={[Typography.sm, { marginLeft: 8 }]}>({cnt})</Text>
              </View>
            ) : (
              <Text style={Typography.sm}>No ratings yet</Text>
            )}
          </Card>
        );
      })}
      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} title="⭐ Rate Lecturer">
        <Picker
          label="Lecturer *"
          value={form.targetId}
          options={filtered.map(l => ({ value: l.uid || l.id, label: l.name }))}
          onChange={v => setForm(f => ({ ...f, targetId: v }))}
        />
        <Picker
          label="Category *"
          value={form.category}
          options={RATING_CATEGORIES}
          onChange={v => setForm(f => ({ ...f, category: v }))}
        />
        <View style={SharedStyles.fgroup}>
          <Text style={SharedStyles.label}>Rating *</Text>
          <StarRating value={form.score} onChange={s => setForm(f => ({ ...f, score: s }))} size={34} />
        </View>
        <Input
          label="Comment"
          value={form.comment}
          onChangeText={v => setForm(f => ({ ...f, comment: v }))}
          placeholder="Feedback…"
          multiline
        />
        <Button title="Submit" onPress={handleSubmit} loading={busy} style={{ marginTop: 8 }} />
      </BottomSheet>
    </Screen>
  );
}