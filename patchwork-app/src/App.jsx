import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './state.jsx';
import Layout from './components/Layout.jsx';
import { StatePanel } from './components/ui.jsx';
import { Landing, SignUp, Login, Forgot, Reset, Onboarding } from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import { Library, ResourceForm, ResourceDetails } from './pages/Resources.jsx';
import { SelectResources, ReviewResources, SetPreferences, DiscoverIdeas } from './pages/JourneyA.jsx';
import { IdeaDetails, SavedIdeas } from './pages/Ideas.jsx';
import { DescribeGoal, MatchResources, CompareSolutions, AdaptMaterials } from './pages/JourneyB.jsx';
import { MyProjects, ProjectPlanner, MakingGuide, ProjectCompletion } from './pages/Projects.jsx';
import { InspirationShelf, CommunityStory, PersonalImpact } from './pages/Inspiration.jsx';
import { AccountSettings, ProfileSettings, NotificationSettings, AccessibilitySettings, PrivacySettings, HelpSupport } from './pages/Settings.jsx';

function RequireAuth({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === undefined) return <StatePanel kind="loading" title="Opening your workspace" text="One moment…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!user.onboarded && loc.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user } = useAuth();
  if (user === undefined) return null;
  if (user) return <Navigate to={user.onboarded ? '/home' : '/onboarding'} replace />;
  return children;
}

const P = (el) => <RequireAuth>{el}</RequireAuth>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* 01–04 Authentication */}
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<GuestOnly><SignUp /></GuestOnly>} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset/:token" element={<Reset />} />
        <Route path="/onboarding" element={P(<Onboarding />)} />

        {/* 05 Home */}
        <Route path="/home" element={P(<Home />)} />

        {/* 06–08, 27 Resources */}
        <Route path="/resources" element={P(<Library />)} />
        <Route path="/resources/new" element={P(<ResourceForm />)} />
        <Route path="/resources/:id" element={P(<ResourceDetails />)} />
        <Route path="/resources/:id/edit" element={P(<ResourceForm />)} />

        {/* 09–12, 29, 28 Journey A */}
        <Route path="/make" element={P(<SelectResources />)} />
        <Route path="/make/review" element={P(<ReviewResources />)} />
        <Route path="/make/preferences" element={P(<SetPreferences />)} />
        <Route path="/make/ideas" element={P(<DiscoverIdeas />)} />

        {/* 13, 18 Ideas */}
        <Route path="/ideas/:id" element={P(<IdeaDetails />)} />
        <Route path="/saved" element={P(<SavedIdeas />)} />

        {/* 14–17 Journey B */}
        <Route path="/goal" element={P(<DescribeGoal />)} />
        <Route path="/goal/:id" element={P(<MatchResources />)} />
        <Route path="/goal/:id/compare" element={P(<CompareSolutions />)} />
        <Route path="/goal/:id/adapt/:ideaId" element={P(<AdaptMaterials />)} />

        {/* 19–22 Projects */}
        <Route path="/projects" element={P(<MyProjects />)} />
        <Route path="/projects/:id" element={P(<ProjectPlanner />)} />
        <Route path="/projects/:id/guide" element={P(<MakingGuide />)} />
        <Route path="/projects/:id/complete" element={P(<ProjectCompletion />)} />

        {/* 23–25 Inspiration & impact */}
        <Route path="/inspiration" element={P(<InspirationShelf />)} />
        <Route path="/inspiration/:id" element={P(<CommunityStory />)} />
        <Route path="/impact" element={P(<PersonalImpact />)} />

        {/* 26 Settings */}
        <Route path="/settings" element={P(<AccountSettings />)} />
        <Route path="/settings/profile" element={P(<ProfileSettings />)} />
        <Route path="/settings/notifications" element={P(<NotificationSettings />)} />
        <Route path="/settings/accessibility" element={P(<AccessibilitySettings />)} />
        <Route path="/settings/privacy" element={P(<PrivacySettings />)} />
        <Route path="/settings/help" element={P(<HelpSupport />)} />

        <Route path="*" element={<StatePanel kind="error" title="Page not found" text="That page doesn't exist. Your work is safe." action={<a className="btn" href="/home">Back to dashboard</a>} />} />
      </Route>
    </Routes>
  );
}
