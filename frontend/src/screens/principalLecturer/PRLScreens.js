import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Alert, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import {
  ReportsService, CoursesService, RatingsService, AuthService, ClassesService
} from '../../services/firestoreService';
import {
  Screen, PageHeader, Card, StatCard, Button, Input, Picker,
  Badge, ProgressBar, Empty, Loader, SearchBar, StarRating, InfoRow, BottomSheet,
} from '../../components';
import { Colors, Typography, SharedStyles } from '../../utils/theme';
import { attPct, attColor, RATING_CATEGORIES } from '../../utils/helpers';

const W = Dimensions.get('window').width - 52;
const CHART_CFG = {
  backgroundColor: Colors.bg1, backgroundGradientFrom: Colors.bg1, backgroundGradientTo: Colors.bg1,
  color: (o = 1) => `rgba(59,130,246,${o})`, labelColor: () => Colors.t3,
  propsForDots: { r: '4', fill: Colors.blue },
};

/* 
   PRL DASHBOARD
 */
export function PRLDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
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
          totalReports,
          pending,
          reviewed,
          avgAttendance,
          totalLecturers: lecturers.length,
          totalStudents: students.length,
        });
      } catch (e) {
        console.warn(e);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader title="PRL Dashboard" subtitle={profile?.faculty || 'Principal Lecturer'} />
      <View style={SharedStyles.row}>
        <StatCard label="Reports" value={stats?.totalReports ?? 0} accentColor={Colors.blue} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Pending" value={stats?.pending ?? 0} accentColor={Colors.yellow} style={{ flex: 1, margin: 4 }} />
      </View>
      <View style={[SharedStyles.row, { marginTop: 0 }]}>
        <StatCard label="Reviewed" value={stats?.reviewed ?? 0} accentColor={Colors.green} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Avg Att." value={`${stats?.avgAttendance ?? 0}%`} accentColor={Colors.purple} style={{ flex: 1, margin: 4 }} />
      </View>
      <View style={[SharedStyles.row, { marginTop: 0 }]}>
        <StatCard label="Lecturers" value={stats?.totalLecturers ?? 0} accentColor={Colors.cyan} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Students" value={stats?.totalStudents ?? 0} accentColor={Colors.purple} style={{ flex: 1, margin: 4 }} />
      </View>
    </Screen>
  );
}

/* 
   PRL REPORTS + FEEDBACK
*/
export function PRLReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState([]);
  const [viewRep, setViewRep] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sq, setSq] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await ReportsService.getAll();
      setReports(data || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitFeedback() {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Please enter feedback text');
      return;
    }
    setBusy(true);
    try {
      await ReportsService.addFeedback(viewRep.id, feedback, profile.name);
      Alert.alert('✅ Feedback submitted!');
      setFeedback('');
      setViewRep(v => ({ ...v, feedback, status: 'reviewed', feedbackBy: profile.name }));
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setBusy(false);
  }

  const filtered = reports.filter(r => {
    const mS = !sq ||
      [r.lecturerName, r.courseName, r.courseCode, r.topicTaught]
        .some(v => v?.toLowerCase().includes(sq.toLowerCase()));
    const mF = filter === 'all' || r.status === filter;
    return mS && mF;
  });

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader title="Lecture Reports" subtitle="Review and add feedback" />

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

      <SearchBar value={sq} onChangeText={setSq} placeholder="Search lecturer, course, topic…" />

      {filtered.length === 0 ? (
        <Empty icon="📋" title="No reports found" />
      ) : (
        filtered.map(r => {
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
              <Text style={[Typography.sm, { marginTop: 6 }]} numberOfLines={1}>📖 {r.topicTaught}</Text>
              <View style={{ marginTop: 8 }}>
                <View style={SharedStyles.between}>
                  <Text style={Typography.sm}>Attendance</Text>
                  <Text style={[Typography.sm, { color: attColor(pct), fontWeight: '700' }]}>{pct}%</Text>
                </View>
                <View style={{ marginTop: 4 }}><ProgressBar pct={pct} /></View>
              </View>
              <Button
                title={r.status === 'reviewed' ? 'View / Edit Feedback' : 'Review & Add Feedback'}
                variant={r.status === 'reviewed' ? 'ghost' : 'primary'}
                small
                icon="chatbubble-outline"
                style={{ marginTop: 12 }}
                onPress={() => { setViewRep(r); setFeedback(r.feedback || ''); }}
              />
            </Card>
          );
        })
      )}

      <BottomSheet visible={!!viewRep} onClose={() => setViewRep(null)} title="📋 Review Report" height="95%">
        {viewRep && (
          <>
            {[
              ['Faculty', viewRep.facultyName],
              ['Class', viewRep.className],
              ['Lecturer', viewRep.lecturerName],
              ['Course', `${viewRep.courseName} (${viewRep.courseCode})`],
              ['Week', viewRep.weekOfReporting],
              ['Date', viewRep.dateOfLecture],
              ['Time', viewRep.scheduledTime],
              ['Venue', viewRep.venue],
              ['Present', String(viewRep.studentsPresent)],
              ['Registered', String(viewRep.registeredStudents)],
              ['Attendance %', `${attPct(viewRep.studentsPresent, viewRep.registeredStudents)}%`],
            ].map(([l, v]) => <InfoRow key={l} label={l} value={v || '—'} />)}
            {[
              ['Topic Taught', viewRep.topicTaught],
              ['Learning Outcomes', viewRep.learningOutcomes],
              ['Recommendations', viewRep.recommendations],
            ].map(([l, v]) => <InfoRow key={l} label={l} value={v || '—'} />)}
            <View style={{ height: 16 }} />
            <Text style={SharedStyles.label}>Add / Edit Feedback</Text>
            <Input
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Write your review and recommendations for this lecturer…"
              multiline
              numberOfLines={5}
            />
            <Button title="Submit Feedback" onPress={submitFeedback} loading={busy} icon="checkmark-circle-outline" style={{ marginTop: 8 }} />
          </>
        )}
      </BottomSheet>
    </Screen>
  );
}

