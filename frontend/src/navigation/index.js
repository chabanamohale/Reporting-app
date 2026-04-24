import React from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../utils/theme';

// Auth screens
import { LoginScreen, RegisterScreen } from '../screens/auth/AuthScreens';

// Student screens
import { StudentDashboard, StudentMonitoring, StudentAttendance, StudentRating } from '../screens/student/StudentScreens';

// Lecturer screens
import { LecturerDashboard, LecturerClasses, LecturerMonitoring } from '../screens/lecturer/LecturerScreens';
import ReportsScreen from '../screens/lecturer/ReportsScreen';
import { AttendanceScreen, LecturerRatingScreen } from '../screens/lecturer/AttendanceRatingScreens';

// PRL screens
import { PRLDashboard, PRLReports, PRLCourses, PRLClasses, PRLMonitoring, PRLRating } from '../screens/principalLecturer/PRLScreens';

// PL screens
import { PLDashboard, PLCourses, PLReports, PLMonitoring, PLLecturers, PLClasses, PLRating } from '../screens/programLeader/PLScreens';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────────
// Logout button component
// ─────────────────────────────────────────────────────────────
function HeaderRight() {
  const { logout } = useAuth();
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };
  return (
    <Ionicons name="log-out-outline" size={24} color={Colors.t1} style={{ marginRight: 16 }} onPress={handleLogout} />
  );
}

const headerOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: Colors.bg1, borderBottomColor: Colors.border, borderBottomWidth: 1 },
  headerTitleStyle: { color: Colors.t1, fontSize: 18, fontWeight: '600' },
  headerRight: () => <HeaderRight />,
};

const tabOptions = {
  headerShown: false,
  tabBarActiveTintColor: Colors.blueL,
  tabBarInactiveTintColor: Colors.t3,
  tabBarStyle: {
    backgroundColor: Colors.bg1,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingBottom: 5,
    paddingTop: 5,
    height: 58,
  },
  tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
};

const icon = (name, focused, size = 22) => (
  <Ionicons name={focused ? name : `${name}-outline`} size={size} color={focused ? Colors.blueL : Colors.t3} />
);

function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Dashboard" component={StudentDashboard} options={{ tabBarIcon: ({ focused }) => icon('home', focused), title: 'Home' }} />
      <Tab.Screen name="Monitoring" component={StudentMonitoring} options={{ tabBarIcon: ({ focused }) => icon('bar-chart', focused) }} />
      <Tab.Screen name="Attendance" component={StudentAttendance} options={{ tabBarIcon: ({ focused }) => icon('calendar', focused) }} />
      <Tab.Screen name="Rate" component={StudentRating} options={{ tabBarIcon: ({ focused }) => icon('star', focused) }} />
    </Tab.Navigator>
  );
}

function LecturerTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Dashboard" component={LecturerDashboard} options={{ tabBarIcon: ({ focused }) => icon('home', focused), title: 'Home' }} />
      <Tab.Screen name="Classes" component={LecturerClasses} options={{ tabBarIcon: ({ focused }) => icon('book', focused) }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarIcon: ({ focused }) => icon('document-text', focused) }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ tabBarIcon: ({ focused }) => icon('people', focused) }} />
      <Tab.Screen name="Monitoring" component={LecturerMonitoring} options={{ tabBarIcon: ({ focused }) => icon('bar-chart', focused) }} />
      <Tab.Screen name="Ratings" component={LecturerRatingScreen} options={{ tabBarIcon: ({ focused }) => icon('star', focused) }} />
    </Tab.Navigator>
  );
}

function PRLTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Dashboard" component={PRLDashboard} options={{ tabBarIcon: ({ focused }) => icon('home', focused), title: 'Home' }} />
      <Tab.Screen name="Courses" component={PRLCourses} options={{ tabBarIcon: ({ focused }) => icon('library', focused) }} />
      <Tab.Screen name="Reports" component={PRLReports} options={{ tabBarIcon: ({ focused }) => icon('document-text', focused) }} />
      <Tab.Screen name="Classes" component={PRLClasses} options={{ tabBarIcon: ({ focused }) => icon('school', focused) }} />
      <Tab.Screen name="Monitoring" component={PRLMonitoring} options={{ tabBarIcon: ({ focused }) => icon('bar-chart', focused) }} />
      <Tab.Screen name="Ratings" component={PRLRating} options={{ tabBarIcon: ({ focused }) => icon('star', focused) }} />
    </Tab.Navigator>
  );
}

function PLTabs() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen name="Dashboard" component={PLDashboard} options={{ tabBarIcon: ({ focused }) => icon('home', focused), title: 'Home' }} />
      <Tab.Screen name="Courses" component={PLCourses} options={{ tabBarIcon: ({ focused }) => icon('library', focused) }} />
      <Tab.Screen name="Reports" component={PLReports} options={{ tabBarIcon: ({ focused }) => icon('document-text', focused) }} />
      <Tab.Screen name="Lecturers" component={PLLecturers} options={{ tabBarIcon: ({ focused }) => icon('people', focused) }} />
      <Tab.Screen name="Classes" component={PLClasses} options={{ tabBarIcon: ({ focused }) => icon('school', focused) }} />
      <Tab.Screen name="Monitoring" component={PLMonitoring} options={{ tabBarIcon: ({ focused }) => icon('bar-chart', focused) }} />
      <Tab.Screen name="Ratings" component={PLRating} options={{ tabBarIcon: ({ focused }) => icon('star', focused) }} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AuthenticatedStack() {
  const { profile } = useAuth();
  const role = profile?.role;

  //here  If profile is still null but user exists, we may need to wait
  if (!profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.blue} />
        <Text style={{ color: Colors.t3, marginTop: 14 }}>Loading profile...</Text>
      </View>
    );
  }

  let TabComponent = null;
  if (role === 'student') TabComponent = StudentTabs;
  else if (role === 'lecturer') TabComponent = LecturerTabs;
  else if (role === 'prl') TabComponent = PRLTabs;
  else if (role === 'pl') TabComponent = PLTabs;
  else {
    // Unknown role – fallback to student tabs
    console.warn(`Unknown role "${role}", falling back to student tabs`);
    TabComponent = StudentTabs;
  }

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Home" component={TabComponent} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <Text style={{ fontSize: 40, marginBottom: 20 }}>🎓</Text>
        <ActivityIndicator size="large" color={Colors.blue} />
        <Text style={{ color: Colors.t3, marginTop: 14, fontSize: 13 }}>LUCT Faculty System</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? <AuthStack /> : <AuthenticatedStack />}
    </NavigationContainer>
  );
}