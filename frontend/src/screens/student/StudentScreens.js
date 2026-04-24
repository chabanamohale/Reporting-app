import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, Dimensions, ScrollView, RefreshControl } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { MonitoringService, AttendanceService, RatingsService, AuthService } from '../../services/firestoreService';
import {
  Screen, PageHeader, Card, StatCard, Button, Picker,
  Badge, ProgressBar, Empty, Loader, SearchBar, StarRating, BottomSheet, Input,
} from '../../components';
import { Colors, Typography, SharedStyles } from '../../utils/theme';
import { attPct, attColor, RATING_CATEGORIES } from '../../utils/helpers';

const W = Dimensions.get('window').width - 52;
const CHART_CFG = {
  backgroundColor: Colors.bg1, backgroundGradientFrom: Colors.bg1, backgroundGradientTo: Colors.bg1,
  color: (o=1)=>`rgba(59,130,246,${o})`, labelColor: ()=>Colors.t3,
};

/* 
   STUDENT DASHBOARD
*/
export function StudentDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.uid) {
      MonitoringService.student(profile.uid)
        .then(setStats)
        .catch(() => setStats(null))
        .finally(() => setLoading(false));
    }
  }, [profile]);

  if (loading) return <Screen><Loader /></Screen>;

  const courses = stats?.courses || [];
  const rate = stats ? attPct(stats.present, stats.totalSessions) : 0;
  const chartLabels = courses.slice(0,6).map(c=>c.code);
  const chartData = courses.slice(0,6).map(c=>c.pct||0);

  return (
    <Screen>
      <PageHeader title={`Hi, ${profile?.name?.split(' ')[0]} 👋`} subtitle="BSc SE with Multimedia · Sem 2" />
      <View style={SharedStyles.row}>
        <StatCard label="Att. Rate" value={`${rate}%`} accentColor={Colors.blue} style={{flex:1,margin:4}} />
        <StatCard label="Present" value={stats?.present??0} accentColor={Colors.green} style={{flex:1,margin:4}} />
      </View>
      <View style={[SharedStyles.row,{marginTop:0}]}>
        <StatCard label="Sessions" value={stats?.totalSessions??0} accentColor={Colors.purple} style={{flex:1,margin:4}} />
        <StatCard label="Courses" value={courses.length} accentColor={Colors.yellow} style={{flex:1,margin:4}} />
      </View>
      <Card style={{marginTop:14,padding:20,alignItems:'center'}}>
        <Text style={[Typography.h4,{marginBottom:8}]}>Overall Standing</Text>
        <Text style={{fontSize:52,fontWeight:'800',color:attColor(rate),lineHeight:60}}>{rate}%</Text>
        <ProgressBar pct={rate} style={{width:'100%',marginTop:12,height:10}} />
        <Text style={[Typography.sm,{marginTop:10,textAlign:'center'}]}>
          {rate>=75?'✅ Good Standing':rate>=50?'⚠️ Warning — improve your attendance':'❌ At Risk — speak to your lecturer'}
        </Text>
        <Text style={[Typography.sm,{marginTop:4}]}>Minimum required: 75%</Text>
      </Card>
      {chartData.length > 0 && (
        <Card style={{marginTop:14,padding:16}}>
          <Text style={[Typography.h4,{marginBottom:12}]}>Attendance by Course</Text>
          <BarChart
            data={{labels:chartLabels,datasets:[{data:chartData}]}}
            width={W} height={180} yAxisSuffix="%" chartConfig={CHART_CFG}
            style={{borderRadius:10}} withInnerLines={false}
          />
        </Card>
      )}
    </Screen>
  );
}

/* 
   STUDENT MONITORING
 */
export function StudentMonitoring() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sq, setSq] = useState('');

  useEffect(() => {
    if (profile?.uid) {
      MonitoringService.student(profile.uid)
        .then(setStats)
        .catch(() => setStats(null))
        .finally(() => setLoading(false));
    }
  }, [profile]);

  if (loading) return <Screen><Loader /></Screen>;

  const courses = (stats?.courses||[]).filter(c=>!sq||c.code?.toLowerCase().includes(sq.toLowerCase()));

  return (
    <Screen>
      <PageHeader title="Performance Monitoring" subtitle="Track attendance per course" />
      <SearchBar value={sq} onChangeText={setSq} placeholder="Search course…" />
      {courses.length===0
        ? <Empty icon="📊" title="No data yet" subtitle="Your attendance will appear here once marked" />
        : courses.map(c=>(
            <Card key={c.code} style={{marginBottom:10,padding:16}}>
              <View style={SharedStyles.between}>
                <Text style={Typography.h4}>{c.code}</Text>
                <Badge text={c.pct>=75?'Good':c.pct>=50?'Warning':'At Risk'} color={attColor(c.pct)} />
              </View>
              <Text style={[Typography.sm,{marginTop:4}]}>{c.present} present / {c.total} sessions</Text>
              <View style={{marginTop:10}}>
                <View style={SharedStyles.between}>
                  <Text style={Typography.sm}>Attendance</Text>
                  <Text style={[Typography.sm,{color:attColor(c.pct),fontWeight:'700'}]}>{c.pct}%</Text>
                </View>
                <View style={{marginTop:5}}><ProgressBar pct={c.pct} /></View>
              </View>
            </Card>
          ))
      }
    </Screen>
  );
}

