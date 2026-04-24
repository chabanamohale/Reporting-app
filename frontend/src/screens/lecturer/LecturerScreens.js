import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { ReportsService, CoursesService, RatingsService, AuthService } from '../../services/firestoreService';
import {
  Screen, PageHeader, Card, StatCard, ProgressBar, Badge, Empty, Loader, SearchBar
} from '../../components';
import { Colors, Typography, SharedStyles } from '../../utils/theme';
import { attPct, attColor } from '../../utils/helpers';

const W = Dimensions.get('window').width - 52;
const CHART_CFG = {
  backgroundColor: Colors.bg1,
  backgroundGradientFrom: Colors.bg1,
  backgroundGradientTo: Colors.bg1,
  color: (o = 1) => `rgba(59,130,246,${o})`,
  labelColor: () => Colors.t3,
  style: { borderRadius: 12 },
  propsForDots: { r: '4', fill: Colors.blue },
};

/* 
   LECTURER DASHBOARD
*/
export function LecturerDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!profile?.uid) return;
    try {
      const reportsData = await ReportsService.getByLecturer(profile.uid);
      setReports(reportsData || []);

      // Manual stats calculation from reports
      const totalReports = reportsData.length;
      const reviewed = reportsData.filter(r => r.status === 'reviewed').length;
      const avgAttendance = reportsData.length
        ? Math.round(
            reportsData.reduce(
              (sum, r) => sum + attPct(r.studentsPresent, r.registeredStudents),
              0
            ) / reportsData.length
          )
        : 0;

      // Weekly attendance grouping
      const weeklyMap = {};
      reportsData.forEach(r => {
        const week = r.weekOfReporting;
        if (!weeklyMap[week]) weeklyMap[week] = { present: 0, total: 0 };
        weeklyMap[week].present += Number(r.studentsPresent || 0);
        weeklyMap[week].total += Number(r.registeredStudents || 0);
      });
      const weekly = Object.entries(weeklyMap)
        .map(([week, data]) => ({ week, pct: attPct(data.present, data.total) }))
        .sort((a, b) => a.week.localeCompare(b.week));

      // Ratings
      const ratingsData = await RatingsService.getForTarget(profile.uid);
      const avgRating = ratingsData.length
        ? (ratingsData.reduce((s, r) => s + (r.score || 0), 0) / ratingsData.length).toFixed(1)
        : null;

      setStats({ totalReports, reviewed, avgAttendance, weekly, avgRating });
    } catch (err) {
      console.warn('Dashboard load error:', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [profile]);

  if (loading) return <Screen><Loader /></Screen>;

  const weekly = stats?.weekly || [];
  const chartLabels = weekly.map(w => w.week.replace('Week ', 'W'));
  const chartData = weekly.map(w => w.pct || 0);

  return (
    <Screen>
      <PageHeader
        title={`Hi, ${profile?.name?.split(' ')[0]} 👋`}
        subtitle={profile?.faculty}
      />

      <View style={SharedStyles.row}>
        <StatCard
          label="Reports"
          value={stats?.totalReports ?? 0}
          accentColor={Colors.blue}
          icon="📋"
          style={{ flex: 1, margin: 4 }}
        />
        <StatCard
          label="Avg Att."
          value={`${stats?.avgAttendance ?? 0}%`}
          accentColor={Colors.green}
          icon="📊"
          style={{ flex: 1, margin: 4 }}
        />
      </View>
      <View style={[SharedStyles.row, { marginTop: 0 }]}>
        <StatCard
          label="Rating"
          value={stats?.avgRating ?? '—'}
          accentColor={Colors.yellow}
          icon="⭐"
          style={{ flex: 1, margin: 4 }}
        />
        <StatCard
          label="Reviewed"
          value={stats?.reviewed ?? 0}
          accentColor={Colors.purple}
          icon="✅"
          style={{ flex: 1, margin: 4 }}
        />
      </View>

      {chartData.length > 0 && (
        <Card style={{ marginTop: 12, padding: 16 }}>
          <Text style={[Typography.h4, { marginBottom: 12 }]}>Weekly Attendance %</Text>
          <BarChart
            data={{
              labels: chartLabels.slice(-8),
              datasets: [{ data: chartData.slice(-8) }],
            }}
            width={W}
            height={180}
            yAxisSuffix="%"
            chartConfig={CHART_CFG}
            style={{ borderRadius: 10 }}
            withInnerLines={false}
            showValuesOnTopOfBars
          />
        </Card>
      )}

      <Text style={[Typography.h4, { marginTop: 20, marginBottom: 10 }]}>Recent Reports</Text>
      {reports.slice(0, 5).map(r => {
        const pct = attPct(r.studentsPresent, r.registeredStudents);
        return (
          <Card key={r.id} style={{ marginBottom: 8 }}>
            <View style={SharedStyles.between}>
              <View>
                <Text style={Typography.h4}>{r.courseCode} — {r.weekOfReporting}</Text>
                <Text style={[Typography.sm, { marginTop: 2 }]}>{r.dateOfLecture}</Text>
              </View>
              <Badge
                text={r.status}
                color={r.status === 'reviewed' ? Colors.green : Colors.yellow}
              />
            </View>
            <Text style={[Typography.sm, { marginTop: 6 }]} numberOfLines={1}>
              📖 {r.topicTaught}
            </Text>
            <View style={{ marginTop: 8 }}>
              <View style={SharedStyles.between}>
                <Text style={Typography.sm}>Attendance</Text>
                <Text style={[Typography.sm, { color: Colors.t1, fontWeight: '700' }]}>
                  {pct}%
                </Text>
              </View>
              <View style={{ marginTop: 4 }}>
                <ProgressBar pct={pct} />
              </View>
            </View>
          </Card>
        );
      })}
      {!reports.length && (
        <Empty
          icon="📋"
          title="No reports yet"
          subtitle="Go to Reports tab to submit your first report"
        />
      )}
    </Screen>
  );
}