/* 
   PRL COURSES (view only)
 */
export function PRLCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sq, setSq] = useState('');

  useEffect(() => {
    CoursesService.getAll()
      .then(data => { setCourses(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = courses.filter(c =>
    !sq ||
    c.name?.toLowerCase().includes(sq.toLowerCase()) ||
    c.code?.toLowerCase().includes(sq.toLowerCase()) ||
    c.assignedLecturerName?.toLowerCase().includes(sq.toLowerCase())
  );

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader title="Courses" subtitle="All courses in your stream" />
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
          {c.schedule && <Text style={[Typography.sm, { marginTop: 4 }]}>🕐 {c.schedule}</Text>}
          <View style={[SharedStyles.between, { marginTop: 10 }]}>
            <Text style={[Typography.sm, { color: c.assignedLecturerId ? Colors.green : Colors.yellow }]}>
              {c.assignedLecturerName ? `✓ ${c.assignedLecturerName}` : '⚠ Unassigned'}
            </Text>
            <Badge text={c.assignedLecturerId ? 'Assigned' : 'Open'} color={c.assignedLecturerId ? Colors.green : Colors.yellow} />
          </View>
        </Card>
      ))}
      {!filtered.length && <Empty icon="📚" title="No courses found" />}
    </Screen>
  );
}

/* 
   PRL CLASSES – derived from courses
 */
export function PRLClasses() {
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
      <PageHeader title="Classes" subtitle="All class sessions (from courses)" />
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
   PRL MONITORING
*/
export function PRLMonitoring() {
  const [lecturers, setLecturers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sq, setSq] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [lec, rep] = await Promise.all([
          AuthService.getUsers('lecturer'),
          ReportsService.getAll(),
        ]);
        setLecturers(lec || []);
        setReports(rep || []);
      } catch (e) {
        console.warn(e);
      }
      setLoading(false);
    })();
  }, []);

  function lecStats(uid) {
    const lr = reports.filter(r => r.lecturerId === uid);
    const p = lr.reduce((s, r) => s + Number(r.studentsPresent || 0), 0);
    const g = lr.reduce((s, r) => s + Number(r.registeredStudents || 0), 0);
    const sessions = lr.length;
    const pct = attPct(p, g);
    const reviewed = lr.filter(r => r.status === 'reviewed').length;
    return { sessions, pct, reviewed };
  }

  const filtered = lecturers.filter(l =>
    !sq ||
    l.name?.toLowerCase().includes(sq.toLowerCase()) ||
    l.department?.toLowerCase().includes(sq.toLowerCase())
  );

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader title="Monitoring" subtitle="Lecturer performance" />
      <View style={SharedStyles.row}>
        <StatCard label="Reports" value={reports.length} accentColor={Colors.blue} style={{ flex: 1, margin: 4 }} />
        <StatCard label="Avg Att." value={`${Math.round(reports.reduce((s, r) => s + attPct(r.studentsPresent, r.registeredStudents), 0) / (reports.length || 1))}%`} accentColor={Colors.green} style={{ flex: 1, margin: 4 }} />
      </View>
      <SearchBar value={sq} onChangeText={setSq} placeholder="Search lecturers…" />
      <Text style={[Typography.h4, { marginBottom: 10 }]}>Lecturer Performance</Text>
      {filtered.map(l => {
        const st = lecStats(l.uid || l.id);
        return (
          <Card key={l.id} style={{ marginBottom: 10, padding: 16 }}>
            <View style={SharedStyles.between}>
              <View>
                <Text style={Typography.h4}>{l.name}</Text>
                <Text style={Typography.sm}>{l.department || '—'} · {st.sessions} sessions</Text>
              </View>
              <Badge text={st.pct >= 75 ? 'Good' : st.pct >= 50 ? 'Average' : 'Needs Attention'} color={attColor(st.pct)} />
            </View>
            <View style={{ marginTop: 8 }}>
              <View style={SharedStyles.between}>
                <Text style={Typography.sm}>Avg Attendance</Text>
                <Text style={[Typography.sm, { color: attColor(st.pct), fontWeight: '700' }]}>{st.pct}%</Text>
              </View>
              <View style={{ marginTop: 4 }}><ProgressBar pct={st.pct} /></View>
            </View>
            <Text style={[Typography.sm, { marginTop: 6 }]}>Reviews: {st.reviewed}/{st.sessions}</Text>
          </Card>
        );
      })}
      {!filtered.length && <Empty icon="👨‍🏫" title="No lecturers found" />}
    </Screen>
  );
}

/* 
   PRL RATING
 */
export function PRLRating() {
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
    } catch (e) {
      console.warn(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.uid) load();
  }, [profile]);

  async function handleSubmit() {
    if (!form.targetId || form.score === 0) {
      Alert.alert('Error', 'Select lecturer and give rating');
      return;
    }
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
      Alert.alert('⭐ Submitted', 'Rating saved!');
      setForm({ targetId: '', score: 0, category: RATING_CATEGORIES[0], comment: '' });
      setShowForm(false);
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
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
        subtitle="Rate lecturers in your stream"
        right={<Button title="Rate" icon="star-outline" small onPress={() => setShowForm(true)} />}
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
                <Text style={[Typography.sm, { marginLeft: 8 }]}>({cnt} ratings)</Text>
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