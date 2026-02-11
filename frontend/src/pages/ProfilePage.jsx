import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import {
  StatCard,
  ProfileField,
  ToggleSwitch,
  SelectField,
  AlertBanner,
} from "../components/ui/FormControls";

// ── Constants ────────────────────────────────
const TABS = [
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "security", label: "Security", icon: "🔒" },
  { id: "preferences", label: "Preferences", icon: "⚙️" },
  { id: "stats", label: "Statistics", icon: "📊" },
];

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const ANALYSIS_MODE_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "advanced", label: "Advanced (Wav2Vec2)" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
];

const INITIAL_PROFILE = {
  username: "",
  email: "",
  firstName: "",
  lastName: "",
  bio: "",
  avatar: null,
  phoneNumber: "",
  location: "",
  website: "",
  joinDate: "",
};

const INITIAL_PASSWORD = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const INITIAL_PREFERENCES = {
  emailNotifications: true,
  analysisAlerts: true,
  marketingEmails: false,
  theme: "light",
  defaultAnalysisMode: "standard",
  language: "en",
  timezone: "UTC",
};

// ── Warning icon SVG ─────────────────────────
const WarningIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const InfoIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
      clipRule="evenodd"
    />
  </svg>
);

// ── Async helper — wraps "simulated" save calls ──
async function simulateSave() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

