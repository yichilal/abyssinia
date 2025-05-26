// Ethiopian phone number validation
export const validateEthiopianPhone = (phone) => {
  // Ethiopian phone number format: 09XXXXXXXX or +2519XXXXXXXX
  const phoneRegex = /^(?:(?:\+251|0)9\d{8})$/;
  return phoneRegex.test(phone);
};

// Name validation (alphabets only)
export const validateName = (name) => {
  const nameRegex = /^[A-Za-z\s]{2,}$/;
  return nameRegex.test(name);
};

// Password strength requirements
export const passwordRequirements = [
  { re: /[0-9]/, label: "Includes number" },
  { re: /[a-z]/, label: "Includes lowercase letter" },
  { re: /[A-Z]/, label: "Includes uppercase letter" },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: "Includes special symbol" },
  { re: /.{8,}/, label: "At least 8 characters" },
];

// Calculate password strength (0-100)
export const getPasswordStrength = (password) => {
  let multiplier = password.length > 5 ? 0 : 1;
  passwordRequirements.forEach((requirement) => {
    if (!requirement.re.test(password)) multiplier += 1;
  });
  return Math.max(
    100 - (100 / (passwordRequirements.length + 1)) * multiplier,
    0
  );
};

// Get password strength label
export const getPasswordStrengthLabel = (strength) => {
  if (strength >= 80) return { label: "Strong", color: "#22C55E" };
  if (strength >= 60) return { label: "Good", color: "#3B82F6" };
  if (strength >= 40) return { label: "Fair", color: "#F59E0B" };
  return { label: "Weak", color: "#EF4444" };
};

// Format phone number to Ethiopian format
export const formatEthiopianPhone = (phone) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // If it starts with 0, keep it
  if (cleaned.startsWith("0")) {
    return cleaned.slice(0, 10);
  }

  // If it starts with 251, convert to 0
  if (cleaned.startsWith("251")) {
    return "0" + cleaned.slice(3, 13);
  }

  // If it's just 9 digits, add 0
  if (cleaned.length === 9) {
    return "0" + cleaned;
  }

  return cleaned;
};
