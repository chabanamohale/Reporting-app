// src/services/firestoreService.js
import { db, auth } from './firebase';
import { 
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, 
  query, where, orderBy, serverTimestamp 
} from 'firebase/firestore';

const snap2arr = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));


// AUTH & USERS

export const AuthService = {
  register: async (email, password, profileData) => {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;
    const userProfile = {
      uid,
      email,
      name: profileData.name,
      role: profileData.role,
      faculty: profileData.faculty || '',
      department: profileData.department || '',
      staffId: profileData.staffId || '',
      studentId: profileData.studentId || '',
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid), userProfile);
    return { uid, profile: userProfile };
  },
  login: async (email, password) => {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) throw new Error('User profile not found');
    return { uid, profile: userDoc.data() };
  },
  logout: () => auth.signOut(),
  getProfile: async (uid) => {
    const docSnap = await getDoc(doc(db, 'users', uid));
    return docSnap.exists() ? docSnap.data() : null;
  },
  updateProfile: async (uid, data) => updateDoc(doc(db, 'users', uid), data),
  getUsers: async (role) => {
    let q = collection(db, 'users');
    if (role) q = query(q, where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};


// REPORTS

export const ReportsService = {
  create: async (data) => {
    const ref = await addDoc(collection(db, 'reports'), {
      ...data,
      status: 'submitted',
      feedback: '',
      feedbackBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },
  getAll: async () => snap2arr(await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc')))),
  getByLecturer: async (lecturerId) => snap2arr(await getDocs(query(collection(db, 'reports'), where('lecturerId', '==', lecturerId), orderBy('createdAt', 'desc')))),
  update: async (id, data) => updateDoc(doc(db, 'reports', id), { ...data, updatedAt: serverTimestamp() }),
  delete: async (id) => deleteDoc(doc(db, 'reports', id)),
  addFeedback: async (id, feedback, byName) => updateDoc(doc(db, 'reports', id), { feedback, feedbackBy: byName, status: 'reviewed', updatedAt: serverTimestamp() }),
};


// COURSES

export const CoursesService = {
  create: async (data) => {
    const ref = await addDoc(collection(db, 'courses'), {
      ...data,
      assignedLecturerId: '',
      assignedLecturerName: '',
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },
  getAll: async () => snap2arr(await getDocs(query(collection(db, 'courses'), orderBy('createdAt', 'desc')))),
  assignLecturer: async (id, lecturerId, lecturerName) => updateDoc(doc(db, 'courses', id), { assignedLecturerId: lecturerId, assignedLecturerName: lecturerName, updatedAt: serverTimestamp() }),
  update: async (id, data) => updateDoc(doc(db, 'courses', id), { ...data, updatedAt: serverTimestamp() }),
  delete: async (id) => deleteDoc(doc(db, 'courses', id)),
};


// CLASSES

export const ClassesService = {
  getAll: async () => snap2arr(await getDocs(collection(db, 'classes'))),
};


// ATTENDANCE

export const AttendanceService = {
  bulkSave: async (records) => {
    const batch = db.batch();
    records.forEach(r => {
      const ref = doc(collection(db, 'attendance'));
      batch.set(ref, { ...r, markedAt: serverTimestamp() });
    });
    await batch.commit();
  },
  getOwn: async (studentId) => snap2arr(await getDocs(query(collection(db, 'attendance'), where('studentId', '==', studentId), orderBy('markedAt', 'desc')))),
  getAll: async (courseCode) => {
    let q = collection(db, 'attendance');
    if (courseCode) q = query(q, where('courseCode', '==', courseCode));
    return snap2arr(await getDocs(q));
  },
};


// RATINGS

export const RatingsService = {
  submit: async (data) => {
    const ref = await addDoc(collection(db, 'ratings'), { ...data, submittedAt: serverTimestamp() });
    return ref.id;
  },
  getForTarget: async (targetId) => snap2arr(await getDocs(query(collection(db, 'ratings'), where('targetId', '==', targetId)))),
  getMine: async (submittedBy) => snap2arr(await getDocs(query(collection(db, 'ratings'), where('submittedBy', '==', submittedBy)))),
  getAll: async () => snap2arr(await getDocs(query(collection(db, 'ratings'), orderBy('submittedAt', 'desc')))),
};


// MONITORING (simple aggregates)

export const MonitoringService = {
  student: async (studentId) => {
    const attendanceSnap = await getDocs(query(collection(db, 'attendance'), where('studentId', '==', studentId)));
    const records = attendanceSnap.docs.map(d => d.data());
    const present = records.filter(r => r.present).length;
    const totalSessions = records.length;
    const courses = {};
    records.forEach(r => {
      if (!courses[r.courseCode]) courses[r.courseCode] = { present: 0, total: 0 };
      courses[r.courseCode].total++;
      if (r.present) courses[r.courseCode].present++;
    });
    const courseList = Object.entries(courses).map(([code, data]) => ({ code, present: data.present, total: data.total, pct: Math.round((data.present / data.total) * 100) }));
    return { present, totalSessions, courses: courseList };
  },
  lecturer: async () => ({}), // implement if needed
  overview: async () => ({}),
};


// SEARCH (client-side)

export const SearchService = {
  search: async (queryText, userRole, userUid) => {
    const q = queryText.toLowerCase();
    if (q.length < 2) return {};
    // Simple implementation – fetch all and filter client-side
    const results = {};
    try {
      const reportsSnap = await getDocs(collection(db, 'reports'));
      results.reports = reportsSnap.docs.map(d => d.data()).filter(r => r.courseName?.toLowerCase().includes(q));
    } catch(e) { results.reports = []; }
    return results;
  },
};