import { Navigate, Route, Routes } from "react-router-dom";

import NavBar from "./components/NavBar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import FormCreatePage from "./pages/FormCreatePage.jsx";
import FormDetailPage from "./pages/FormDetailPage.jsx";
import FormEditPage from "./pages/FormEditPage.jsx";
import FormsFeedPage from "./pages/FormsFeedPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import ModerationPage from "./pages/ModerationPage.jsx";
import MyFormsPage from "./pages/MyFormsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ThreadPage from "./pages/ThreadPage.jsx";
import UserProfilePage from "./pages/UserProfilePage.jsx";

export default function App() {
  const { user } = useAuth();

  return (
    <div className="app">
      <NavBar />
      <main className="main">
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/forms" replace /> : <LandingPage />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms"
            element={
              <ProtectedRoute>
                <FormsFeedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/new"
            element={
              <ProtectedRoute>
                <FormCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/my"
            element={
              <ProtectedRoute>
                <MyFormsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/:id"
            element={
              <ProtectedRoute>
                <FormDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forms/:id/edit"
            element={
              <ProtectedRoute>
                <FormEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:id"
            element={
              <ProtectedRoute>
                <ThreadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/moderation"
            element={
              <ProtectedRoute adminOnly>
                <ModerationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
