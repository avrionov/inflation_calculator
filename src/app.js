// Global data store
import { CPI_DATA } from "./cpi_data.js";
let entries = [];
let entryIdCounter = 0; // Use an ID for reliable deletion

// Set the latest available month as the target for adjustment
const BASE_CPI_DATE = "2025-09";
const MIN_CPI_DATE = "1913-01";

// Assumes CPI_DATA is loaded globally via cpi_data.js
const BASE_CPI_VALUE =
  typeof CPI_DATA !== "undefined" ? CPI_DATA[BASE_CPI_DATE] : null;

// DOM elements
const entryForm = document.getElementById("entryForm");
const amountInput = document.getElementById("amountInput");
const entriesBody = document.getElementById("entriesBody");
const resultsBody = document.getElementById("resultsBody");
const deleteModal = document.getElementById("deleteModal");
const yearSelect = document.getElementById("yearSelect");
const monthSelect = document.getElementById("monthSelect");
const askingPriceInput = document.getElementById("askingPriceInput");
const confirmDeleteButton = document.getElementById("confirmDelete");
const cancelDeleteButton = document.getElementById("cancelDelete");
const deleteAllButton = document.getElementById("deleteAllButton");
const minDate = "1913-01";
const maxDate = "2025-09";
const minYear = parseInt(minDate.substring(0, 4));
const maxYear = parseInt(maxDate.substring(0, 4));
const minMonth = parseInt(minDate.substring(5, 7));
const maxMonth = parseInt(maxDate.substring(5, 7));

const months = [
  { value: "01", name: "January" },
  { value: "02", name: "February" },
  { value: "03", name: "March" },
  { value: "04", name: "April" },
  { value: "05", name: "May" },
  { value: "06", name: "June" },
  { value: "07", name: "July" },
  { value: "08", name: "August" },
  { value: "09", name: "September" },
  { value: "10", name: "October" },
  { value: "11", name: "November" },
  { value: "12", name: "December" },
];

// --- Utility Functions ---

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

/**
 * Helper function to format 'YYYY-MM' string to 'Month YYYY' for display.
 * @param {string} dateString - Date in 'YYYY-MM' format.
 * @returns {string} Formatted date string (e.g., 'Jan 1913').
 */
function displayMonthYear(dateString) {
  if (!dateString) return "";

  // Create a Date object from YYYY-MM (defaults to the 1st day of the month)
  const [year, month] = dateString.split("-");
  // Month is 0-indexed in JS Date, so use month - 1
  const date = new Date(year, month - 1);
  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
  });
  return formatter.format(date);
}

/**
 * Gets the YYYY-MM string directly from the month input (identity function).
 * @param {string} dateString - The date string from the input.
 * @returns {string} The input date string.
 */
function formatInputDate(dateString) {
  return dateString;
}

/**
 * Function to calculate the inflation adjusted amount.
 * @param {string} dateStr - Date in 'YYYY-MM' format.
 * @param {number} originalAmount - The dollar amount at the time.
 * @returns {number} The inflation-adjusted amount.
 */
function calculateAdjustedAmount(dateStr, originalAmount) {
  if (!BASE_CPI_VALUE) {
    console.error("BASE_CPI_VALUE is missing. Check CPI_DATA loading.");
    return originalAmount;
  }

  const pastCpi = CPI_DATA[dateStr];

  if (!pastCpi) {
    console.warn(`CPI data missing for ${dateStr}. Cannot adjust.`);
    // If CPI is missing, return the original amount
    return originalAmount;
  }

  // Inflation Adjustment Formula: Amount_Past * (CPI_Target / CPI_Past)
  const adjustedAmount = originalAmount * (BASE_CPI_VALUE / pastCpi);
  return adjustedAmount;
}

// --- Core Application Logic ---

/**
 * Adds a new entry to the sales history and updates the UI.
 * @param {string} dateStr - Date in 'YYYY-MM' format.
 * @param {string} amount - Original dollar amount as a string.
 */
