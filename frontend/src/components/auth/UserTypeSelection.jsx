import React from "react";
import { X } from "lucide-react";
import Logo from "../logo_png.png";
import { redirectToSomethingX } from "../../config/redirectUrls";

const getAuthToken = () =>
  localStorage.getItem("token") || localStorage.getItem("somethingx_auth_token") || "";

const UserTypeSelection = ({ onClose }) => {
  const userTypes = [
    {
      id: "student",
      label: "Student",
      icon: "🎓",
      description: "Access career development tools and resources",
      color: "#3b82f6",
      route: "/login/student",
    },
    {
      id: "institute",
      label: "Institute",
      icon: "🏫",
      description: "Manage training programs and student enrollments",
      color: "#10b981",
      route: "/login/institute",
    },
    {
      id: "industry",
      label: "Industry",
      icon: "🏢",
      description: "Post jobs, access resumes, and conduct interviews",
      color: "#f59e0b",
      route: "/login/industry",
    },
  ];

  const handleClose = () => {
    if (onClose) onClose();
    redirectToSomethingX("/", getAuthToken(), null);
  };

  const handleSelect = (route) => {
    redirectToSomethingX(route, getAuthToken(), null);
    if (onClose) onClose();
  };

  return (
    <>
      <style>{`
        .user-type-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 0;
          animation: fadeIn 0.3s ease;
        }

        .user-type-modal {
          width: 90%;
          max-width: 1200px;
          height: 90vh;
          max-height: 800px;
          background: #ffffff;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          position: relative;
          display: flex;
          animation: slideUp 0.3s ease;
        }

        .user-type-modal-left {
          width: 50%;
          position: relative;
          min-width: 0;
        }

        .user-type-modal-right {
          width: 50%;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 3rem 3rem 3rem;
          overflow-y: auto;
        }

        @media (max-width: 1024px) {
          .user-type-modal {
            width: 95%;
            max-width: 960px;
            height: 90vh;
            overflow-y: auto;
          }

          .user-type-modal-right {
            padding: 3.5rem 2rem 2.5rem 2rem;
          }
        }

        @media (max-width: 768px) {
          .user-type-overlay {
            align-items: flex-start;
            justify-content: center;
            padding: 1.5rem 0.75rem;
            overflow-y: auto;
          }

          .user-type-modal {
            flex-direction: column;
            width: 100%;
            max-width: 480px;
            height: auto;
            max-height: none;
            overflow: visible;
            margin: 0 auto;
          }

          .user-type-modal-left,
          .user-type-modal-right {
            width: 100%;
          }

          .user-type-modal-left {
            min-height: 240px;
          }

          .user-type-modal-right {
            padding: 2.25rem 1.25rem 2rem;
          }
        }

        @media (max-width: 480px) {
          .user-type-overlay {
            padding: 1rem 0.5rem;
          }

          .user-type-modal {
            width: 100%;
            border-radius: 0.75rem;
          }

          .user-type-modal-right {
            padding: 2rem 1rem 1.75rem;
          }
        }
      `}</style>

      <div onClick={handleClose} className="user-type-overlay">
        <div onClick={(e) => e.stopPropagation()} className="user-type-modal">
          <button
            type="button"
            onClick={handleClose}
            style={{
              position: "absolute",
              top: "1.5rem",
              right: "1.5rem",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
              background: "rgba(0, 0, 0, 0.05)",
              color: "#1f2937",
              fontSize: "1.2rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              zIndex: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              e.currentTarget.style.transform = "rotate(90deg)";
              e.currentTarget.style.color = "#dc2626";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
              e.currentTarget.style.transform = "rotate(0deg)";
              e.currentTarget.style.color = "#1f2937";
            }}
          >
            <X size={20} />
          </button>

          <div
            className="user-type-modal-left"
            style={{
              background: "linear-gradient(135deg, #115FD5 0%, #1e3a8a 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
            }}
          >
            <div style={{ textAlign: "center", color: "#ffffff", maxWidth: "320px" }}>
              <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", fontWeight: 700 }}>
                Welcome to SaarthiX
              </h2>
              <p style={{ opacity: 0.92, fontSize: "1rem", lineHeight: 1.5, margin: 0 }}>
                Choose how you want to get started on the main platform.
              </p>
            </div>
          </div>

          <div className="user-type-modal-right">
            <div style={{ width: "100%", maxWidth: "500px" }}>
              <div
                style={{
                  textAlign: "center",
                  marginTop: "1.25rem",
                  marginBottom: "3rem",
                  paddingTop: "0.75rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: "#3b82f6",
                    marginTop: 0,
                    marginBottom: "0.5rem",
                    lineHeight: 1.25,
                    paddingTop: "0.5rem",
                  }}
                >
                  Choose Your Account Type
                </h2>
                <p style={{ fontSize: "1rem", color: "#6b7280", lineHeight: "1.5" }}>
                  Select the type of account you want to create or sign in to
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {userTypes.map((type) => (
                  <div
                    key={type.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelect(type.route)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelect(type.route);
                      }
                    }}
                    style={{
                      background: "#ffffff",
                      border: "2px solid #e5e7eb",
                      borderRadius: "0.75rem",
                      padding: "1.5rem",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: "1.25rem",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.border = `2px solid ${type.color}`;
                      e.currentTarget.style.boxShadow = `0 8px 20px ${type.color}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.border = "2px solid #e5e7eb";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div
                      style={{
                        width: "4rem",
                        height: "4rem",
                        minWidth: "4rem",
                        background: type.color,
                        borderRadius: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2rem",
                        boxShadow: `0 4px 12px ${type.color}30`,
                      }}
                    >
                      {type.icon}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "600",
                          color: "#1f2937",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {type.label}
                      </h3>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          color: "#6b7280",
                          lineHeight: "1.4",
                          margin: 0,
                        }}
                      >
                        {type.description}
                      </p>
                    </div>

                    <div
                      style={{
                        width: "3rem",
                        height: "3rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <img
                        src={Logo}
                        alt="SaarthiX Logo"
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default UserTypeSelection;
