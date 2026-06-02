const parseBooleanFlag = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return false;
  }

  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
};

export const isAuthMaintenanceMode = parseBooleanFlag(
  import.meta.env.VITE_AUTH_MAINTENANCE_MODE
);
