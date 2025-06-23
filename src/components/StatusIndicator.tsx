import React from "react";

interface StatusIndicatorProps {
  label: string;
  connected: boolean;
  icon: string;
  loading?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  label, 
  connected, 
  icon, 
  loading = false 
}) => {
  const statusColor = connected ? "#22c55e" : loading ? "#f59e0b" : "#ef4444";
  const statusIcon = loading ? "⏳" : connected ? "✅" : "❌";
  
  return (
    <div className="status-indicator">
      <span className="status-icon" style={{ color: statusColor }}>
        {statusIcon}
      </span>
      <span className="status-label">{label}</span>
    </div>
  );
}; 
