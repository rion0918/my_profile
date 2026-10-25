import { Suspense } from "react";
import HomeView from "../components/HomeView";
import ProfilePage from "../components/ProfilePage";

export default function Home() {
  const profile = <ProfilePage />;
  return <Suspense fallback={profile}><HomeView profile={profile} /></Suspense>;
}
