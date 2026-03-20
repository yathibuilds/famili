export const household = {
  name: "Famli Home",
  members: [
    { name: "You", role: "Admin", location: "Home", status: "Online" },
    { name: "Aarav", role: "Kid", location: "School", status: "Last updated 12m ago" },
    { name: "Meera", role: "Member", location: "Office", status: "Last updated 4m ago" },
    { name: "Uncle Raj", role: "Circle", location: "Not sharing", status: "Off" },
  ],
};

export const summaryCards = [
  { title: "Connected inboxes", value: "0", note: "Gmail, Outlook, IMAP will be added next" },
  { title: "Upcoming bills", value: "2", note: "1 private, 1 household-visible" },
  { title: "Open tasks", value: "7", note: "3 personal, 4 shared" },
  { title: "This week", value: "5", note: "Events, reminders, and birthdays" },
];

export const tasks = [
  {
    title: "Plan weekend dinner",
    category: "Home",
    visibility: "Household",
    due: "Friday",
    assignees: "You, Meera",
    subtasks: 3,
  },
  {
    title: "Review March card bill",
    category: "Finance",
    visibility: "Private",
    due: "Sunday",
    assignees: "You",
    subtasks: 2,
  },
  {
    title: "Buy birthday gift for Nisha",
    category: "Events",
    visibility: "Circle",
    due: "Next Tuesday",
    assignees: "You, Uncle Raj",
    subtasks: 4,
  },
];

export const financeQueue = [
  {
    issuer: "HDFC Bank",
    type: "Credit card bill",
    amount: "INR 18,420",
    due: "8 Apr",
    status: "Waiting for password",
  },
  {
    issuer: "BSES",
    type: "Utility bill",
    amount: "INR 2,145",
    due: "26 Mar",
    status: "Parsed",
  },
  {
    issuer: "Goa Hotel Paradise",
    type: "Trip invoice",
    amount: "INR 24,000",
    due: "Paid",
    status: "Circle split pending",
  },
];

export const calendarItems = [
  { title: "Dentist appointment", date: "21 Mar · 10:30 AM", visibility: "Private" },
  { title: "Family dinner", date: "22 Mar · 8:00 PM", visibility: "Household" },
  { title: "Goa trip planning call", date: "24 Mar · 7:30 PM", visibility: "Circle" },
];
