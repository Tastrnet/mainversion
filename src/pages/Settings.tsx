import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, LogOut, Camera, User, Moon, Sun, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { ImageCropper } from "@/components/ImageCropper";
import HeaderBanner from "@/components/HeaderBanner";
import MobileNavigation from "@/components/MobileNavigation";

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, signOut } = useAuth();
  
  // Check if we came from the menu (direct navigation) or from profile
  const cameFromMenu = location.state?.fromMenu === true;
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState({
    full_name: "",
    username: "",
    bio: "",
    avatar_url: ""
  });
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Image cropping states
  const selectedImageFileRef = useRef<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!authUser) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
        } else if (data) {
          setProfile({
            full_name: data.full_name || "",
            username: data.username || "",
            bio: data.bio || "",
            avatar_url: data.avatar_url || ""
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authUser]);

  // Auto-save functionality
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalProfile, setOriginalProfile] = useState({
    full_name: "",
    username: "",
    bio: "",
    avatar_url: ""
  });

  // Track changes to detect unsaved data
  useEffect(() => {
    if (!loading && originalProfile.full_name !== "") {
      const profileChanged = 
        profile.full_name !== originalProfile.full_name ||
        profile.bio !== originalProfile.bio;
      
      setHasUnsavedChanges(profileChanged);
    }
  }, [profile, originalProfile, loading]);

  // Set original values when data is first loaded
  useEffect(() => {
    if (!loading && profile.full_name && originalProfile.full_name === "") {
      setOriginalProfile({
        full_name: profile.full_name,
        username: profile.username,
        bio: profile.bio,
        avatar_url: profile.avatar_url
      });
    }
  }, [loading, profile, originalProfile.full_name]);

  // Auto-save when navigating away
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
        // Try to save in the background
        autoSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Auto-save when component unmounts
      if (hasUnsavedChanges) {
        autoSave();
      }
    };
  }, [hasUnsavedChanges]);

  // Silent auto-save function (doesn't navigate)
  const autoSave = async () => {
    if (!authUser || !hasUnsavedChanges) return;
    
    try {
      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          username: profile.username,
          bio: profile.bio
        })
        .eq('user_id', authUser.id);

      if (profileError) {
        console.error('Auto-save error:', profileError);
        return;
      }

      // Update auth user metadata
      await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name
        }
      });

      // Update original values
      setOriginalProfile({
        full_name: profile.full_name,
        username: profile.username,
        bio: profile.bio,
        avatar_url: profile.avatar_url
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      console.error('File too large:', file.size);
      toast.error('Image size must be less than 5MB');
      return;
    }

    selectedImageFileRef.current = file;
    setShowCropper(true);
    
    // Reset the input
    event.target.value = '';
  };

  const handleCroppedImageUpload = async (croppedFile: File) => {
    if (!authUser) {
      console.error('No authenticated user');
      toast.error('You must be logged in to upload a profile picture');
      return;
    }

    setUploadingAvatar(true);
    setShowCropper(false);
    
    try {
      const fileName = `${authUser.id}/avatar.jpg`;

      // Upload the file with upsert to replace existing avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedFile, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`; // Add timestamp to force cache refresh

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', authUser.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Settings: Error in handleCroppedImageUpload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to upload profile picture: ${errorMessage}`);
    } finally {
      setUploadingAvatar(false);
      selectedImageFileRef.current = null;
    }
  };

  const handleAvatarRemove = async () => {
    if (!authUser) return;

    try {
      // First, remove the file from storage if it exists
      const fileName = `${authUser.id}/avatar.jpg`;
      const { error: storageError } = await supabase.storage
        .from('avatars')
        .remove([fileName]);
      
      if (storageError) {
        console.warn('Warning: Could not remove file from storage:', storageError);
        // Don't throw error here as the file might not exist
      }

      // Then update the profile to remove avatar_url
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', authUser.id);

      if (dbError) {
        throw dbError;
      }

      setProfile(prev => ({ ...prev, avatar_url: "" }));
      toast.success('Profile picture removed');
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('Failed to remove profile picture');
    }
  };

  const handleLogout = () => {
    signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!authUser) {
      toast.error('No user logged in');
      return;
    }

    setIsDeleting(true);
    
    try {
      // First, delete all user data from the database
      // Delete user reviews
      await supabase
        .from('reviews')
        .delete()
        .eq('user_id', authUser.id);

      // Delete user lists and list restaurants (CASCADE should handle this)
      await supabase
        .from('lists')
        .delete()  
        .eq('user_id', authUser.id);

      // Delete user followers relationships
      await supabase
        .from('followers')
        .delete()
        .or(`follower_id.eq.${authUser.id},following_id.eq.${authUser.id}`);

      // Delete user profile
      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', authUser.id);

      // Delete avatar from storage if it exists
      const fileName = `${authUser.id}/avatar.jpg`;
      await supabase.storage
        .from('avatars')
        .remove([fileName]);

      // Finally, delete the auth user account using edge function
      const { error: deleteError } = await supabase.functions.invoke('delete-user', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      
      if (deleteError) {
        throw deleteError;
      }

      toast.success('Account deleted successfully');
      
      // Sign out and redirect to home
      await signOut();
      navigate("/", { replace: true });
      
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <HeaderBanner />
      
      {/* Content with top padding for fixed banner */}
      <div className="safe-area-content">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-center">
            {!cameFromMenu && (
              <Button 
                onClick={() => {
                  if (hasUnsavedChanges) {
                    autoSave();
                  }
                  navigate("/profile");
                }}
                variant="ghost" 
                size="icon"
                className="rounded-full absolute left-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-2xl font-medium">Settings</h1>
          </div>
        </div>

      <div className="p-4 space-y-6">
        {/* Profile Photo */}
        <Card className="restaurant-card">
          <CardContent className="p-4 text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Camera className="h-4 w-4 mr-2" />
                {uploadingAvatar ? "Uploading..." : profile.avatar_url ? "Change Photo" : "Add Photo"}
              </Button>
              {profile.avatar_url && (
                <Button 
                  variant="outline" 
                  className="btn-secondary text-destructive"
                  onClick={handleAvatarRemove}
                >
                  Remove
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card className="restaurant-card">
          <CardContent className="p-4 space-y-4">
            <h2 className="font-medium mb-4">Basic Information</h2>
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.full_name}
                onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                className="rounded-xl"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="username"
                  value={profile.username}
                  className="rounded-xl pl-8 bg-muted cursor-not-allowed"
                  disabled={true}
                  readOnly
                />
              </div>
              <p className="text-xs text-muted-foreground">Username cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 150) {
                    setProfile(prev => ({ ...prev, bio: value }));
                  }
                }}
                className="rounded-xl resize-none"
                rows={3}
                placeholder="Tell others about yourself..."
                disabled={loading}
                maxLength={150}
              />
              <div className="flex justify-end">
                <span className={`text-xs ${profile.bio.length === 150 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {profile.bio.length}/150
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal */}
        <Card className="restaurant-card">
          <CardContent className="p-4">
            <h2 className="font-medium mb-4">Legal</h2>
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-left"
                onClick={() => navigate("/privacy")}
              >
                Privacy Policy
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-left"
                onClick={() => navigate("/terms")}
              >
                Terms of Service
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Setting */}
        <Card className="restaurant-card">
          <CardContent className="p-4">
            <h2 className="font-medium mb-4">Appearance</h2>
            <div className="space-y-3">
              <div 
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  theme === "light" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setTheme("light")}
              >
                <div className="flex items-center">
                  <Sun className="h-5 w-5 mr-3 text-primary" />
                  <div>
                    <h3 className="font-medium text-sm">Standard</h3>
                  </div>
                </div>
                {theme === "light" && (
                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
              </div>

              <div 
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  theme === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setTheme("dark")}
              >
                <div className="flex items-center">
                  <Moon className="h-5 w-5 mr-3 text-primary" />
                  <div>
                    <h3 className="font-medium text-sm">Dark Mode</h3>
                  </div>
                </div>
                {theme === "dark" && (
                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
              </div>

              <div 
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  theme === "system" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setTheme("system")}
              >
                <div className="flex items-center">
                  <SettingsIcon className="h-5 w-5 mr-3 text-primary" />
                  <div>
                    <h3 className="font-medium text-sm">System Preference</h3>
                  </div>
                </div>
                {theme === "system" && (
                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <div className="space-y-3">
          <Button 
            onClick={handleLogout}
            variant="destructive"
            className="w-full flex items-center justify-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full text-destructive border-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete Account
          </Button>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your account? This action cannot be undone. 
              All your data including reviews, lists, and profile information will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Cropper Modal */}
      {selectedImageFileRef.current && showCropper && (
        <ImageCropper
          imageFile={selectedImageFileRef.current}
          isOpen={showCropper}
          onClose={() => {
            setShowCropper(false);
            selectedImageFileRef.current = null;
          }}
          onCrop={handleCroppedImageUpload}
        />
      )}
      </div>
      
      <MobileNavigation />
    </div>
  );
};

export default Settings;