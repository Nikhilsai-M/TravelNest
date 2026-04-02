export function parseInterestString(value) {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function formatMinutes(value) {
  const total = Number(value || 0);

  if (total < 60) {
    return `${total} min`;
  }

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (!minutes) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

export function formatCoordinates(location) {
  if (!location) {
    return "Location unavailable";
  }

  return `${Number(location.lat).toFixed(4)}, ${Number(location.lng).toFixed(4)}`;
}

export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

export function formatTransportMode(value) {
  const labels = {
    auto: "Auto",
    walking: "Walking",
    cycling: "Cycling",
    driving: "Driving",
  };

  return labels[value] || "Auto";
}

export function formatExpenseMode(value) {
  const labels = {
    budget: "Budget",
    balanced: "Balanced",
    premium: "Premium",
  };

  return labels[value] || "Balanced";
}
