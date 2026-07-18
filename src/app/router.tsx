import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import HomePage from '@/pages/Home';
import PlcSimulatorPage from '@/pages/PlcSimulator';
import QuizPage from '@/pages/Quiz';
import MaterialsPage from '@/pages/Materials';
import ProfilePage from '@/pages/Profile';
import RankingPage from '@/pages/Ranking';
import TeacherDashboardPage from '@/pages/TeacherDashboard';

/**
 * Route tree kept flat and declarative on purpose — each page owns its own
 * feature logic; this file's only job is mapping a path to a page.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'simulator', element: <PlcSimulatorPage /> },
      { path: 'quiz', element: <QuizPage /> },
      { path: 'materials', element: <MaterialsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'ranking', element: <RankingPage /> },
      { path: 'teacher', element: <TeacherDashboardPage /> },
    ],
  },
]);
