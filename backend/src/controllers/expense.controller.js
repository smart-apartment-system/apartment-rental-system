import { Expense } from "../models/expense.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const EXPENSE_PAGE_SIZE = 20;


// ─── Helper ───────────────────────────────────────────────────────────────────

function parsePagination(query) {
  const page  = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(parseInt(query.limit) || EXPENSE_PAGE_SIZE, 100);
  const skip  = (page - 1) * limit;

  return { page, limit, skip };
}

function buildFilter(query, extra = {}) {
  const filter = { ...extra };

  // ?category=maintenance|electricity|water
  if (query.category) {
    filter.category = query.category;
  }

  // ?month=2026-04
  if (query.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month)) {
    filter.month = query.month;
  }

  return filter;
}


// ─── 1. Create Expense ────────────────────────────────────────────────────────
export const createExpense = asyncHandler(async (req, res) => {
  const {
    apartmentId,
    title,
    amount,
    category,
    month,
    date,
    note,
  } = req.body;

  if (!apartmentId || !title || !amount || !category || !date) {
    throw new ApiError(400, "Required fields missing");
  }

  const expense = await Expense.create({
    apartmentId,
    title,
    amount,
    category,
    month,
    date,
    note,
    createdBy: req.user._id,
  });

  return res.status(201).json(
    new ApiResponse(201, expense, "Expense created")
  );
});


// ─── 2. Get Expenses by Apartment ─────────────────────────────────────────────
export const getExpensesByApartment = asyncHandler(async (req, res) => {
  const { apartmentId } = req.params;

  const { page, limit, skip } = parsePagination(req.query);
  const filter = buildFilter(req.query, { apartmentId });

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),

    Expense.countDocuments(filter),
  ]);

  return res.json(
    new ApiResponse(200, {
      expenses,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    }, "Expenses fetched")
  );
});


// ─── 3. Get Expense by ID ─────────────────────────────────────────────────────
export const getExpenseById = asyncHandler(async (req, res) => {
  const { expenseId } = req.params;

  const expense = await Expense.findById(expenseId);

  if (!expense) {
    throw new ApiError(404, "Expense not found");
  }

  return res.json(
    new ApiResponse(200, expense, "Expense fetched")
  );
});


// ─── 4. Update Expense ────────────────────────────────────────────────────────
export const updateExpense = asyncHandler(async (req, res) => {
  const { expenseId } = req.params;

  const expense = await Expense.findById(expenseId);
  if (!expense) throw new ApiError(404, "Expense not found");

  const fieldsToUpdate = {
    ...(req.body.title    && { title: req.body.title }),
    ...(req.body.amount   && { amount: req.body.amount }),
    ...(req.body.category && { category: req.body.category }),
    ...(req.body.date     && { date: req.body.date }),
    ...(req.body.note     && { note: req.body.note }),
  };

  const updated = await Expense.findByIdAndUpdate(
    expenseId,
    fieldsToUpdate,
    { new: true, runValidators: true }
  );

  return res.json(
    new ApiResponse(200, updated, "Expense updated")
  );
});


// ─── 5. Delete Expense ────────────────────────────────────────────────────────
export const deleteExpense = asyncHandler(async (req, res) => {
  const { expenseId } = req.params;

  const expense = await Expense.findById(expenseId);
  if (!expense) throw new ApiError(404, "Expense not found");

  await expense.deleteOne();

  return res.json(
    new ApiResponse(200, null, "Expense deleted")
  );
});


// ─── 6. Monthly Expense Report ────────────────────────────────────────────────
export const getMonthlyExpenseReport = asyncHandler(async (req, res) => {
  const { apartmentId } = req.params;
  const month = req.query.month;

  if (!month) {
    throw new ApiError(400, "Month is required (YYYY-MM)");
  }

  const report = await Expense.aggregate([
    { $match: { apartmentId, month } },
    {
      $group: {
        _id: "$category",
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  return res.json(
    new ApiResponse(200, report, "Monthly expense report")
  );
});


// ─── 7. Expense Stats ─────────────────────────────────────────────────────────
export const getExpenseStats = asyncHandler(async (req, res) => {
  const { apartmentId } = req.params;

  const stats = await Expense.aggregate([
    { $match: { apartmentId } },
    {
      $group: {
        _id: null,
        totalExpense: { $sum: "$amount" },
        avgExpense:   { $avg: "$amount" },
        count:        { $sum: 1 },
      },
    },
  ]);

  return res.json(
    new ApiResponse(200, stats[0] || {}, "Expense stats")
  );
});