/* 
   LECTURER CLASSES
 */
export function LecturerClasses() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sq, setSq] = useState('');

  useEffect(() => {
    (async () => {
      if (!profile?.uid) return;
      try {
        const allCourses = await CoursesService.getAll();
        const allReports = await ReportsService.getAll();
        setCourses(allCourses.filter(c => c.assignedLecturerId === profile.uid));
        setReports(allReports);
      } catch (err) {
        console.warn('Classes load error:', err);
      }
      setLoading(false);
    })();
  }, [profile]);

  function stats(code) {
    const cr = reports.filter(r => r.courseCode === code);
    const p = cr.reduce((s, r) => s + Number(r.studentsPresent || 0), 0);
    const g = cr.reduce((s, r) => s + Number(r.registeredStudents || 0), 0);
    const sessions = cr.length;
    const pct = attPct(p, g);
    const registered = cr[0]?.registeredStudents || 0;
    return { sessions, pct, registered };
  }

  const filtered = courses.filter(
    c =>
      !sq ||
      c.name?.toLowerCase().includes(sq.toLowerCase()) ||
      c.code?.toLowerCase().includes(sq.toLowerCase())
  );

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader title="My Classes" subtitle="Courses assigned to you" />
      <SearchBar value={sq} onChangeText={setSq} placeholder="Search courses…" />
      {filtered.length === 0 ? (
        <Empty
          icon="📚"
          title="No classes assigned"
          subtitle="Contact your Program Leader to assign courses"
        />
      ) : (
        filtered.map(c => {
          const st = stats(c.code);
          return (
            <Card key={c.id} style={{ marginBottom: 10 }}>
              <View style={SharedStyles.between}>
                <View style={{ flex: 1 }}>
                  <Text style={Typography.h4}>{c.code}</Text>
                  <Text style={[Typography.body, { marginTop: 2 }]}>{c.name}</Text>
                </View>
                <Badge text={`${c.credits || 3} Cr`} color={Colors.blue} />
              </View>
              {c.description ? (
                <Text style={[Typography.sm, { marginTop: 8 }]} numberOfLines={2}>
                  {c.description}
                </Text>
              ) : null}
              <View style={{ marginTop: 10 }}>
                {[
                  ['📍', c.venue || 'Venue TBD'],
                  ['🕐', c.schedule || 'Schedule TBD'],
                  ['👥', `${st.registered || '—'} students`],
                ].map(([icon, val]) => (
                  <View key={icon} style={[SharedStyles.row, { marginBottom: 4 }]}>
                    <Text style={{ fontSize: 12, marginRight: 6 }}>{icon}</Text>
                    <Text style={Typography.sm}>{val}</Text>
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 12 }}>
                <View style={SharedStyles.between}>
                  <Text style={Typography.sm}>
                    Avg Attendance ({st.sessions} sessions)
                  </Text>
                  <Text
                    style={[
                      Typography.sm,
                      { color: attColor(st.pct), fontWeight: '700' },
                    ]}
                  >
                    {st.pct}%
                  </Text>
                </View>
                <View style={{ marginTop: 5 }}>
                  <ProgressBar pct={st.pct} />
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

/* 
   LECTURER MONITORING
 */
export function LecturerMonitoring() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!profile?.uid) return;
      try {
        const reportsData = await ReportsService.getByLecturer(profile.uid);
        setReports(reportsData);

        // Total sessions = number of reports
        const totalReports = reportsData.length;
        const reviewed = reportsData.filter(r => r.status === 'reviewed').length;
        const avgAttendance = totalReports
          ? Math.round(
              reportsData.reduce(
                (sum, r) => sum + attPct(r.studentsPresent, r.registeredStudents),
                0
              ) / totalReports
            )
          : 0;

        // Weekly attendance
        const weeklyMap = {};
        reportsData.forEach(r => {
          const week = r.weekOfReporting;
          if (!weeklyMap[week]) weeklyMap[week] = { present: 0, total: 0 };
          weeklyMap[week].present += Number(r.studentsPresent || 0);
          weeklyMap[week].total += Number(r.registeredStudents || 0);
        });
        const weekly = Object.entries(weeklyMap)
          .map(([week, data]) => ({ week, pct: attPct(data.present, data.total) }))
          .sort((a, b) => a.week.localeCompare(b.week));

        // Course-wise attendance
        const courseMap = {};
        reportsData.forEach(r => {
          if (!courseMap[r.courseCode]) courseMap[r.courseCode] = { p: 0, g: 0 };
          courseMap[r.courseCode].p += Number(r.studentsPresent || 0);
          courseMap[r.courseCode].g += Number(r.registeredStudents || 0);
        });
        const courseData = Object.entries(courseMap)
          .map(([code, data]) => ({ code, pct: attPct(data.p, data.g) }))
          .slice(0, 6);

        // Average rating
        const ratingsData = await RatingsService.getForTarget(profile.uid);
        const avgRating = ratingsData.length
          ? (ratingsData.reduce((s, r) => s + (r.score || 0), 0) / ratingsData.length).toFixed(1)
          : null;

        setStats({ totalReports, reviewed, avgAttendance, weekly, avgRating, courseData });
      } catch (err) {
        console.warn('Monitoring load error:', err);
      }
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <Screen><Loader /></Screen>;

  const courseData = stats?.courseData || [];
  const weekly = stats?.weekly?.slice(-8) || [];

  return (
    <Screen>
      <PageHeader title="Monitoring" subtitle="Your performance metrics" />

      <View style={SharedStyles.row}>
        <StatCard
          label="Sessions"
          value={stats?.totalReports ?? 0}
          accentColor={Colors.blue}
          style={{ flex: 1, margin: 4 }}
        />
        <StatCard
          label="Avg Att."
          value={`${stats?.avgAttendance ?? 0}%`}
          accentColor={Colors.green}
          style={{ flex: 1, margin: 4 }}
        />
      </View>
      <View style={[SharedStyles.row, { marginTop: 0 }]}>
        <StatCard
          label="Reviewed"
          value={stats?.reviewed ?? 0}
          accentColor={Colors.purple}
          style={{ flex: 1, margin: 4 }}
        />
        <StatCard
          label="Rating"
          value={stats?.avgRating ?? '—'}
          accentColor={Colors.yellow}
          style={{ flex: 1, margin: 4 }}
        />
      </View>

      {weekly.length > 0 && (
        <Card style={{ marginTop: 14, padding: 16 }}>
          <Text style={[Typography.h4, { marginBottom: 12 }]}>Weekly Attendance %</Text>
          <LineChart
            data={{
              labels: weekly.map(w => w.week.replace('Week', 'W')),
              datasets: [{ data: weekly.map(w => w.pct || 0) }],
            }}
            width={W}
            height={180}
            yAxisSuffix="%"
            chartConfig={CHART_CFG}
            bezier
            style={{ borderRadius: 10 }}
          />
        </Card>
      )}

      {courseData.length > 0 && (
        <Card style={{ marginTop: 14, padding: 16 }}>
          <Text style={[Typography.h4, { marginBottom: 12 }]}>Attendance by Course</Text>
          {courseData.map(c => (
            <View key={c.code} style={{ marginBottom: 12 }}>
              <View style={SharedStyles.between}>
                <Text style={Typography.body}>{c.code}</Text>
                <Text style={[Typography.sm, { color: attColor(c.pct), fontWeight: '700' }]}>
                  {c.pct}%
                </Text>
              </View>
              <View style={{ marginTop: 5 }}>
                <ProgressBar pct={c.pct} />
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}