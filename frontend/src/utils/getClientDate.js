// The daily spending lock resets at midnight in the USER's timezone, not
// the server's. The browser already knows the user's local time, so we
// compute "today" here and send it with every expense create/update and
// every override request, instead of trying to store/guess timezones
// server-side.
export function getClientDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
