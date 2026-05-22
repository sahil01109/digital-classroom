import { toast } from "react-hot-toast";

export function showSuccess(message) {
  toast.success(message, {
    duration: 4000,
    position: "top-right",
    style: {
      borderRadius: "12px",
      background: "#0f172a",
      color: "#f8fafc",
    },
  });
}

export function showError(message) {
  toast.error(message, {
    duration: 5000,
    position: "top-right",
    style: {
      borderRadius: "12px",
      background: "#0f172a",
      color: "#f8fafc",
    },
  });
}

export function showInfo(message) {
  toast(message, {
    icon: "ℹ️",
    duration: 4000,
    position: "top-right",
    style: {
      borderRadius: "12px",
      background: "#0f172a",
      color: "#f8fafc",
    },
  });
}