function addEntry(dateStr, amount, askingPrice) {
  const originalAmount = parseFloat(amount);

  // Check if CPI data exists for the selected date
  if (!CPI_DATA[dateStr]) {
    alert(
      "Error: CPI data is not available for the selected month/year. Please choose a date within the 1913-01 to 2025-09 range where data is provided."
    );
    return;
  }

  const adjustedPrice = calculateAdjustedAmount(dateStr, originalAmount);

  // Create a new entry object
  const newEntry = {
    id: ++entryIdCounter,
    date: formatInputDate(dateStr),
    amount: originalAmount,
    adjustedAmount: adjustedPrice,
    askingPrice: askingPrice,
    overunder: 1 - askingPrice / adjustedPrice,
  };
  entries.push(newEntry);

  // Sort entries by date (newest first based on YYYY-MM string)
  entries.sort((a, b) => b.date.localeCompare(a.date));

  updateAllTables();
}

/**
 * Removes an entry by ID and updates the UI.
 * @param {number} idToDelete - ID of the entry to delete.
 */
export function deleteEntry(idToDelete) {
  entries = entries.filter((entry) => entry.id !== idToDelete);
  updateAllTables();
}

/**
 * Calculates summary metrics based on the sales entries.
 */
function calculateResults() {
  if (entries.length === 0) {
    return {
      totalAmount: 0,
      totalAdjustedAmount: 0,
      entryCount: 0,
      avgAdjustedAmount: 0,
    };
  }

  const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalAdjustedAmount = entries.reduce(
    (sum, entry) => sum + entry.adjustedAmount,
    0
  );
  const entryCount = entries.length;

  // Average calculated based on the inflation-adjusted amount
  const avgAdjustedAmount = totalAdjustedAmount / entryCount;

  return {
    totalAmount,
    totalAdjustedAmount,
    entryCount,
    avgAdjustedAmount,
  };
}

/**
 * Renders the Sales History table rows.
 */
function renderEntriesTable() {
  entriesBody.innerHTML = ""; // Clear previous rows

  if (entries.length === 0) {
    entriesBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 py-4 text-center text-gray-400 italic">No entries yet.</td>
            </tr>
        `;
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50 transition duration-100";

    // Note: showDeleteModal is called globally via onclick for simplicity with dynamic HTML generation
    row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                ${displayMonthYear(entry.date)} 
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right font-semibold">
                ${currencyFormatter.format(entry.amount)}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-indigo-700 text-right font-bold">
                ${currencyFormatter.format(entry.adjustedAmount)}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-indigo-700 text-right font-bold">
                ${currencyFormatter.format(entry.askingPrice)}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-indigo-700 text-right font-bold">
                ${percentFormatter.format(entry.overunder)}
            </td>
        
            <td class="px-4 py-3 whitespace-nowrap text-sm text-right">
                <button data-entry-id="${entry.id}"
                    class="delete-entry-btn text-red-600 hover:text-red-900 font-medium transition duration-150">
                  Delete
                </button>
            </td>
        `;
    entriesBody.appendChild(row);
  });
}

/**
 * Renders the Calculated Metrics results table.
 */
