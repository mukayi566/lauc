const fs = require('fs');
const file = 'src/pages/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the applications onSnapshot query to use submittedAt with error handling
const oldQuery = `    const unsubApps = onSnapshot(query(collection(db, 'applications'), orderBy('date', 'desc')), (snapshot) => {
      setApplications(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
      setLoading(false);
    });`;

const newQuery = `    const unsubApps = onSnapshot(
      query(collection(db, 'applications'), orderBy('submittedAt', 'desc')),
      (snapshot) => {
        setApplications(snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        console.warn('Applications query error (trying without orderBy):', err.message);
        // Fallback: fetch without ordering to avoid missing-index errors
        onSnapshot(collection(db, 'applications'), (snap) => {
          const apps = snap.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
          apps.sort((a, b) => {
            const ta = a.submittedAt?.seconds || 0;
            const tb = b.submittedAt?.seconds || 0;
            return tb - ta;
          });
          setApplications(apps);
          setLoading(false);
        });
      }
    );`;

if (content.includes(oldQuery)) {
  content = content.replace(oldQuery, newQuery);
  console.log('Applications query updated to use submittedAt with error handling');
} else {
  console.log('Old query not found - checking what exists...');
  const idx = content.indexOf("collection(db, 'applications')");
  console.log('Found at idx:', idx);
  console.log(content.substring(idx - 20, idx + 200));
}

fs.writeFileSync(file, content, 'utf8');
console.log('Done');
