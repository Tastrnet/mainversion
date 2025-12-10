import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Start from "./pages/Start";
import NearbyRestaurants from "./pages/NearbyRestaurants";

import Search from "./pages/Search";
import Featured from "./pages/Featured";
import PopularRestaurants from "./pages/PopularRestaurants";
import PopularFriends from "./pages/PopularFriends";
import NewFriends from "./pages/NewFriends";
import Restaurant from "./pages/Restaurant";

import AllFriendsRatings from "./pages/AllFriendsRatings";
import AllUserRatings from "./pages/AllUserRatings";

import AllFriends from "./pages/AllFriends";
import AllLists from "./pages/AllLists";
import Review from "./pages/Review";
import Log from "./pages/Log";
import Friends from "./pages/Friends";
import AddFriends from "./pages/AddFriends";
import Profile from "./pages/Profile";

import Lists from "./pages/Lists";
import Settings from "./pages/Settings";
import CreateList from "./pages/CreateList";
import ListDetail from "./pages/ListDetail";
import EditList from "./pages/EditList";
import AddToList from "./pages/AddToList";
import WantToTry from "./pages/WantToTry";
import Favorites from "./pages/Favorites";
import YourReviews from "./pages/YourReviews";
import YourFriends from "./pages/YourFriends";
import Followers from "./pages/Followers";
import Following from "./pages/Following";
import VisitedRestaurants from "./pages/VisitedRestaurants";
import Activity from "./pages/Activity";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <div className="select-none">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="tastr-ui-theme">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              {/* Public routes - no authentication required */}
              <Route path="/" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              
              {/* Protected routes - authentication required */}
              <Route path="/start" element={<ProtectedRoute><Start /></ProtectedRoute>} />
          <Route path="/discover" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          <Route path="/nearby" element={<ProtectedRoute><NearbyRestaurants /></ProtectedRoute>} />
              <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
              <Route path="/add-friends" element={<ProtectedRoute><AddFriends /></ProtectedRoute>} />
              <Route path="/your-friends" element={<ProtectedRoute><YourFriends /></ProtectedRoute>} />
              <Route path="/lists" element={<ProtectedRoute><Lists /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/user/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/log" element={<ProtectedRoute><Log /></ProtectedRoute>} />
              <Route path="/featured" element={<ProtectedRoute><Featured /></ProtectedRoute>} />
          <Route path="/popular-restaurants" element={<ProtectedRoute><PopularRestaurants /></ProtectedRoute>} />
          <Route path="/popular-friends" element={<ProtectedRoute><PopularFriends /></ProtectedRoute>} />
          <Route path="/nearby" element={<ProtectedRoute><NearbyRestaurants /></ProtectedRoute>} />
          
              <Route path="/new-friends" element={<ProtectedRoute><NewFriends /></ProtectedRoute>} />
              <Route path="/restaurant/:id" element={<ProtectedRoute><Restaurant /></ProtectedRoute>} />
              
              <Route path="/restaurant/:id/ratings/friends" element={<ProtectedRoute><AllFriendsRatings /></ProtectedRoute>} />
              <Route path="/restaurant/:id/ratings/all" element={<ProtectedRoute><AllUserRatings /></ProtectedRoute>} />
              
              <Route path="/all-friends/:userId" element={<ProtectedRoute><AllFriends /></ProtectedRoute>} />
              <Route path="/all-lists/:userId" element={<ProtectedRoute><AllLists /></ProtectedRoute>} />
              <Route path="/followers/:userId" element={<ProtectedRoute><Followers /></ProtectedRoute>} />
              <Route path="/following/:userId" element={<ProtectedRoute><Following /></ProtectedRoute>} />
              <Route path="/review/:id" element={<ProtectedRoute><Review /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/create-list" element={<ProtectedRoute><CreateList /></ProtectedRoute>} />
              <Route path="/list/:id" element={<ProtectedRoute><ListDetail /></ProtectedRoute>} />
              <Route path="/edit-list/:id" element={<ProtectedRoute><EditList /></ProtectedRoute>} />
              <Route path="/add-to-list/:listId" element={<ProtectedRoute><AddToList /></ProtectedRoute>} />
              <Route path="/want-to-try" element={<ProtectedRoute><WantToTry /></ProtectedRoute>} />
              <Route path="/want-to-try/:id" element={<ProtectedRoute><WantToTry /></ProtectedRoute>} />
              <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
              <Route path="/favorites/:id" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
              <Route path="/your-reviews" element={<ProtectedRoute><YourReviews /></ProtectedRoute>} />
              <Route path="/your-reviews/:id" element={<ProtectedRoute><YourReviews /></ProtectedRoute>} />
              <Route path="/lists/:id" element={<ProtectedRoute><Lists /></ProtectedRoute>} />
              <Route path="/visited-restaurants" element={<ProtectedRoute><VisitedRestaurants /></ProtectedRoute>} />
              <Route path="/visited-restaurants/:id" element={<ProtectedRoute><VisitedRestaurants /></ProtectedRoute>} />
              <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </div>
);

export default App;
