import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/design-tokens.css";
import "./ProfilePage.css";

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ username: "", email: "", currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    setFormData(p => ({ ...p, username: user.username || "", email: user.email || "" }));
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    setError(""); setSuccess("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) { setError("New passwords do not match"); return; }
      if (formData.newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    }
    setIsSaving(true);
    try {
      await updateUser({ username: formData.username, email: formData.email, currentPassword: formData.currentPassword, newPassword: formData.newPassword });
      setSuccess("Profile updated successfully.");
      setIsEditing(false);
      setFormData(p => ({ ...p, currentPassword: "", newPassword: "", confirmPassword: "" }));
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally { setIsSaving(false); }
  };

  const initials = (user?.username || "U").slice(0, 2).toUpperCase();

  return (
    <div className="profile-page vg-page">
      <div className="profile-container">

        {/* Header card */}
        <div className="profile-hero vg-card vg-anim-1">
          <div className="profile-hero-bg" />
          <div className="profile-avatar">{initials}</div>
          <div className="profile-hero-text">
            <h1 className="profile-name">{user?.username || "User"}</h1>
            <p className="profile-email">{user?.email || ""}</p>
          </div>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="vg-btn vg-btn-secondary profile-edit-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit profile
            </button>
          )}
        </div>

        {/* Form */}
        <div className="profile-form-card vg-card vg-anim-2">
          <div className="profile-section-header">
            <h2 className="profile-section-title">Account information</h2>
            {isEditing && <p className="profile-section-sub">Make your changes below, then save.</p>}
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            {success}
          </div>}

          <form onSubmit={handleSave} className="profile-form">
            <div className="profile-fields-row">
              <div className="vg-field">
                <label className="vg-label">Display name</label>
                <input className="vg-input" type="text" name="username" value={formData.username} onChange={handleChange} disabled={!isEditing} placeholder="Your name" />
              </div>
              <div className="vg-field">
                <label className="vg-label">Email address</label>
                <input className="vg-input" type="email" name="email" value={formData.email} onChange={handleChange} disabled={!isEditing} placeholder="you@example.com" />
              </div>
            </div>

            {isEditing && (
              <>
                <div className="profile-divider">
                  <span>Change password <span className="profile-optional">(optional)</span></span>
                </div>
                <div className="profile-fields-row">
                  <div className="vg-field">
                    <label className="vg-label">Current password</label>
                    <input className="vg-input" type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} placeholder="Required to change password" />
                  </div>
                </div>
                <div className="profile-fields-row">
                  <div className="vg-field">
                    <label className="vg-label">New password</label>
                    <input className="vg-input" type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="Min 6 characters" />
                  </div>
                  <div className="vg-field">
                    <label className="vg-label">Confirm new password</label>
                    <input className="vg-input" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter new password" />
                  </div>
                </div>
              </>
            )}

            {isEditing && (
              <div className="profile-form-actions">
                <button type="submit" className="vg-btn vg-btn-primary" disabled={isSaving}>
                  {isSaving ? <><span className="vg-spinner" />Saving…</> : "Save changes"}
                </button>
                <button type="button" className="vg-btn vg-btn-ghost" onClick={() => { setIsEditing(false); setError(""); setSuccess(""); }}>
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Quick links */}
        <div className="profile-links vg-card vg-anim-3">
          <h2 className="profile-section-title" style={{ marginBottom: 16 }}>Quick links</h2>
          <div className="profile-links-row">
            {[
              { label: "Analysis History", desc: "View all your past detections", path: "/history", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
              { label: "Upload Audio", desc: "Analyse a new file", path: "/upload", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg> },
            ].map(l => (
              <button key={l.path} onClick={() => navigate(l.path)} className="profile-link-card">
                <span className="profile-link-icon">{l.icon}</span>
                <span className="profile-link-text">
                  <span className="profile-link-label">{l.label}</span>
                  <span className="profile-link-desc">{l.desc}</span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
