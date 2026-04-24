import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Input, Button, Picker } from '../../components';
import { Colors, Typography } from '../../utils/theme';
import { FACULTIES, ROLES } from '../../utils/helpers';
import { AuthService } from '../../services/firestoreService';

/* 
   LOGIN SCREEN – uses direct Firestore AuthService
 */
export function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      await AuthService.login(email.trim(), password);
      // AuthContext will update automatically via onAuthStateChanged
      Alert.alert('Success', 'Logged in');
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#060e1e', '#07101f', '#0a1628']} style={{ flex: 1 }}>
        <View style={styles.bgDot1} />
        <View style={styles.bgDot2} />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <LinearGradient colors={[Colors.blue, Colors.purple]} style={styles.brandIcon}>
              <Text style={{ fontSize: 28 }}>🎓</Text>
            </LinearGradient>
            <Text style={styles.brandTitle}>LUCT Faculty</Text>
            <Text style={styles.brandSub}>Reporting & Monitoring System</Text>
          </View>
          <View style={styles.card}>
            <Text style={[Typography.h3, { marginBottom: 20 }]}>Sign In</Text>
            <Input label="Email Address" value={email} onChangeText={setEmail}
              placeholder="you@luct.ac.ls" keyboardType="email-address" />
            <Input label="Password" value={password} onChangeText={setPassword}
              placeholder="••••••••" secureTextEntry />
            <Button title="Sign In" onPress={handleLogin} loading={loading} icon="log-in-outline"
              style={{ marginTop: 8 }} />
            <View style={styles.divider}>
              <View style={styles.divLine} /><Text style={styles.divText}>or</Text><View style={styles.divLine} />
            </View>
            <TouchableOpacity style={styles.switchBtn} onPress={() => navigation.navigate('Register')}>
              <Text style={styles.switchText}>Don't have an account? <Text style={{ color: Colors.blueL }}>Register</Text></Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footer}>Lesotho-Upper-Corridor Technical University</Text>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

/* 
   REGISTER SCREEN – uses direct Firestore AuthService
 */
export function RegisterScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
    role: 'student', faculty: FACULTIES[0],
    department: '', staffId: '', studentId: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function handleRegister() {
    if (!form.name || !form.email || !form.password) {
      Alert.alert('Error', 'Name, email and password are required');
      return;
    }
    if (form.password !== form.confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await AuthService.register(form.email.trim(), form.password, form);
      Alert.alert('Success', 'Account created! Please login.');
      // ✅ FIXED: use replace instead of navigate to prevent navigation error
      navigation.replace('Login');
    } catch (err) {
      Alert.alert('Registration Failed', err.message);
    }
    setLoading(false);
  }

  const isStaff = ['lecturer', 'prl', 'pl'].includes(form.role);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#060e1e', '#07101f', '#0a1628']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <LinearGradient colors={[Colors.blue, Colors.purple]} style={styles.brandIcon}>
              <Text style={{ fontSize: 28 }}>🎓</Text>
            </LinearGradient>
            <Text style={styles.brandTitle}>Create Account</Text>
            <Text style={styles.brandSub}>LUCT Faculty System</Text>
          </View>
          <View style={styles.card}>
            <Input label="Full Name *" value={form.name} onChangeText={v => set('name', v)} placeholder="Your full name" />
            <Input label="Email Address *" value={form.email} onChangeText={v => set('email', v)} placeholder="you@luct.ac.ls" keyboardType="email-address" />
            <Input label="Password *" value={form.password} onChangeText={v => set('password', v)} placeholder="Min 6 characters" secureTextEntry />
            <Input label="Confirm Password *" value={form.confirm} onChangeText={v => set('confirm', v)} placeholder="Repeat password" secureTextEntry />
            <Picker label="Role *" value={form.role} options={ROLES} onChange={v => set('role', v)} />
            <Picker label="Faculty *" value={form.faculty} options={FACULTIES} onChange={v => set('faculty', v)} />
            {isStaff && (
              <>
                <Input label="Staff ID" value={form.staffId} onChangeText={v => set('staffId', v)} placeholder="e.g. LUCT/ST/001" />
                <Input label="Department" value={form.department} onChangeText={v => set('department', v)} placeholder="e.g. ICT" />
              </>
            )}
            {form.role === 'student' && (
              <Input label="Student ID" value={form.studentId} onChangeText={v => set('studentId', v)} placeholder="e.g. LSE/2024/001" />
            )}
            <Button title="Create Account" onPress={handleRegister} loading={loading} icon="person-add-outline" style={{ marginTop: 8 }} />
            <TouchableOpacity style={styles.switchBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.switchText}>Already have an account? <Text style={{ color: Colors.blueL }}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { padding: 20, alignItems: 'center', minHeight: '100%', paddingTop: 60 },
  brand:      { alignItems: 'center', marginBottom: 28 },
  brandIcon:  { width: 68, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: Colors.blue, shadowOffset:{width:0,height:0}, shadowOpacity:0.6, shadowRadius:20 },
  brandTitle: { fontSize: 24, fontWeight: '800', color: Colors.t1, letterSpacing: -0.5 },
  brandSub:   { fontSize: 13, color: Colors.t3, marginTop: 4 },
  card:       { backgroundColor: Colors.bg1, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, padding: 24, width: '100%', maxWidth: 480 },
  divider:    { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  divLine:    { flex: 1, height: 1, backgroundColor: Colors.border },
  divText:    { color: Colors.t3, fontSize: 12, marginHorizontal: 10 },
  switchBtn:  { alignItems: 'center', paddingVertical: 8 },
  switchText: { color: Colors.t2, fontSize: 14 },
  footer:     { color: Colors.t3, fontSize: 11, marginTop: 20, textAlign: 'center' },
  bgDot1:     { position:'absolute', width:300, height:300, borderRadius:150, backgroundColor:'rgba(59,130,246,0.06)', top:-80, right:-80 },
  bgDot2:     { position:'absolute', width:250, height:250, borderRadius:125, backgroundColor:'rgba(167,139,250,0.05)', bottom:-50, left:-60 },
});