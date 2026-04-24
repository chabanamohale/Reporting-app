import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { AttendanceService, RatingsService, AuthService, ReportsService } from '../../services/firestoreService';
import {
  Screen, PageHeader, Card, Button, Picker, Input,
  Badge, ProgressBar, Empty, Loader, SearchBar, StarRating, InfoRow, BottomSheet,
} from '../../components';
import { Colors, Typography, SharedStyles } from '../../utils/theme';
import { attPct, attColor, RATING_CATEGORIES } from '../../utils/helpers';

/* 
   STUDENT ATTENDANCE (mark & history)
 */
export function AttendanceScreen() {
  const { profile } = useAuth();
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selCourse, setSelCourse] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState({});
  const [tab, setTab] = useState('mark');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sq, setSq] = useState('');

  useEffect(() => {
    Promise.all([AuthService.getUsers('student'), AttendanceService.getAll(), ReportsService.getAll()])
      .then(([s, a, r]) => {
        setStudents(s || []);
        setRecords(a || []);
        const codes = [...new Set((r || []).map(x => x.courseCode))].filter(Boolean);
        setCourses(codes);
        if (codes.length) setSelCourse(codes[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function saveAttendance() {
    if (!selCourse) { Alert.alert('Error', 'Select a course'); return; }
    if (!Object.keys(marks).length) { Alert.alert('Error', 'Mark at least one student'); return; }
    setBusy(true);
    try {
      const recs = students.map(s => ({
        studentId: s.uid || s.id,
        studentName: s.name || '',
        courseCode: selCourse,
        date,
        present: marks[s.uid || s.id] === true,
        markedBy: profile.uid,
        markedByName: profile.name,
      }));
      await AttendanceService.bulkSave(recs);
      Alert.alert('✅ Saved', 'Attendance recorded!');
      setMarks({});
      const a = await AttendanceService.getAll();
      setRecords(a || []);
    } catch (e) { Alert.alert('Error', e.message); }
    setBusy(false);
  }

  const filtStudents = students.filter(s => !sq || s.name?.toLowerCase().includes(sq.toLowerCase()) || s.studentId?.toLowerCase().includes(sq.toLowerCase()));
  const histFiltered = records.filter(a => a.courseCode === selCourse && (!sq || a.studentName?.toLowerCase().includes(sq.toLowerCase())));

  function getRate(sid) {
    const sa = records.filter(a => a.studentId === sid && a.courseCode === selCourse);
    return sa.length ? attPct(sa.filter(a => a.present).length, sa.length) : null;
  }

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader title="Student Attendance" subtitle="Mark and review attendance" />

      {/* Filters */}
      <Card style={{ marginBottom: 12, padding: 14 }}>
        <Picker label="Course" value={selCourse} options={courses.length ? courses : ['No courses yet']} onChange={setSelCourse} />
        <Input label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
      </Card>

      {/* Tabs */}
      <View style={[SharedStyles.row, { backgroundColor: Colors.bg2, borderRadius: 8, padding: 4, marginBottom: 14, gap: 3 }]}>
        {['mark', 'history', 'summary'].map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}>
            <Text style={[s.tabText, tab === t && { color: Colors.blueL }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SearchBar value={sq} onChangeText={setSq} placeholder="Search students…" />

      {tab === 'mark' && (
        <>
          <View style={[SharedStyles.between, { marginBottom: 10 }]}>
            <Text style={Typography.h4}>Mark for {date}</Text>
            <View style={SharedStyles.row}>
              <Button title="All ✓" variant="ghost" small onPress={() => { const m = {}; filtStudents.forEach(s => m[s.uid || s.id] = true); setMarks(m); }} style={{ marginRight: 6 }} />
              <Button title="Save" small loading={busy} onPress={saveAttendance} />
            </View>
          </View>
          {filtStudents.map(st => {
            const sid = st.uid || st.id;
            return (
              <Card key={sid} style={{ marginBottom: 8, padding: 12 }}>
                <View style={SharedStyles.between}>
                  <View>
                    <Text style={Typography.h4}>{st.name}</Text>
                    <Text style={Typography.sm}>{st.studentId || '—'} · {st.faculty?.split(' Faculty of ').pop()}</Text>
                  </View>
                  <View style={SharedStyles.row}>
                    <TouchableOpacity
                      onPress={() => setMarks(m => ({ ...m, [sid]: true }))}
                      style={[s.markBtn, { backgroundColor: marks[sid] === true ? Colors.green : Colors.bg2 }]}>
                      <Ionicons name="checkmark" size={16} color={marks[sid] === true ? '#fff' : Colors.t3} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setMarks(m => ({ ...m, [sid]: false }))}
                      style={[s.markBtn, { backgroundColor: marks[sid] === false ? Colors.red : Colors.bg2, marginLeft: 6 }]}>
                      <Ionicons name="close" size={16} color={marks[sid] === false ? '#fff' : Colors.t3} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })}
          {!filtStudents.length && <Empty icon="👥" title="No students found" />}
        </>
      )}

      {tab === 'history' && (
        <>
          {histFiltered.slice(0, 50).map((a, i) => (
            <Card key={i} style={{ marginBottom: 6, padding: 12 }}>
              <View style={SharedStyles.between}>
                <View>
                  <Text style={Typography.h4}>{a.studentName}</Text>
                  <Text style={Typography.sm}>{a.courseCode} · {a.date}</Text>
                </View>
                <Badge text={a.present ? 'Present' : 'Absent'} color={a.present ? Colors.green : Colors.red} />
              </View>
            </Card>
          ))}
          {!histFiltered.length && <Empty icon="📋" title="No records for this course" />}
        </>
      )}

      {tab === 'summary' && (
        <>
          {students.map(st => {
            const rate = getRate(st.uid || st.id);
            return (
              <Card key={st.id} style={{ marginBottom: 8, padding: 14 }}>
                <View style={SharedStyles.between}>
                  <Text style={Typography.h4}>{st.name}</Text>
                  {rate !== null && <Badge text={rate >= 75 ? 'Good' : rate >= 50 ? 'Warning' : 'At Risk'} color={rate >= 75 ? Colors.green : rate >= 50 ? Colors.yellow : Colors.red} />}
                </View>
                {rate !== null ? (
                  <View style={{ marginTop: 8 }}>
                    <View style={SharedStyles.between}>
                      <Text style={Typography.sm}>Attendance Rate</Text>
                      <Text style={[Typography.sm, { color: attColor(rate), fontWeight: '700' }]}>{rate}%</Text>
                    </View>
                    <View style={{ marginTop: 5 }}><ProgressBar pct={rate} /></View>
                  </View>
                ) : <Text style={[Typography.sm, { marginTop: 6 }]}>No data for this course</Text>}
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}

/* 
   MY RATINGS (lecturer sees ratings received)
 */
export function LecturerRatingScreen() {
  const { profile } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sq, setSq] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;
    RatingsService.getForTarget(profile.uid)
      .then(r => { setRatings(r || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [profile]);

  const avg = ratings.length
    ? (ratings.reduce((s, r) => s + (r.score || 0), 0) / ratings.length).toFixed(1)
    : null;

  const filtered = ratings.filter(r => !sq || r.submittedByName?.toLowerCase().includes(sq.toLowerCase()) || r.category?.toLowerCase().includes(sq.toLowerCase()));

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader title="My Ratings" subtitle={`${ratings.length} rating${ratings.length !== 1 ? 's' : ''} received`} />

      {/* Overview */}
      <Card style={{ marginBottom: 14, padding: 20, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'System', fontSize: 52, fontWeight: '800', color: Colors.yellow, lineHeight: 60 }}>{avg || '—'}</Text>
        {avg && <StarRating value={Math.round(Number(avg))} readonly size={28} />}
        <Text style={[Typography.sm, { marginTop: 8 }]}>{ratings.length} total ratings</Text>
      </Card>

      {/* Star breakdown */}
      <Card style={{ marginBottom: 14, padding: 16 }}>
        <Text style={[Typography.h4, { marginBottom: 12 }]}>Breakdown</Text>
        {[5, 4, 3, 2, 1].map(star => {
          const cnt = ratings.filter(r => r.score === star).length;
          const pct = ratings.length ? (cnt / ratings.length) * 100 : 0;
          return (
            <View key={star} style={[SharedStyles.row, { marginBottom: 8, gap: 8 }]}>
              <Text style={[Typography.sm, { width: 24 }]}>{star}★</Text>
              <View style={{ flex: 1 }}><ProgressBar pct={pct} color={Colors.yellow} /></View>
              <Text style={[Typography.sm, { width: 20, textAlign: 'right' }]}>{cnt}</Text>
            </View>
          );
        })}
      </Card>

      <SearchBar value={sq} onChangeText={setSq} placeholder="Search ratings…" />

      {filtered.map((r, i) => (
        <Card key={i} style={{ marginBottom: 8, padding: 14 }}>
          <View style={SharedStyles.between}>
            <View>
              <Text style={Typography.h4}>{r.submittedByName || 'Anonymous'}</Text>
              <Text style={Typography.sm}>{r.category}</Text>
            </View>
            <StarRating value={r.score} readonly size={20} />
          </View>
          {r.comment ? <Text style={[Typography.sm, { marginTop: 8, color: Colors.t1 }]}>{r.comment}</Text> : null}
        </Card>
      ))}
      {!filtered.length && <Empty icon="⭐" title="No ratings yet" subtitle="Students will rate you after lectures" />}
    </Screen>
  );
}

const s = StyleSheet.create({
  tabBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 6 },
  tabBtnActive: { backgroundColor: Colors.bg1 },
  tabText: { fontSize: 12, fontWeight: '700', color: Colors.t3 },
  markBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});