/* 
   STUDENT ATTENDANCE – with pull‑to‑refresh and debug log
*/
export function StudentAttendance() {
  const { profile } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sq, setSq] = useState('');

  const loadRecords = async () => {
    if (!profile?.uid) return;
    try {
      const data = await AttendanceService.getOwn(profile.uid);
      console.log(`✅ Fetched ${data.length} attendance records for UID: ${profile.uid}`);
      setRecords(data);
    } catch (err) {
      console.warn('Attendance fetch error:', err);
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [profile]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRecords();
  };

  const filtered = records.filter(r =>
    !sq ||
    r.courseCode?.toLowerCase().includes(sq.toLowerCase()) ||
    r.date?.includes(sq)
  );

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader title="My Attendance" subtitle="Full attendance history" />
      <SearchBar value={sq} onChangeText={setSq} placeholder="Search course or date…" />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <Empty icon="📅" title="No records" subtitle="Your attendance records will appear here" />
        ) : (
          filtered.map((a, i) => (
            <Card key={i} style={{ marginBottom: 8, padding: 12 }}>
              <View style={SharedStyles.between}>
                <View>
                  <Text style={Typography.h4}>{a.courseCode}</Text>
                  <Text style={Typography.sm}>{a.date} · {a.markedByName || '—'}</Text>
                </View>
                <Badge text={a.present ? 'Present' : 'Absent'} color={a.present ? Colors.green : Colors.red} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

/* 
   STUDENT RATING (rate lecturers)
*/
export function StudentRating() {
  const { profile } = useAuth();
  const [lecturers, setLecturers] = useState([]);
  const [allRatings, setAllRatings] = useState([]);
  const [myRatings, setMyRatings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ targetId:'', score:0, category:RATING_CATEGORIES[0], comment:'' });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sq, setSq] = useState('');

  const load = async () => {
    try {
      const [l, all, mine] = await Promise.all([
        AuthService.getUsers('lecturer'),
        RatingsService.getAll(),
        RatingsService.getMine(profile?.uid)
      ]);
      setLecturers(l || []);
      setAllRatings(all || []);
      setMyRatings(mine || []);
    } catch(e) { console.warn(e); }
    setLoading(false);
  };

  useEffect(() => { if (profile?.uid) load(); }, [profile]);

  async function handleSubmit() {
    if (!form.targetId || form.score===0) { Alert.alert('Error','Select a lecturer and give a rating'); return; }
    setBusy(true);
    try {
      const target = lecturers.find(l => (l.uid||l.id) === form.targetId);
      await RatingsService.submit({
        targetId: form.targetId,
        targetName: target?.name || '',
        score: form.score,
        category: form.category,
        comment: form.comment,
        submittedBy: profile.uid,
        submittedByName: profile.name,
        submitterRole: profile.role,
      });
      Alert.alert('⭐ Submitted','Thank you for your feedback!');
      setForm({targetId:'',score:0,category:RATING_CATEGORIES[0],comment:''});
      setShowForm(false);
      load();
    } catch(e){ Alert.alert('Error', e.message); }
    setBusy(false);
  }

  function avgFor(uid) {
    const rs = allRatings.filter(r => r.targetId === uid);
    return rs.length ? (rs.reduce((s,r)=>s+(r.score||0),0)/rs.length).toFixed(1) : null;
  }

  const filtered = lecturers.filter(l => !sq || l.name?.toLowerCase().includes(sq.toLowerCase()));

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <PageHeader title="Rate Lecturers" subtitle="Share your feedback"
        right={<Button title="Rate" icon="star-outline" small onPress={()=>setShowForm(true)} />} />
      <SearchBar value={sq} onChangeText={setSq} placeholder="Search lecturers…" />
      {filtered.map(l=>{
        const avg = avgFor(l.uid||l.id);
        const cnt = allRatings.filter(r=>r.targetId===(l.uid||l.id)).length;
        const rated = myRatings.some(r=>r.targetId===(l.uid||l.id));
        return (
          <Card key={l.id} style={{marginBottom:10,padding:16}}>
            <View style={[SharedStyles.between,{marginBottom:10}]}>
              <View>
                <Text style={Typography.h4}>{l.name}</Text>
                <Text style={Typography.sm}>{l.department||l.faculty}</Text>
              </View>
              {rated && <Badge text="Rated ✓" color={Colors.green} />}
            </View>
            {avg
              ? <View style={SharedStyles.row}>
                  <Text style={{fontSize:22,fontWeight:'800',color:Colors.yellow,marginRight:8}}>{avg}</Text>
                  <StarRating value={Math.round(Number(avg))} readonly size={20} />
                  <Text style={[Typography.sm,{marginLeft:8}]}>({cnt})</Text>
                </View>
              : <Text style={Typography.sm}>No ratings yet</Text>
            }
          </Card>
        );
      })}
      {!filtered.length && <Empty icon="👨‍🏫" title="No lecturers found" />}
      <BottomSheet visible={showForm} onClose={()=>setShowForm(false)} title="⭐ Rate a Lecturer">
        <Picker label="Select Lecturer *" value={form.targetId}
          options={lecturers.map(l=>({value:l.uid||l.id,label:l.name}))}
          onChange={v=>setForm(f=>({...f,targetId:v}))} />
        <Picker label="Category *" value={form.category} options={RATING_CATEGORIES} onChange={v=>setForm(f=>({...f,category:v}))} />
        <View style={SharedStyles.fgroup}>
          <Text style={SharedStyles.label}>Your Rating *</Text>
          <StarRating value={form.score} onChange={s=>setForm(f=>({...f,score:s}))} size={36} />
          {form.score>0 && <Text style={[Typography.sm,{marginTop:6,color:Colors.yellow}]}>{['','Poor','Fair','Good','Very Good','Excellent'][form.score]}</Text>}
        </View>
        <Input label="Comment (Optional)" value={form.comment} onChangeText={v=>setForm(f=>({...f,comment:v}))} placeholder="Share your feedback…" multiline />
        <Button title="Submit Rating" onPress={handleSubmit} loading={busy} icon="checkmark-circle-outline" style={{marginTop:8}} />
      </BottomSheet>
    </Screen>
  );
}