function renderResultsTable() {
  const results = calculateResults();
  resultsBody.innerHTML = ""; // Clear previous rows

  const metrics = [
    {
      name: "Total Sales Entries",
      value: results.entryCount,
      format: (v) => v,
    },
    {
      name: "Average Adjusted Price",
      value: results.avgAdjustedAmount,
      format: currencyFormatter.format,
    },
  ];

  metrics.forEach((metric) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-indigo-50 transition duration-100";

    const formattedValue = metric.format(metric.value);

    row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-indigo-900">${metric.name}</td>
            <td class="px-4 py-3 text-sm font-bold text-indigo-600 text-right">${formattedValue}</td>
        `;
    resultsBody.appendChild(row);
  });
}

/**
 * Updates both the entries and results tables.
 */
function updateAllTables() {
  renderEntriesTable();
  //renderResultsTable();
}

// 1. Populate Years
function populateYears() {
  yearSelect.innerHTML = "";

  for (let year = minYear; year <= maxYear; year++) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }
}

// 2. Populate and Constrain Months
function updateMonths() {
  // Clear previous months, keeping the 'Select Month' placeholder
  //monthSelect.querySelectorAll('option:not(:disabled)').forEach(opt => opt.remove());
  monthSelect.innerHTML = ""; // Clear ALL month options

  const selectedYear = parseInt(yearSelect.value);
  if (isNaN(selectedYear)) return; // Exit if no year is selected

  let startMonth = 1;
  let endMonth = 12;

  // Apply lower boundary constraint (minDate)
  if (selectedYear === minYear) {
    startMonth = minMonth;
  }

  // Apply upper boundary constraint (maxDate)
  if (selectedYear === maxYear) {
    endMonth = maxMonth;
  }

  // Populate the months based on the calculated range
  months.forEach((month) => {
    const monthValue = parseInt(month.value);
    if (monthValue >= startMonth && monthValue <= endMonth) {
      const option = document.createElement("option");
      option.value = month.value;
      option.textContent = month.name;
      monthSelect.appendChild(option);
    }
  });
}

function setDefaults() {
  // Set the year to the maximum allowed year
  yearSelect.value = maxYear.toString();

  // Update the months based on the default year (maxYear = 2025)
  updateMonths();

  // Set the month to the maximum allowed month for that year
  // We use String(maxMonth).padStart(2, '0') to ensure '09' format
  monthSelect.value = String(maxMonth).padStart(2, "0");
}

function clearAllEntries() {
  entries = [];
  entryIdCounter = 0;
  updateAllTables();
}

function showConfirmationDialog() {
  // **Customize Modal Content (Optional but recommended)**
  const modalTitle = deleteModal.querySelector("h4");
  const modalMessage = deleteModal.querySelector("p");

  if (modalTitle) modalTitle.textContent = "Confirm Deletion of All Entries";
  if (modalMessage)
    modalMessage.textContent =
      "Are you sure you want to delete ALL entries in the sales history? This action cannot be undone.";

  // Show the modal
  deleteModal.classList.remove("hidden");

  // Set the confirm button action to executeClearAll()
  // We temporarily remove old listeners to prevent conflicting actions
  const newConfirmHandler = () => {
    clearAllEntries();
    // Remove this specific listener after execution to prevent accumulation
    confirmDeleteButton.removeEventListener("click", newConfirmHandler);
  };

  // Re-attach the listener for the 'Delete All' action
  confirmDeleteButton.addEventListener("click", newConfirmHandler);
}

// --- Event Handlers and Initialization ---

entryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const selectedYear = yearSelect.value; // e.g., '2025'
  const selectedMonth = monthSelect.value;
  const date = `${selectedYear}-${selectedMonth}`;

  const amount = amountInput.value;
  const askingPrice = askingPriceInput.value;

  if (date && amount && parseFloat(amount) > 0) {
    addEntry(date, amount, askingPrice);
    // Clear amount input after submission
    amountInput.value = "";
    amountInput.focus();
  } else {
    console.error(
      "Please enter a valid month/year and a positive dollar amount."
    );
  }
});

// --- Modal Control for Deletion ---
let pendingDeleteId = null;

// Expose to global scope for use with onclick in the dynamically generated HTML
window.showDeleteModal = (id) => {
  pendingDeleteId = id;
  deleteModal.classList.remove("hidden");
};

confirmDeleteButton.addEventListener("click", () => {
  if (pendingDeleteId !== null) {
    deleteEntry(pendingDeleteId);
  }
  deleteModal.classList.add("hidden");
  pendingDeleteId = null;
});

cancelDeleteButton.addEventListener("click", () => {
  deleteModal.classList.add("hidden");
  pendingDeleteId = null;
});

// Initialization logic when the script loads
document.addEventListener("DOMContentLoaded", () => {
  // Attach Event Listeners
  yearSelect.addEventListener("change", updateMonths);

  //deleteAllButton.addEventListener("click", clearAllEntries);
  if (deleteAllButton) {
    deleteAllButton.addEventListener("click", showConfirmationDialog);
  }

  // 2. Cancel Button Click (always closes the modal)
  if (cancelDeleteButton) {
    cancelDeleteButton.addEventListener("click", () => {
      deleteModal.classList.add("hidden");
    });
  }

  const entriesBody = document.getElementById('entriesBody');

    // 🌟 NEW CODE: Use event delegation on the table body 🌟
    entriesBody.addEventListener('click', (event) => {
        // Check if the clicked element (or its parent) is the delete button
        const button = event.target.closest('.delete-entry-btn');
        
        if (button) {
            // Get the ID from the data attribute
            const entryId = button.dataset.entryId; 
            
            // Call the function defined within this module scope
            if (entryId) {
                deleteEntry(Number(entryId)); 
            }
        }
    });
    
  // Initial setup
  populateYears();
  setDefaults();

  updateAllTables();
});
