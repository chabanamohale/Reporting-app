import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Alert, StyleSheet, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { ReportsService } from '../../services/firestoreService';
import {
  Screen, PageHeader, Card, Button, Input, Picker,
  Badge, ProgressBar, BottomSheet, InfoRow, Empty, Loader, SearchBar,
} from '../../components';
import { Colors, Typography, SharedStyles } from '../../utils/theme';
import { attPct, FACULTIES, WEEKS, TIMES } from '../../utils/helpers';

const BLANK = {
  facultyName: '', className: '', weekOfReporting: 'Week 1',
  dateOfLecture: '', courseName: '', courseCode: '', lecturerName: '',
  studentsPresent: '', registeredStudents: '', venue: '',
  scheduledTime: '09:00', topicTaught: '', learningOutcomes: '', recommendations: '',
};

export default function ReportsScreen() {
  const { profile } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewRep, setViewRep] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const data = await ReportsService.getByLecturer(profile?.uid);
      setReports(data || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setLoading(false);
    setRefresh(false);
  }, [profile]);

  useEffect(() => {
    if (profile?.name) setForm(f => ({ ...f, lecturerName: profile.name }));
    load();
  }, [profile, load]);

  async function handleCourseCodeChange(val) {
    setForm(f => ({ ...f, courseCode: val }));
  }

  async function handleSubmit() {
    const required = [
      'facultyName', 'className', 'weekOfReporting', 'dateOfLecture',
      'courseName', 'courseCode', 'lecturerName', 'studentsPresent', 'registeredStudents',
      'venue', 'scheduledTime', 'topicTaught', 'learningOutcomes',
    ];
    const missing = required.filter(k => !form[k]);
    if (missing.length) {
      Alert.alert('Missing Fields', missing.join(', '));
      return;
    }
    setBusy(true);
    try {
      // ✅ ADD LECTURER ID
      await ReportsService.create({
        ...form,
        lecturerId: profile.uid,
      });
      Alert.alert('✅ Success', 'Report submitted successfully!');
      setShowForm(false);
      setForm({ ...BLANK, lecturerName: profile?.name || '' });
      load();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setBusy(false);
  }

  async function handleDelete(id) {
    Alert.alert('Delete Report', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await ReportsService.delete(id);
            load();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  const filtered = reports.filter(r => {
    const mS = !search ||
      [r.courseName, r.courseCode, r.topicTaught, r.className, r.weekOfReporting]
        .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const mF = filter === 'all' || r.status === filter;
    return mS && mF;
  });

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader
        title="Lecture Reports"
        subtitle={`${reports.length} total`}
        right={<Button title="New" icon="add" small onPress={() => setShowForm(true)} />}
      />

      <View style={[SharedStyles.row, { marginBottom: 12, gap: 8 }]}>
        {['all', 'submitted', 'reviewed'].map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
          >
            <Text style={[s.filterText, filter === f && { color: Colors.blueL }]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search course, topic, week…" />

      <View style={[SharedStyles.row, { marginBottom: 14, gap: 8 }]}>
        {[
          { label: 'Total', val: reports.length, color: Colors.blue },
          { label: 'Reviewed', val: reports.filter(r => r.status === 'reviewed').length, color: Colors.green },
          { label: 'Pending', val: reports.filter(r => r.status === 'submitted').length, color: Colors.yellow },
        ].map(st => (
          <View key={st.label} style={[s.miniStat, { borderColor: `${st.color}30` }]}>
            <Text style={[s.miniVal, { color: st.color }]}>{st.val}</Text>
            <Text style={s.miniLbl}>{st.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); load(); }} />}
      >
        {filtered.length === 0 ? (
          <Empty icon="📋" title="No reports" subtitle='Tap "New" to submit your first report' />
        ) : (
          filtered.map(r => {
            const pct = attPct(r.studentsPresent, r.registeredStudents);
            return (
              <Card key={r.id} style={{ marginBottom: 10 }}>
                <View style={SharedStyles.between}>
                  <View style={{ flex: 1 }}>
                    <Text style={Typography.h4}>{r.courseCode} — {r.weekOfReporting}</Text>
                    <Text style={[Typography.sm, { marginTop: 2 }]}>{r.courseName}</Text>
                  </View>
                  <Badge text={r.status} color={r.status === 'reviewed' ? Colors.green : Colors.yellow} />
                </View>

                <View style={[SharedStyles.row, { marginTop: 10, gap: 8 }]}>
                  <Ionicons name="calendar-outline" size={13} color={Colors.t3} />
                  <Text style={Typography.sm}>{r.dateOfLecture}</Text>
                  <Ionicons name="location-outline" size={13} color={Colors.t3} style={{ marginLeft: 8 }} />
                  <Text style={Typography.sm} numberOfLines={1}>{r.venue}</Text>
                </View>

                <Text style={[Typography.sm, { marginTop: 6 }]} numberOfLines={2}>📖 {r.topicTaught}</Text>

                <View style={{ marginTop: 10 }}>
                  <View style={SharedStyles.between}>
                    <Text style={Typography.sm}>Attendance</Text>
                    <Text style={[Typography.sm, { color: Colors.t1, fontWeight: '700' }]}>
                      {r.studentsPresent}/{r.registeredStudents} ({pct}%)
                    </Text>
                  </View>
                  <View style={{ marginTop: 5 }}><ProgressBar pct={pct} /></View>
                </View>

                {r.feedback ? (
                  <View style={s.feedbackBox}>
                    <Text style={s.feedbackTitle}>💬 PRL Feedback — {r.feedbackBy}</Text>
                    <Text style={[Typography.sm, { color: Colors.t1, marginTop: 4 }]}>{r.feedback}</Text>
                  </View>
                ) : null}

                <View style={[SharedStyles.row, { marginTop: 12, gap: 8 }]}>
                  <Button title="View" variant="ghost" small icon="eye-outline" onPress={() => setViewRep(r)} style={{ flex: 1 }} />
                  <Button title="Delete" variant="danger" small icon="trash-outline" onPress={() => handleDelete(r.id)} style={{ flex: 1 }} />
                </View>
              </Card>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} title="📝 New Lecture Report" height="95%">
        <Text style={[Typography.sm, { marginBottom: 14, color: Colors.t2 }]}>All fields marked * are required.</Text>

        <Picker label="Faculty Name *" value={form.facultyName} options={FACULTIES} onChange={v => setForm(f => ({ ...f, facultyName: v }))} />
        <Input label="Class Name *" value={form.className} onChangeText={v => setForm(f => ({ ...f, className: v }))} placeholder="e.g. BSc SE Year 2 — Group A" />
        <Picker label="Week of Reporting *" value={form.weekOfReporting} options={WEEKS} onChange={v => setForm(f => ({ ...f, weekOfReporting: v }))} />
        <Input label="Date of Lecture *" value={form.dateOfLecture} onChangeText={v => setForm(f => ({ ...f, dateOfLecture: v }))} placeholder="YYYY-MM-DD" />
        <Picker label="Scheduled Lecture Time *" value={form.scheduledTime} options={TIMES} onChange={v => setForm(f => ({ ...f, scheduledTime: v }))} />
        <Input label="Course Name *" value={form.courseName} onChangeText={v => setForm(f => ({ ...f, courseName: v }))} placeholder="e.g. Software Engineering" />
        <Input label="Course Code *" value={form.courseCode} onChangeText={handleCourseCodeChange} placeholder="e.g. SE401" />
        <Input label="Lecturer's Name *" value={form.lecturerName} onChangeText={v => setForm(f => ({ ...f, lecturerName: v }))} placeholder="Full name" />
        <Input label="Students Present *" value={form.studentsPresent} onChangeText={v => setForm(f => ({ ...f, studentsPresent: v }))} placeholder="0" keyboardType="numeric" />
        <Input label="Total Registered Students *" value={form.registeredStudents} onChangeText={v => setForm(f => ({ ...f, registeredStudents: v }))} placeholder="e.g. 45" keyboardType="numeric" />
        <Input label="Venue *" value={form.venue} onChangeText={v => setForm(f => ({ ...f, venue: v }))} placeholder="e.g. Room A201, ICT Block" />
        <Input label="Topic Taught *" value={form.topicTaught} onChangeText={v => setForm(f => ({ ...f, topicTaught: v }))} placeholder="Main topic for this lecture" />
        <Input label="Learning Outcomes *" value={form.learningOutcomes} onChangeText={v => setForm(f => ({ ...f, learningOutcomes: v }))} placeholder="Students should be able to…" multiline />
        <Input label="Lecturer's Recommendations" value={form.recommendations} onChangeText={v => setForm(f => ({ ...f, recommendations: v }))} placeholder="Any observations or recommendations…" multiline />

        <Button title="Submit Report" onPress={handleSubmit} loading={busy} icon="checkmark-circle-outline" style={{ marginTop: 8 }} />
      </BottomSheet>

      <BottomSheet visible={!!viewRep} onClose={() => setViewRep(null)} title="📋 Report Detail" height="92%">
        {viewRep && (
          <>
            {[
              ['Faculty Name', viewRep.facultyName],
              ['Class Name', viewRep.className],
              ['Week', viewRep.weekOfReporting],
              ['Date', viewRep.dateOfLecture],
              ['Scheduled Time', viewRep.scheduledTime],
              ['Course Name', viewRep.courseName],
              ['Course Code', viewRep.courseCode],
              ["Lecturer's Name", viewRep.lecturerName],
              ['Students Present', viewRep.studentsPresent],
              ['Registered Students', viewRep.registeredStudents],
              ['Attendance %', `${attPct(viewRep.studentsPresent, viewRep.registeredStudents)}%`],
              ['Venue', viewRep.venue],
              ['Status', viewRep.status],
            ].map(([l, v]) => <InfoRow key={l} label={l} value={String(v || '—')} />)}
            <View style={{ height: 12 }} />
            {[
              ['Topic Taught', viewRep.topicTaught],
              ['Learning Outcomes', viewRep.learningOutcomes],
              ['Recommendations', viewRep.recommendations],
            ].map(([l, v]) => <InfoRow key={l} label={l} value={v || '—'} />)}
            {viewRep.feedback && (
              <View style={[s.feedbackBox, { marginTop: 14 }]}>
                <Text style={s.feedbackTitle}>💬 PRL Feedback — {viewRep.feedbackBy}</Text>
                <Text style={[Typography.body, { marginTop: 6 }]}>{viewRep.feedback}</Text>
              </View>
            )}
          </>
        )}
      </BottomSheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: {
    backgroundColor: Colors.blueDim,
    borderColor: `${Colors.blue}40`,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.t3,
  },
  miniStat: {
    flex: 1,
    backgroundColor: Colors.bg1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  miniVal: {
    fontSize: 20,
    fontWeight: '800',
  },
  miniLbl: {
    fontSize: 10,
    color: Colors.t3,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  feedbackBox: {
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
    padding: 12,
    marginTop: 10,
  },
  feedbackTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.green,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});