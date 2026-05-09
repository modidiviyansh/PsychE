import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { StudentProfile } from './pages/StudentProfile';
import { AddLog } from './pages/AddLog';
import { AddStudent } from './pages/AddStudent';
import { AllLogs } from './pages/AllLogs';
import { StudentDirectory } from './pages/StudentDirectory';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="student/:id" element={<StudentProfile />} />
          <Route path="add-log" element={<AddLog />} />
          <Route path="add-student" element={<AddStudent />} />
          <Route path="logs" element={<AllLogs />} />
          <Route path="directory" element={<StudentDirectory />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