// ── Component ────────────────────────────────
const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(INITIAL_PROFILE);
  const [passwordData, setPasswordData] = useState(INITIAL_PASSWORD);
  const [preferences, setPreferences] = useState(INITIAL_PREFERENCES);
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    accurateDetections: 0,
    joinDate: "",
    lastActivity: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Helpers ──────────────────────────────
  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleFieldChange = (setter) => (e) => {
    const { name, value, type, checked } = e.target;
    setter((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ── Data fetching ────────────────────────
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    setProfileData((prev) => ({
      ...prev,
      username: user.username || "",
      email: user.email || "",
      joinDate: new Date().toLocaleDateString(),
    }));
    fetchUserStats();
  }, [user, navigate]);

  const fetchUserStats = async () => {
    try {
      if (!user?.token) return;
      const response = await api.getUserAnalyses(user.token);
      const analyses = response.analyses || [];
      setStats({
        totalAnalyses: analyses.length,
        accurateDetections: analyses.filter((a) => a.confidence_score > 0.8).length,
        joinDate: new Date().toLocaleDateString(),
        lastActivity:
          analyses.length > 0
            ? new Date(analyses[0].analysis_timestamp).toLocaleDateString()
            : "No activity",
      });
    } catch (err) {
      console.error("Error fetching user stats:", err);
    }
  };

  // ── Save handlers ────────────────────────
  const handleSaveProfile = async () => {
    setLoading(true);
    clearMessages();
    try {
      await simulateSave();
      localStorage.setItem("username", profileData.username);
      localStorage.setItem("email", profileData.email);
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    setLoading(true);
    clearMessages();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      await simulateSave();
      setSuccess("Password updated successfully!");
      setPasswordData(INITIAL_PASSWORD);
    } catch (err) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    clearMessages();
    try {
      await simulateSave();
      setSuccess("Preferences updated successfully!");
    } catch (err) {
      setError(err.message || "Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    setLoading(true);
    try {
      await simulateSave();
      logout();
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to delete account");
      setLoading(false);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setProfileData((prev) => ({ ...prev, avatar: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // ── Derived values ───────────────────────
  const accuracyPct =
    stats.totalAnalyses > 0
      ? Math.round((stats.accurateDetections / stats.totalAnalyses) * 100)
      : 0;

  // ── Render ───────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* ── Header ───────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                  {profileData.avatar ? (
                    <img src={profileData.avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    profileData.username.charAt(0).toUpperCase()
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-purple-600 text-white rounded-full p-1 cursor-pointer hover:bg-purple-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profileData.username}</h1>
                <p className="text-gray-600">{profileData.email}</p>
                <p className="text-sm text-gray-500">Member since {profileData.joinDate}</p>
              </div>
            </div>
            <button onClick={logout} className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors">
              Sign Out
            </button>
          </div>
        </div>

        {/* ── Tab bar + content ─────────────── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">{error}</div>}
            {success && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md border border-green-200">{success}</div>}

            {/* ── Profile Tab ─────────────── */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                  >
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ProfileField label="Username" name="username" value={profileData.username} onChange={handleFieldChange(setProfileData)} disabled={!isEditing} />
                  <ProfileField label="Email" type="email" name="email" value={profileData.email} onChange={handleFieldChange(setProfileData)} disabled={!isEditing} />
                  <ProfileField label="First Name" name="firstName" value={profileData.firstName} onChange={handleFieldChange(setProfileData)} disabled={!isEditing} />
                  <ProfileField label="Last Name" name="lastName" value={profileData.lastName} onChange={handleFieldChange(setProfileData)} disabled={!isEditing} />
                  <ProfileField label="Phone Number" type="tel" name="phoneNumber" value={profileData.phoneNumber} onChange={handleFieldChange(setProfileData)} disabled={!isEditing} />
                  <ProfileField label="Location" name="location" value={profileData.location} onChange={handleFieldChange(setProfileData)} disabled={!isEditing} />
                  <ProfileField label="Website" type="url" name="website" value={profileData.website} onChange={handleFieldChange(setProfileData)} disabled={!isEditing} colSpan />

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      name="bio"
                      value={profileData.bio}
                      onChange={handleFieldChange(setProfileData)}
                      disabled={!isEditing}
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${!isEditing ? "bg-gray-50 border-gray-200" : "border-gray-300"
                        }`}
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-3">
                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSaveProfile} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50">
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Security Tab ────────────── */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>

                <AlertBanner variant="yellow" icon={<WarningIcon />} title="Password Security">
                  Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.
                </AlertBanner>

                <div className="grid grid-cols-1 gap-6">
                  <ProfileField label="Current Password" type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handleFieldChange(setPasswordData)} placeholder="Enter current password" />
                  <ProfileField label="New Password" type="password" name="newPassword" value={passwordData.newPassword} onChange={handleFieldChange(setPasswordData)} placeholder="Enter new password" />
                  <ProfileField label="Confirm New Password" type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handleFieldChange(setPasswordData)} placeholder="Confirm new password" />
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSavePassword} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50">
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
                  <AlertBanner variant="red" icon={<WarningIcon />} title="Delete Account">
                    <p>Once you delete your account, there is no going back. Please be certain.</p>
                    <div className="mt-3">
                      <button onClick={handleDeleteAccount} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50">
                        {loading ? "Deleting..." : "Delete Account"}
                      </button>
                    </div>
                  </AlertBanner>
                </div>
              </div>
            )}

            {/* ── Preferences Tab ────────── */}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4">Notifications</h3>
                    <div className="space-y-3">
                      <ToggleSwitch name="emailNotifications" label="Email Notifications" description="Receive email notifications for important updates" checked={preferences.emailNotifications} onChange={handleFieldChange(setPreferences)} />
                      <ToggleSwitch name="analysisAlerts" label="Analysis Alerts" description="Get notified when your analysis is complete" checked={preferences.analysisAlerts} onChange={handleFieldChange(setPreferences)} />
                      <ToggleSwitch name="marketingEmails" label="Marketing Emails" description="Receive updates about new features and improvements" checked={preferences.marketingEmails} onChange={handleFieldChange(setPreferences)} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-4">Application Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SelectField label="Theme" name="theme" value={preferences.theme} onChange={handleFieldChange(setPreferences)} options={THEME_OPTIONS} />
                      <SelectField label="Default Analysis Mode" name="defaultAnalysisMode" value={preferences.defaultAnalysisMode} onChange={handleFieldChange(setPreferences)} options={ANALYSIS_MODE_OPTIONS} />
                      <SelectField label="Language" name="language" value={preferences.language} onChange={handleFieldChange(setPreferences)} options={LANGUAGE_OPTIONS} />
                      <SelectField label="Timezone" name="timezone" value={preferences.timezone} onChange={handleFieldChange(setPreferences)} options={TIMEZONE_OPTIONS} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSavePreferences} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50">
                    {loading ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Statistics Tab ──────────── */}
            {activeTab === "stats" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Account Statistics</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Total Analyses" value={stats.totalAnalyses} icon="📊" />
                  <StatCard title="High Confidence" value={stats.accurateDetections} icon="🎯" />
                  <StatCard title="Member Since" value={stats.joinDate} icon="📅" />
                  <StatCard title="Last Activity" value={stats.lastActivity} icon="🕐" />
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Overview</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Analysis Accuracy</span>
                      <span className="text-sm font-medium text-gray-900">{accuracyPct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${accuracyPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <AlertBanner variant="blue" icon={<InfoIcon />} title="Pro Tip">
                  Higher confidence scores indicate more reliable results. Consider running multiple analyses for critical decisions.
                </AlertBanner>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
